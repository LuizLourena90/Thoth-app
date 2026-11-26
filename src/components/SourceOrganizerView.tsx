import React, { useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Check,
  FileText,
  HelpCircle,
  Loader2,
  Plus,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { getDisciplineBadgeClasses } from "../utils/disciplineColors";
import type {
  EditalCard,
  ExamQuestion,
  Flashcard,
  IncidenceLevel,
} from "../types";

interface ParsedEditalItem {
  discipline: string;
  topic: string;
  normativeRefs: string;
  incidence: string;
  estimatedMinutes: number;
  initialSummary: string;
  keyTraps: string[];
  checklist: string[];
}

interface GeneratedRevisionResult {
  suggestedTopic: string;
  executiveSummary: string;
  legalBasis: string[];
  examTraps: string[];
  flashcards: Array<{ front: string; back: string; articleRef: string }>;
  questions: Array<{
    stem: string;
    options: string[];
    correctIndex: number;
    explanation: string;
    articleRef: string;
  }>;
}

interface SourceOrganizerViewProps {
  activeTrackId: string | null;
  activeTrackTitle: string | null;
  existingCards: EditalCard[];
  onAddParsedCards: (newCards: EditalCard[], customPlanTitle?: string) => void;
  onAttachRevisionToCard: (
    cardId: string,
    payload: {
      summary: string;
      normativeRefs: string;
      examTraps: string[];
      flashcards: Flashcard[];
      questions: ExamQuestion[];
      sourceTitle: string;
    }
  ) => void;
  onGoToKanban: () => void;
}

function normalizeIncidence(raw: string): IncidenceLevel {
  if (raw.toLowerCase().includes("alt")) return "Alta";
  if (raw.toLowerCase().includes("méd") || raw.toLowerCase().includes("med")) return "Média";
  return "Base";
}

interface AttachedEditalFile {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  base64: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isSupportedEditalFile(file: File): boolean {
  const lower = file.name.toLowerCase();
  return (
    lower.endsWith(".pdf") ||
    lower.endsWith(".txt") ||
    lower.endsWith(".docx") ||
    file.type === "application/pdf" ||
    file.type === "text/plain" ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
}

export const SourceOrganizerView: React.FC<SourceOrganizerViewProps> = ({
  activeTrackId,
  activeTrackTitle,
  existingCards,
  onAddParsedCards,
  onAttachRevisionToCard,
  onGoToKanban,
}) => {
  const [mode, setMode] = useState<"edital" | "source">("edital");

  // Mode 1: Edital -> Kanban
  const [planName, setPlanName] = useState(activeTrackTitle ?? "");
  const [editalText, setEditalText] = useState("");
  const [disciplineHint, setDisciplineHint] = useState("");
  const [attachedFile, setAttachedFile] = useState<AttachedEditalFile | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [editalError, setEditalError] = useState<string | null>(null);
  const [parsedItems, setParsedItems] = useState<ParsedEditalItem[]>([]);
  const [selectedParsedIdx, setSelectedParsedIdx] = useState<Record<number, boolean>>({});
  const [editalImportedNotice, setEditalImportedNotice] = useState<string | null>(null);

  // Mode 2: Source -> Summary & Revision
  const [sourceTitle, setSourceTitle] = useState("");
  const [sourceType, setSourceType] = useState("Material de Referência");
  const [sourceDiscipline, setSourceDiscipline] = useState("");
  const [sourceTopic, setSourceTopic] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [targetCardId, setTargetCardId] = useState<string>("new");
  const [isGeneratingRev, setIsGeneratingRev] = useState(false);
  const [revError, setRevError] = useState<string | null>(null);
  const [generatedRev, setGeneratedRev] = useState<GeneratedRevisionResult | null>(null);
  const [revSavedNotice, setRevSavedNotice] = useState<string | null>(null);

  const runEditalExtraction = async (options?: {
    overrideFile?: AttachedEditalFile | null;
    overridePlanName?: string;
  }) => {
    const fileToSend =
      options && "overrideFile" in options ? options.overrideFile : attachedFile;
    const effectivePlanName =
      options?.overridePlanName?.trim() ||
      planName.trim() ||
      activeTrackTitle ||
      "Plano de Estudos";

    setIsOrganizing(true);
    setEditalError(null);
    setEditalImportedNotice(null);

    try {
      const response = await fetch("/api/ai/organize-edital", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          editalText,
          examName: effectivePlanName,
          disciplineHint: disciplineHint.trim() || undefined,
          fileData: fileToSend
            ? {
                base64: fileToSend.base64,
                mimeType: fileToSend.mimeType,
                fileName: fileToSend.fileName,
              }
            : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Não foi possível organizar o edital.");
      }

      const items = (data.items ?? []) as ParsedEditalItem[];
      setParsedItems(items);
      const initialSelection: Record<number, boolean> = {};
      items.forEach((_, idx) => {
        initialSelection[idx] = true;
      });
      setSelectedParsedIdx(initialSelection);
    } catch (err) {
      setEditalError(err instanceof Error ? err.message : "Erro ao processar edital.");
    } finally {
      setIsOrganizing(false);
    }
  };

  const handleOrganizeEdital = async (e: React.FormEvent) => {
    e.preventDefault();
    await runEditalExtraction();
  };

  const handleSelectedFile = (file: File | undefined | null) => {
    if (!file) return;
    setEditalError(null);
    setEditalImportedNotice(null);

    if (!isSupportedEditalFile(file)) {
      setEditalError(
        "Formato inválido. Anexe um arquivo .pdf, .txt ou .docx."
      );
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setEditalError(
        "O arquivo excede o limite de 15 MB. Envie um PDF menor ou cole o trecho do conteúdo programático."
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      if (!base64) {
        setEditalError("Não foi possível ler o arquivo selecionado.");
        return;
      }

      const fallbackMime = file.name.toLowerCase().endsWith(".pdf")
        ? "application/pdf"
        : file.name.toLowerCase().endsWith(".docx")
          ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          : "text/plain";

      const nextFile: AttachedEditalFile = {
        fileName: file.name,
        mimeType: file.type || fallbackMime,
        sizeBytes: file.size,
        base64,
      };
      setAttachedFile(nextFile);

      const suggestedName = !planName.trim()
        ? file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ")
        : planName;
      if (!planName.trim()) {
        setPlanName(suggestedName);
      }

      void runEditalExtraction({
        overrideFile: nextFile,
        overridePlanName: suggestedName,
      });
    };
    reader.onerror = () => {
      setEditalError("Falha ao ler o arquivo selecionado.");
    };
    reader.readAsDataURL(file);
  };

  const handleCommitParsedToKanban = () => {
    const selected = parsedItems.filter((_, idx) => selectedParsedIdx[idx]);
    if (selected.length === 0) return;

    const targetTrackId = activeTrackId ?? `plano-${Date.now()}`;
    const newCards: EditalCard[] = selected.map((item, idx) => {
      const incidence = normalizeIncidence(item.incidence);
      return {
        id: `card-edital-${Date.now()}-${idx}`,
        trackId: targetTrackId,
        discipline: item.discipline.trim() || "Matéria Geral",
        topic: item.topic,
        normativeRefs: item.normativeRefs,
        incidence,
        examWeightQuestions: incidence === "Alta" ? 8 : incidence === "Média" ? 5 : 3,
        stage: "edital",
        estimatedMinutes: item.estimatedMinutes || 50,
        summary: item.initialSummary,
        examTraps: item.keyTraps ?? [],
        steps: (item.checklist ?? ["Leitura da fonte base", "Elaborar resumo", "Resolver exercícios"]).map(
          (label, sIdx) => ({
            id: `step-${Date.now()}-${idx}-${sIdx}`,
            label,
            done: false,
          })
        ),
        flashcards: [],
        questions: [],
        sourceTitle: "Extraído do Edital via Toth IA",
        updatedAt: "Agora",
      };
    });

    onAddParsedCards(newCards, !activeTrackId ? planName.trim() || "Meu Plano de Estudos" : undefined);
    setEditalImportedNotice(
      `${newCards.length} ${newCards.length === 1 ? "item adicionado" : "itens adicionados"} à coluna "01. Edital Mapeado" do Kanban.`
    );
    setParsedItems([]);
  };

  const handleGenerateRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGeneratingRev(true);
    setRevError(null);
    setRevSavedNotice(null);

    try {
      const response = await fetch("/api/ai/generate-revision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceTitle: sourceTitle.trim() || "Fonte enviada",
          sourceType,
          sourceText,
          discipline: sourceDiscipline.trim() || "Geral",
          topic: sourceTopic.trim() || sourceTitle.trim() || "Tópico do Edital",
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Não foi possível gerar o material de revisão.");
      }
      setGeneratedRev(data as GeneratedRevisionResult);
    } catch (err) {
      setRevError(err instanceof Error ? err.message : "Erro ao gerar revisão.");
    } finally {
      setIsGeneratingRev(false);
    }
  };

  const handleSaveRevisionToBoard = () => {
    if (!generatedRev) return;

    const flashcards: Flashcard[] = (generatedRev.flashcards ?? []).map((fc, idx) => ({
      id: `fc-src-${Date.now()}-${idx}`,
      front: fc.front,
      back: fc.back,
      articleRef: fc.articleRef,
      mastered: false,
    }));

    const questions: ExamQuestion[] = (generatedRev.questions ?? []).map((q, idx) => ({
      id: `q-src-${Date.now()}-${idx}`,
      stem: q.stem,
      options: q.options,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
      articleRef: q.articleRef,
    }));

    if (targetCardId !== "new") {
      onAttachRevisionToCard(targetCardId, {
        summary: generatedRev.executiveSummary,
        normativeRefs: generatedRev.legalBasis.join(" · "),
        examTraps: generatedRev.examTraps,
        flashcards,
        questions,
        sourceTitle: sourceTitle.trim() || "Fonte de estudo",
      });
      setRevSavedNotice("Resumo, flashcards e questões anexados ao cartão selecionado no Kanban.");
    } else {
      const targetTrackId = activeTrackId ?? `plano-${Date.now()}`;
      const newCard: EditalCard = {
        id: `card-src-${Date.now()}`,
        trackId: targetTrackId,
        discipline: sourceDiscipline.trim() || "Matéria Geral",
        topic: generatedRev.suggestedTopic || sourceTopic.trim() || sourceTitle.trim() || "Novo Tópico",
        normativeRefs: generatedRev.legalBasis.join(" · ") || "Referências da fonte",
        incidence: "Alta",
        examWeightQuestions: 6,
        stage: "resumo",
        estimatedMinutes: 45,
        summary: generatedRev.executiveSummary,
        examTraps: generatedRev.examTraps ?? [],
        steps: [
          { id: `st-${Date.now()}-1`, label: "Fonte processada em resumo estruturado", done: true },
          { id: `st-${Date.now()}-2`, label: "Revisar flashcards ativos", done: false },
          { id: `st-${Date.now()}-3`, label: "Responder bateria de exercícios", done: false },
        ],
        flashcards,
        questions,
        sourceTitle: sourceTitle.trim() || "Fonte de estudo",
        updatedAt: "Agora",
      };
      onAddParsedCards([newCard], !activeTrackId ? planName.trim() || "Meu Plano de Estudos" : undefined);
      setRevSavedNotice(
        `Novo cartão criado na etapa "03. Resumo & Fontes" com ${flashcards.length} flashcards e ${questions.length} questões.`
      );
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Mode Switcher */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-editorial text-xl font-semibold text-slate-900">
            Importar Edital ou Gerar Revisão de Fontes
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Cole o conteúdo programático do seu edital para criar cartões no Kanban ou transforme textos e normas em resumos e revisões.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md shrink-0 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setMode("edital")}
            className={`px-3.5 py-2 text-xs font-semibold rounded transition-colors whitespace-nowrap ${
              mode === "edital"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            1. Edital → Cartões Kanban
          </button>
          <button
            type="button"
            onClick={() => setMode("source")}
            className={`px-3.5 py-2 text-xs font-semibold rounded transition-colors whitespace-nowrap ${
              mode === "source"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            2. Fontes → Resumo & Revisão
          </button>
        </div>
      </div>

      {mode === "edital" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Edital Input */}
          <form
            onSubmit={handleOrganizeEdital}
            className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-6 space-y-4"
          >
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Conteúdo programático do edital
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Informe o nome do plano e cole os tópicos do edital para organizar no Kanban.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nome do plano / edital
                </label>
                <input
                  type="text"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="Ex.: Meu Plano de Estudos 2026"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Matéria principal (opcional)
                </label>
                <input
                  type="text"
                  value={disciplineHint}
                  onChange={(e) => setDisciplineHint(e.target.value)}
                  placeholder="Detectar automaticamente"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                />
              </div>
            </div>

            {/* Drag-and-drop / Click File Upload Area (.pdf, .txt, .docx) */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Upload de arquivo do edital (.pdf, .txt ou .docx)
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.docx,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  handleSelectedFile(file);
                  e.target.value = "";
                }}
                className="sr-only"
              />

              {!attachedFile ? (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(true);
                  }}
                  onDragLeave={() => setIsDraggingFile(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(false);
                    const file = e.dataTransfer.files?.[0];
                    handleSelectedFile(file);
                  }}
                  className={`border border-dashed rounded-md px-4 py-5 text-center cursor-pointer transition-colors ${
                    isDraggingFile
                      ? "border-[#1E3A5F] bg-slate-100"
                      : "border-slate-300 bg-slate-50 hover:border-[#1E3A5F] hover:bg-slate-100/70"
                  }`}
                >
                  <Upload className="w-5 h-5 text-[#1E3A5F] mx-auto" />
                  <div className="mt-2 text-xs font-semibold text-slate-800">
                    Arraste seu edital aqui ou clique para selecionar
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Aceita .pdf, .txt e .docx (até 15 MB) · Extração automática ao anexar
                  </p>
                </div>
              ) : (
                <div className="border border-slate-300 bg-slate-50 rounded-md px-3.5 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="w-4 h-4 text-[#1E3A5F] shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900 truncate">
                        {attachedFile.fileName}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                        {formatFileSize(attachedFile.sizeBytes)} ·{" "}
                        {isOrganizing ? "Extraindo conteúdo..." : "Anexado"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2 py-1 text-[11px] font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100 whitespace-nowrap"
                    >
                      Trocar
                    </button>
                    <button
                      type="button"
                      onClick={() => setAttachedFile(null)}
                      title="Remover arquivo anexado"
                      className="p-1 text-slate-500 hover:text-slate-800 rounded"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Ou cole o texto do edital / ementa
              </label>
              <textarea
                rows={8}
                value={editalText}
                onChange={(e) => setEditalText(e.target.value)}
                placeholder="Cole aqui o texto do edital (disciplinas, tópicos, artigos ou conteúdos programáticos)..."
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] leading-relaxed"
              />
            </div>

            {editalError && (
              <div className="p-3 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-md">
                {editalError}
              </div>
            )}

            {editalImportedNotice && (
              <div className="p-3 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{editalImportedNotice}</span>
                </span>
                <button
                  type="button"
                  onClick={onGoToKanban}
                  className="font-semibold underline whitespace-nowrap"
                >
                  Ver no Kanban
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={isOrganizing}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#1E3A5F] rounded-md hover:bg-[#162D4A] disabled:opacity-60 transition-colors"
            >
              {isOrganizing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Estruturando tópicos do edital com Gemini...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Organizar edital em cartões Kanban</span>
                </>
              )}
            </button>
          </form>

          {/* Right: Structured Preview */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Prévia dos subtópicos estruturados
                  {parsedItems.length > 0 && (
                    <span className="ml-2 font-mono text-xs font-medium text-slate-500">
                      ({parsedItems.length} subtópicos)
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500">
                  Cada subtópico gerará um card independente no Kanban com a tag da disciplina.
                </p>
              </div>
              {parsedItems.length > 0 && (
                <button
                  type="button"
                  onClick={handleCommitParsedToKanban}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#1E3A5F] rounded-md hover:bg-[#162D4A] whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>
                    Publicar no Kanban (
                    {Object.values(selectedParsedIdx).filter(Boolean).length})
                  </span>
                </button>
              )}
            </div>

            {isOrganizing && parsedItems.length === 0 ? (
              <div className="border border-slate-200 bg-slate-50 rounded-md p-10 text-center space-y-2.5">
                <Loader2 className="w-6 h-6 text-[#1E3A5F] mx-auto animate-spin" />
                <div className="text-sm font-medium text-slate-800">
                  {attachedFile
                    ? `Extraindo subtópicos de ${attachedFile.fileName}...`
                    : "Organizando subtópicos do edital..."}
                </div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  A IA está quebrando cada disciplina em subtópicos individuais do edital para montar os cards do Kanban.
                </p>
              </div>
            ) : parsedItems.length === 0 ? (
              <div className="border border-dashed border-slate-300 rounded-md p-10 text-center space-y-2">
                <FileText className="w-6 h-6 text-slate-400 mx-auto" />
                <div className="text-sm font-medium text-slate-700">
                  Nenhum edital processado ainda
                </div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Anexe um arquivo (.pdf, .txt, .docx) ou cole o texto ao lado para preencher automaticamente a prévia granular dos subtópicos do Kanban.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 border border-slate-200 rounded-md max-h-[720px] overflow-y-auto">
                {parsedItems.map((item, idx) => {
                  const checked = !!selectedParsedIdx[idx];
                  return (
                    <div key={idx} className="p-4 space-y-2">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setSelectedParsedIdx((prev) => ({
                              ...prev,
                              [idx]: e.target.checked,
                            }))
                          }
                          className="mt-1 w-4 h-4 accent-[#1E3A5F]"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                            <span
                              className={getDisciplineBadgeClasses(item.discipline)}
                              title={item.discipline}
                            >
                              {item.discipline}
                            </span>
                            <span className="font-mono tabular-nums shrink-0">
                              Prioridade {item.incidence} · ~{item.estimatedMinutes} min
                            </span>
                          </div>
                          <h4 className="mt-1.5 text-sm font-semibold text-slate-900">
                            {item.topic}
                          </h4>
                          <div className="mt-0.5 font-mono text-xs text-slate-500">
                            {item.normativeRefs}
                          </div>
                          <p className="mt-2 text-xs text-slate-600 leading-relaxed line-clamp-3">
                            {item.initialSummary}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Source Input */}
          <form
            onSubmit={handleGenerateRevision}
            className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-6 space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Matéria / Disciplina
                </label>
                <input
                  type="text"
                  value={sourceDiscipline}
                  onChange={(e) => setSourceDiscipline(e.target.value)}
                  placeholder="Ex.: Direito Civil, Português..."
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Tipo de fonte
                </label>
                <select
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                >
                  <option value="Material de Referência">Material de Referência</option>
                  <option value="Lei / Norma">Lei / Norma</option>
                  <option value="Jurisprudência / Julgado">Jurisprudência / Julgado</option>
                  <option value="Apostila / Caderno de Prova">Apostila / Caderno de Prova</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Título da fonte / Tópico
              </label>
              <input
                type="text"
                value={sourceTitle}
                onChange={(e) => {
                  setSourceTitle(e.target.value);
                  setSourceTopic(e.target.value);
                }}
                placeholder="Ex.: Princípios Orçamentários ou Responsabilidade Civil"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Destino no Kanban do Edital
              </label>
              <select
                value={targetCardId}
                onChange={(e) => setTargetCardId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
              >
                <option value="new">Criar novo cartão em "03. Resumo & Fontes"</option>
                {existingCards.map((c) => (
                  <option key={c.id} value={c.id}>
                    Anexar ao cartão: {c.discipline} — {c.topic}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Texto integral da fonte
              </label>
              <textarea
                rows={8}
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                placeholder="Cole aqui o texto da lei, apostila, artigo ou anotação para gerar resumo, flashcards e questões..."
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] leading-relaxed"
              />
            </div>

            {revError && (
              <div className="p-3 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-md">
                {revError}
              </div>
            )}

            {revSavedNotice && (
              <div className="p-3 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{revSavedNotice}</span>
                </span>
                <button
                  type="button"
                  onClick={onGoToKanban}
                  className="font-semibold underline whitespace-nowrap"
                >
                  Ver no Kanban
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={isGeneratingRev}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#1E3A5F] rounded-md hover:bg-[#162D4A] disabled:opacity-60 transition-colors"
            >
              {isGeneratingRev ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Gerando resumo, flashcards e questões...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Gerar resumo e revisão ativa da fonte</span>
                </>
              )}
            </button>
          </form>

          {/* Right: Generated Material Preview */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-6 space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Material de revisão gerado
                </h3>
                <p className="text-xs text-slate-500">
                  Síntese pronta para salvar no seu plano Kanban.
                </p>
              </div>
              {generatedRev && (
                <button
                  type="button"
                  onClick={handleSaveRevisionToBoard}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#1E3A5F] rounded-md hover:bg-[#162D4A] whitespace-nowrap shrink-0"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Salvar no Kanban</span>
                </button>
              )}
            </div>

            {!generatedRev ? (
              <div className="border border-dashed border-slate-300 rounded-md p-10 text-center space-y-2">
                <BookOpen className="w-6 h-6 text-slate-400 mx-auto" />
                <div className="text-sm font-medium text-slate-700">
                  Aguardando conteúdo da fonte
                </div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Cole um texto-base à esquerda e clique em "Gerar resumo e revisão ativa da fonte".
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <div className="text-xs font-medium text-[#1E3A5F]">
                    {sourceDiscipline || "Matéria Geral"} · {sourceType}
                  </div>
                  <h4 className="mt-1 font-editorial text-lg font-semibold text-slate-900">
                    {generatedRev.suggestedTopic}
                  </h4>
                  <div className="mt-1 font-mono text-xs text-slate-500">
                    {generatedRev.legalBasis.join(" · ")}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <div className="text-xs font-semibold text-slate-900 mb-1.5">
                    Resumo Executivo
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {generatedRev.executiveSummary}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5 mb-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#B45309]" />
                    <span>Pegadinhas e pontos críticos</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {generatedRev.examTraps.map((trap, i) => (
                      <li key={i}>
                        <span className="font-mono font-semibold text-[#9F1239] mr-1.5">
                          0{i + 1}.
                        </span>
                        {trap}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-4 border-t border-slate-200 grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-[#1E3A5F]" />
                      <span className="font-mono tabular-nums">
                        {generatedRev.flashcards.length} flashcards gerados
                      </span>
                    </div>
                    <p className="mt-1 text-slate-600 line-clamp-2">
                      Ex.: {generatedRev.flashcards[0]?.front}
                    </p>
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-[#1E3A5F]" />
                      <span className="font-mono tabular-nums">
                        {generatedRev.questions.length} questões inéditas
                      </span>
                    </div>
                    <p className="mt-1 text-slate-600 line-clamp-2">
                      Com gabarito comentado e referência da fonte.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
