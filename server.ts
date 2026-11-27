import { randomUUID } from "crypto";
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

type ContentPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

interface CachedEditalPayload {
  baseParts: ContentPart[];
  combinedText: string;
  fileName?: string;
  expiresAt: number;
}

const editalCache = new Map<string, CachedEditalPayload>();

function pruneEditalCache() {
  const now = Date.now();
  for (const [key, entry] of editalCache.entries()) {
    if (entry.expiresAt <= now) {
      editalCache.delete(key);
    }
  }
}

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

async function generateWithRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const raw = err instanceof Error ? err.message : String(err);
      const isTransient =
        raw.includes("RESOURCE_EXHAUSTED") ||
        raw.includes("429") ||
        raw.includes("503") ||
        raw.includes("500") ||
        raw.includes("UNAVAILABLE") ||
        raw.includes("DEADLINE_EXCEEDED");
      if (!isTransient || attempt === maxAttempts) {
        throw err;
      }
      const delayMs = 800 * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

function stripJsonFences(raw: string): string {
  return raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function parseItemsJsonWithRecovery(raw: string): unknown[] {
  const cleaned = stripJsonFences(raw || '{"items":[]}');
  try {
    const parsed = JSON.parse(cleaned) as { items?: unknown[] };
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    // Attempt partial recovery if a massive response ended mid-object
    const itemsKeyIdx = cleaned.indexOf('"items"');
    const arrayStart = cleaned.indexOf("[", itemsKeyIdx === -1 ? 0 : itemsKeyIdx);
    if (arrayStart === -1) {
      throw new Error("A IA retornou um formato inválido para os subtópicos.");
    }
    const recovered: unknown[] = [];
    let depth = 0;
    let inString = false;
    let escaped = false;
    let objStart = -1;

    for (let i = arrayStart + 1; i < cleaned.length; i += 1) {
      const ch = cleaned[i];
      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (ch === "\\") {
          escaped = true;
        } else if (ch === '"') {
          inString = false;
        }
        continue;
      }
      if (ch === '"') {
        inString = true;
        continue;
      }
      if (ch === "{") {
        if (depth === 0) objStart = i;
        depth += 1;
      } else if (ch === "}") {
        depth -= 1;
        if (depth === 0 && objStart !== -1) {
          const slice = cleaned.slice(objStart, i + 1);
          try {
            recovered.push(JSON.parse(slice));
          } catch {
            // Skip malformed trailing fragment
          }
          objStart = -1;
        }
      }
    }
    if (recovered.length > 0) {
      return recovered;
    }
    throw new Error("Não foi possível interpretar a resposta estruturada do edital.");
  }
}

async function prepareEditalSource(input: {
  editalText?: string;
  fileData?: {
    base64: string;
    mimeType: string;
    fileName: string;
  };
}): Promise<{
  baseParts: ContentPart[];
  combinedText: string;
  fileName?: string;
}> {
  const trimmedText = input.editalText?.trim() ?? "";
  const fileData = input.fileData;
  const hasFile = Boolean(fileData?.base64 && fileData?.fileName);

  if (!hasFile && trimmedText.length < 20) {
    throw Object.assign(
      new Error(
        "Cole o texto do conteúdo programático (mínimo 20 caracteres) ou anexe um arquivo .pdf, .txt ou .docx."
      ),
      { statusCode: 400 }
    );
  }

  const baseParts: ContentPart[] = [];
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
      baseParts.push({
        inlineData: {
          mimeType: "application/pdf",
          data: cleanBase64,
        },
      });
    } else if (
      lowerName.endsWith(".txt") ||
      fileData.mimeType.startsWith("text/")
    ) {
      extractedFileText = Buffer.from(cleanBase64, "base64")
        .toString("utf-8")
        .trim();
      if (extractedFileText.length < 20) {
        throw Object.assign(
          new Error("O arquivo .txt anexado está vazio ou tem pouco conteúdo."),
          { statusCode: 400 }
        );
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
        throw Object.assign(
          new Error(
            "Não foi possível extrair texto suficiente do arquivo .docx anexado."
          ),
          { statusCode: 400 }
        );
      }
    } else {
      throw Object.assign(
        new Error("Formato não suportado. Envie arquivos .pdf, .txt ou .docx."),
        { statusCode: 400 }
      );
    }
  }

  const combinedText = [trimmedText, extractedFileText]
    .filter((s) => s.length > 0)
    .join("\n\n");

  return {
    baseParts,
    combinedText,
    fileName: fileData?.fileName,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "25mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  // Step 1: Identify ALL main disciplines (Level 1) in the syllabus/anexo
  app.post("/api/ai/extract-disciplines", async (req, res) => {
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

      const prepared = await prepareEditalSource({ editalText, fileData });
      pruneEditalCache();

      const extractionToken = randomUUID();
      editalCache.set(extractionToken, {
        ...prepared,
        expiresAt: Date.now() + 20 * 60 * 1000,
      });

      const parts: ContentPart[] = [
        ...prepared.baseParts,
        {
          text: `ETAPA 1 — IDENTIFICAÇÃO DE DISCIPLINAS DO EDITAL:
Analise integralmente o Anexo de Conteúdo Programático ${
            prepared.fileName ? `(arquivo: ${prepared.fileName})` : ""
          } referente a "${examName || "Plano de Estudos"}".
${
  disciplineHint
    ? `Disciplina sugerida pelo usuário: ${disciplineHint} (se houver outras disciplinas no texto/anexo, liste TODAS elas).`
    : ""
}

Sua única tarefa nesta Etapa 1 é listar os nomes exatos de TODAS as disciplinas principais (Nível 1) presentes no Conteúdo Programático, na ordem em que aparecem, sem omitir nenhuma e sem repetir nomes.
Exemplos de disciplinas principais (Nível 1): "Língua Portuguesa", "História do Brasil", "História Mundial", "Política Internacional", "Geografia", "Economia", "Direito Interno", "Direito Internacional Público", "Língua Inglesa", etc.
NÃO liste capítulos nem subtópicos aqui — apenas os nomes das disciplinas principais.${
            prepared.combinedText
              ? `\n\nTexto do Edital:\n${prepared.combinedText}`
              : "\n\nLeia todas as páginas do PDF anexado para localizar integralmente a seção de Conteúdo Programático e extrair todas as disciplinas."
          }`,
        },
      ];

      const ai = getGeminiClient();
      const response = await generateWithRetry(() =>
        ai.models.generateContent({
          model: "gemini-4-hydrogen",
          contents: { parts },
          config: {
            maxOutputTokens: 8192,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            systemInstruction:
              "Você é um especialista em leitura estrutural de editais brasileiros. Liste apenas os nomes exatos de todas as disciplinas principais (Nível 1) presentes no conteúdo programático do documento, sem omitir nenhuma matéria.",
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                disciplines: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description:
                    "Lista ordenada com o nome exato de todas as disciplinas principais encontradas no conteúdo programático.",
                },
              },
              required: ["disciplines"],
            },
          },
        })
      );

      const cleaned = stripJsonFences(response.text ?? '{"disciplines":[]}');
      const parsed = JSON.parse(cleaned || '{"disciplines":[]}') as {
        disciplines?: string[];
      };

      const seen = new Set<string>();
      const disciplines = (parsed.disciplines ?? [])
        .map((d) => (typeof d === "string" ? d.trim() : ""))
        .filter((d) => {
          if (!d) return false;
          const key = d.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

      if (disciplines.length === 0 && disciplineHint?.trim()) {
        disciplines.push(disciplineHint.trim());
      }

      res.json({
        extractionToken,
        disciplines,
      });
    } catch (err) {
      if (
        err &&
        typeof err === "object" &&
        "statusCode" in err &&
        typeof (err as { statusCode?: number }).statusCode === "number"
      ) {
        res.status((err as { statusCode: number }).statusCode).json({
          error: err instanceof Error ? err.message : "Erro nos dados enviados.",
        });
        return;
      }
      const { status, message } = extractErrorMessage(err);
      res.status(status).json({ error: message });
    }
  });

  // Step 2: Extract 100% of topics/subitems for ONE specific discipline down to Level 3
  app.post("/api/ai/extract-discipline-topics", async (req, res) => {
    try {
      const {
        extractionToken,
        discipline,
        examName,
        editalText,
        fileData,
      } = req.body as {
        extractionToken?: string;
        discipline?: string;
        examName?: string;
        editalText?: string;
        fileData?: {
          base64: string;
          mimeType: string;
          fileName: string;
        };
      };

      const targetDiscipline = discipline?.trim();
      if (!targetDiscipline) {
        res.status(400).json({ error: "Disciplina alvo não informada." });
        return;
      }

      let prepared: {
        baseParts: ContentPart[];
        combinedText: string;
        fileName?: string;
      } | null = null;

      if (extractionToken && editalCache.has(extractionToken)) {
        const cached = editalCache.get(extractionToken)!;
        if (cached.expiresAt > Date.now()) {
          prepared = {
            baseParts: cached.baseParts,
            combinedText: cached.combinedText,
            fileName: cached.fileName,
          };
        } else {
          editalCache.delete(extractionToken);
        }
      }

      if (!prepared) {
        prepared = await prepareEditalSource({ editalText, fileData });
      }

      const parts: ContentPart[] = [
        ...prepared.baseParts,
        {
          text: `ETAPA 2 — EXTRAÇÃO COMPLETA E PROFUNDA PARA UMA ÚNICA DISCIPLINA:
Disciplina Alvo (Nível 1): "${targetDiscipline}"
Edital/Plano: "${examName || "Plano de Estudos"}"${
            prepared.fileName ? `\nArquivo: ${prepared.fileName}` : ""
          }

Extraia 100% do conteúdo programático pertencente EXCLUSIVAMENTE à disciplina "${targetDiscipline}", do primeiro ao último item, SEM RESUMIR, SEM AGRUPAR e SEM OMITIR NENHUM ITEM OU SUBITEM.

REGRAS OBRIGATÓRIAS DE HIERARQUIA (MÍNIMO 3 NÍVEIS):
- Nível 1 ("discipline"): SEMPRE "${targetDiscipline}".
- Nível 2 ("macroTopic"): O capítulo, unidade ou tópico macro numerado dentro de "${targetDiscipline}" (ex.: "1. O período colonial", "2. Processo de Independência").
- Nível 3 ("topic"): O subitem específico no último nível de detalhe encontrado dentro daquele tópico macro (ex.: "1.1 A configuração territorial da América Portuguesa", "1.2 As dimensões econômicas, políticas, sociais e culturais do sistema colonial").
- PROIBIÇÃO DE AGRUPAMENTO: NUNCA crie apenas 1 card para Nível 1 ou apenas cards de Nível 2. Desça até o último nível de detalhamento (Nível 3 ou subdivisões por ponto e vírgula/vírgula quando um item macro listar vários subtemas). Cada subitem específico deve gerar 1 item independente no array.
- SEM LIMITE DE QUANTIDADE: Gere quantos itens existirem de verdade nessa disciplina (sejam 12, 35, 60 ou 100+ subitens), cobrindo 100% do texto dessa disciplina no edital.
- CONCISÃO POR ITEM: Para evitar qualquer corte no JSON mesmo em disciplinas gigantescas, mantenha "initialSummary" em 1 ou 2 frases objetivas, "keyTraps" com 1 ou 2 pontos curtos e "checklist" com 3 passos curtos.${
            prepared.combinedText
              ? `\n\nTexto completo do Edital:\n${prepared.combinedText}`
              : "\n\nLocalize a seção da disciplina no PDF anexado e extraia integralmente todos os seus tópicos (Nível 2) e subitens específicos (Nível 3)."
          }`,
        },
      ];

      const ai = getGeminiClient();
      const response = await generateWithRetry(() =>
        ai.models.generateContent({
          model: "gemini-4-hydrogen",
          contents: { parts },
          config: {
            maxOutputTokens: 65536,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            systemInstruction: `Você é um extrator rigoroso de editais. Extraia 100% dos subitens da disciplina "${targetDiscipline}" com hierarquia estrita de 3 níveis: 'discipline' (Nível 1), 'macroTopic' (Nível 2: capítulo/tópico macro) e 'topic' (Nível 3: subitem específico do último nível). Nunca pare antes do fim da disciplina, nunca resuma vários subitens em um único card e nunca imponha limite máximo de quantidade.`,
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
                        description: `Nome da disciplina principal (Nível 1): "${targetDiscipline}".`,
                      },
                      macroTopic: {
                        type: Type.STRING,
                        description:
                          "Capítulo ou tópico macro (Nível 2) ao qual o subitem pertence (ex.: '1. O período colonial').",
                      },
                      topic: {
                        type: Type.STRING,
                        description:
                          "Subitem específico no último nível de profundidade (Nível 3) que será o título principal do card (ex.: '1.1 A configuração territorial da América Portuguesa').",
                      },
                      normativeRefs: {
                        type: Type.STRING,
                        description:
                          "Referências normativas, tratados, leis ou marcos bibliográficos aplicáveis ao subitem.",
                      },
                      incidence: {
                        type: Type.STRING,
                        description: "Incidência estimada em provas: Alta, Média ou Base.",
                      },
                      estimatedMinutes: {
                        type: Type.INTEGER,
                        description: "Tempo estimado em minutos (30 a 120).",
                      },
                      initialSummary: {
                        type: Type.STRING,
                        description:
                          "Resumo inicial objetivo em 1 a 2 frases diretas sobre este subitem específico.",
                      },
                      keyTraps: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "1 a 2 pegadinhas clássicas curtas cobradas em prova.",
                      },
                      checklist: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "3 etapas curtas e concretas de estudo.",
                      },
                    },
                    required: [
                      "discipline",
                      "macroTopic",
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
        })
      );

      const items = parseItemsJsonWithRecovery(response.text ?? '{"items":[]}');
      res.json({ discipline: targetDiscipline, items });
    } catch (err) {
      if (
        err &&
        typeof err === "object" &&
        "statusCode" in err &&
        typeof (err as { statusCode?: number }).statusCode === "number"
      ) {
        res.status((err as { statusCode: number }).statusCode).json({
          error: err instanceof Error ? err.message : "Erro nos dados enviados.",
        });
        return;
      }
      const { status, message } = extractErrorMessage(err);
      res.status(status).json({ error: message });
    }
  });

  // Legacy single-shot endpoint retained for compatibility
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

      const prepared = await prepareEditalSource({ editalText, fileData });
      const contentParts: ContentPart[] = [
        ...prepared.baseParts,
        {
          text: `Analise o conteúdo programático do edital ${
            prepared.fileName ? `(arquivo anexado: ${prepared.fileName})` : ""
          } e extraia todos os subitens com hierarquia de 3 níveis (discipline > macroTopic > topic).

Plano/Edital alvo: ${examName || "Plano de Estudos"}
Disciplina sugerida: ${
            disciplineHint || "Identificar automaticamente a disciplina principal"
          }${
            prepared.combinedText
              ? `\n\nTexto do Edital:\n${prepared.combinedText}`
              : "\n\nLeia integralmente todas as páginas do documento PDF anexado."
          }`,
        },
      ];

      const ai = getGeminiClient();
      const response = await generateWithRetry(() =>
        ai.models.generateContent({
          model: "gemini-4-hydrogen",
          contents: { parts: contentParts },
          config: {
            maxOutputTokens: 65536,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            systemInstruction:
              "Extraia todos os itens sem limite artificial usando hierarquia de 3 níveis: discipline (Nível 1), macroTopic (Nível 2) e topic (Nível 3).",
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                items: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      discipline: { type: Type.STRING },
                      macroTopic: { type: Type.STRING },
                      topic: { type: Type.STRING },
                      normativeRefs: { type: Type.STRING },
                      incidence: { type: Type.STRING },
                      estimatedMinutes: { type: Type.INTEGER },
                      initialSummary: { type: Type.STRING },
                      keyTraps: { type: Type.ARRAY, items: { type: Type.STRING } },
                      checklist: { type: Type.ARRAY, items: { type: Type.STRING } },
                    },
                    required: [
                      "discipline",
                      "macroTopic",
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
        })
      );

      const items = parseItemsJsonWithRecovery(response.text ?? '{"items":[]}');
      res.json({ items });
    } catch (err) {
      if (
        err &&
        typeof err === "object" &&
        "statusCode" in err &&
        typeof (err as { statusCode?: number }).statusCode === "number"
      ) {
        res.status((err as { statusCode: number }).statusCode).json({
          error: err instanceof Error ? err.message : "Erro nos dados enviados.",
        });
        return;
      }
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
