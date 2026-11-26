import "dotenv/config";
import express from "express";
import fs from "fs";
import mammoth from "mammoth";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === "production";

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    throw new Error(
      "Chave GEMINI_API_KEY não configurada no servidor. Configure a chave no painel Settings > Secrets para habilitar a organização automática por IA."
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function extractErrorMessage(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes("GEMINI_API_KEY")) {
    return { status: 400, message: raw };
  }
  if (raw.includes("PERMISSION_DENIED") || raw.includes("API_KEY_INVALID")) {
    return {
      status: 403,
      message:
        "Chave da API Gemini inválida ou sem permissão. Verifique a configuração em Settings > Secrets.",
    };
  }
  if (raw.includes("RESOURCE_EXHAUSTED")) {
    return {
      status: 429,
      message:
        "Limite de requisições da API Gemini atingido temporariamente. Tente novamente em instantes.",
    };
  }
  return {
    status: 500,
    message: `Erro ao processar solicitação com Gemini: ${raw}`,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "25mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.post("/api/ai/organize-edital", async (req, res) => {
    try {
      const { editalText, examName, disciplineHint, fileData } = req.body as {
        editalText?: string;
        examName?: string;
        disciplineHint?: string;
        fileData?: {
          base64: string;
          mimeType: string;
          fileName: string;
        };
      };

      const trimmedText = editalText?.trim() ?? "";
      const hasFile = Boolean(fileData?.base64 && fileData?.fileName);

      if (!hasFile && trimmedText.length < 20) {
        res.status(400).json({
          error:
            "Cole o texto do conteúdo programático (mínimo 20 caracteres) ou anexe um arquivo .pdf, .txt ou .docx.",
        });
        return;
      }

      const contentParts: Array<
        | { text: string }
        | { inlineData: { mimeType: string; data: string } }
      > = [];

      let extractedFileText = "";

      if (hasFile && fileData) {
        const lowerName = fileData.fileName.toLowerCase();
        const cleanBase64 = fileData.base64.includes(",")
          ? fileData.base64.split(",")[1]
          : fileData.base64;

        if (
          lowerName.endsWith(".pdf") ||
          fileData.mimeType === "application/pdf"
        ) {
          contentParts.push({
            inlineData: {
              mimeType: "application/pdf",
              data: cleanBase64,
            },
          });
        } else if (
          lowerName.endsWith(".txt") ||
          fileData.mimeType.startsWith("text/")
        ) {
          extractedFileText = Buffer.from(cleanBase64, "base64").toString("utf-8").trim();
          if (extractedFileText.length < 20) {
            res.status(400).json({
              error: "O arquivo .txt anexado está vazio ou tem pouco conteúdo.",
            });
            return;
          }
        } else if (
          lowerName.endsWith(".docx") ||
          fileData.mimeType ===
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ) {
          const buffer = Buffer.from(cleanBase64, "base64");
          const result = await mammoth.extractRawText({ buffer });
          extractedFileText = result.value.trim();
          if (extractedFileText.length < 20) {
            res.status(400).json({
              error:
                "Não foi possível extrair texto suficiente do arquivo .docx anexado.",
            });
            return;
          }
        } else {
          res.status(400).json({
            error: "Formato não suportado. Envie arquivos .pdf, .txt ou .docx.",
          });
          return;
        }
      }

      const combinedText = [trimmedText, extractedFileText]
        .filter((s) => s.length > 0)
        .join("\n\n");

      contentParts.push({
        text: `Organize o conteúdo programático do edital ${
          hasFile && fileData ? `(arquivo anexado: ${fileData.fileName})` : ""
        } em itens acionáveis para um plano de estudos Kanban.\n\nPlano/Edital alvo: ${
          examName || "Plano de Estudos"
        }\nDisciplina sugerida: ${
          disciplineHint || "Identificar automaticamente conforme os tópicos"
        }${combinedText ? `\n\nTexto do Edital:\n${combinedText}` : "\n\nLeia integralmente o documento PDF anexado e extraia os tópicos do conteúdo programático."}`,
      });

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: { parts: contentParts },
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction:
            "Você é um coordenador pedagógico especialista em estruturação de editais de provas, concursos e exames institucionais. Extraia de 3 a 10 tópicos claros e não redundantes do edital fornecido. Para cada tópico, identifique a disciplina/matéria, as referências normativas ou bibliográficas centrais, a incidência estimada em provas ('Alta', 'Média' ou 'Base'), o tempo estimado de estudo em minutos (entre 30 e 120), um resumo inicial objetivo em português claro, 2 a 3 pegadinhas comuns de banca e 3 a 4 passos de estudo (checklist).",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    discipline: {
                      type: Type.STRING,
                      description: "Nome da matéria ou disciplina do edital.",
                    },
                    topic: {
                      type: Type.STRING,
                      description: "Título objetivo do tópico do edital para o cartão Kanban.",
                    },
                    normativeRefs: {
                      type: Type.STRING,
                      description: "Artigos de lei, súmulas, normas ou capítulos bibliográficos aplicáveis.",
                    },
                    incidence: {
                      type: Type.STRING,
                      description: "Incidência estimada em provas: Alta, Média ou Base.",
                    },
                    estimatedMinutes: {
                      type: Type.INTEGER,
                      description: "Tempo estimado em minutos para estudo e revisão inicial.",
                    },
                    initialSummary: {
                      type: Type.STRING,
                      description: "Resumo inicial direto ao ponto em 2 a 4 parágrafos curtos.",
                    },
                    keyTraps: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "Pegadinhas ou distinções clássicas cobradas em prova.",
                    },
                    checklist: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "Lista de 3 a 4 etapas concretas de estudo.",
                    },
                  },
                  required: [
                    "discipline",
                    "topic",
                    "normativeRefs",
                    "incidence",
                    "estimatedMinutes",
                    "initialSummary",
                    "keyTraps",
                    "checklist",
                  ],
                },
              },
            },
            required: ["items"],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{"items":[]}').trim()) as {
        items?: unknown[];
      };
      res.json({ items: parsed.items ?? [] });
    } catch (err) {
      const { status, message } = extractErrorMessage(err);
      res.status(status).json({ error: message });
    }
  });

  app.post("/api/ai/generate-revision", async (req, res) => {
    try {
      const { sourceTitle, sourceType, sourceText, discipline, topic } = req.body as {
        sourceTitle?: string;
        sourceType?: string;
        sourceText?: string;
        discipline?: string;
        topic?: string;
      };

      if (!sourceText || sourceText.trim().length < 25) {
        res.status(400).json({
          error: "Informe o texto da fonte de estudo com pelo menos 25 caracteres.",
        });
        return;
      }

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: `Transforme a fonte de estudo abaixo em um pacote completo de resumo e revisão ativa.\n\nDisciplina: ${discipline || "Conteúdo Programático"}\nTópico do Edital: ${topic || sourceTitle || "Tema do Edital"}\nTipo de Fonte: ${sourceType || "Fonte Oficial"}\nTítulo da Fonte: ${sourceTitle || "Fonte enviada"}\n\nConteúdo da Fonte:\n${sourceText}`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
          systemInstruction:
            "Você é coordenador pedagógico especialista em preparação para exames e concursos. Produza material de alta precisão técnica em português brasileiro: (1) resumo executivo estruturado com tese central, requisitos e exceções; (2) referências exatas citadas na fonte; (3) 3 pontos de atenção/pegadinhas típicas de banca; (4) 3 flashcards curtos e incisivos de memorização ativa; (5) 2 questões inéditas contextualizadas com 4 alternativas (A, B, C, D), índice correto (0 a 3) e comentário fundamentado.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              suggestedTopic: {
                type: Type.STRING,
                description: "Título refinado para o cartão do edital.",
              },
              executiveSummary: {
                type: Type.STRING,
                description: "Resumo estruturado para revisão rápida em até 220 palavras.",
              },
              legalBasis: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Artigos, normas, súmulas ou capítulos citados.",
              },
              examTraps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "3 pontos críticos ou exceções que costumam reprovar candidatos.",
              },
              flashcards: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    front: { type: Type.STRING },
                    back: { type: Type.STRING },
                    articleRef: { type: Type.STRING },
                  },
                  required: ["front", "back", "articleRef"],
                },
              },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    stem: {
                      type: Type.STRING,
                      description: "Enunciado contextualizado de prova.",
                    },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "Exatamente 4 alternativas objetivas.",
                    },
                    correctIndex: {
                      type: Type.INTEGER,
                      description: "Índice de 0 a 3 da alternativa correta.",
                    },
                    explanation: {
                      type: Type.STRING,
                      description: "Justificativa fundamentada na fonte.",
                    },
                    articleRef: {
                      type: Type.STRING,
                    },
                  },
                  required: ["stem", "options", "correctIndex", "explanation", "articleRef"],
                },
              },
            },
            required: [
              "suggestedTopic",
              "executiveSummary",
              "legalBasis",
              "examTraps",
              "flashcards",
              "questions",
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? "{}").trim());
      res.json(parsed);
    } catch (err) {
      const { status, message } = extractErrorMessage(err);
      res.status(status).json({ error: message });
    }
  });

  if (!isProduction) {
    const { createServer } = await import("vite");
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, "dist");
    app.use(express.static(distDir));
    app.get("/{*path}", (_req, res) => {
      const indexPath = path.join(distDir, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send("Build de produção não encontrado.");
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Toth server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
