import React, { useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  FileText,
  HelpCircle,
  Loader2,
  RotateCw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { STUDY_STAGES } from "../data/kanbanConfig";
import { getDisciplineBadgeClasses } from "../utils/disciplineColors";
import type { EditalCard, ExamQuestion, Flashcard, StudyStageId } from "../types";

interface CardDetailDrawerProps {
  card: EditalCard | null;
  onClose: () => void;
  onMoveStage: (cardId: string, nextStage: StudyStageId) => void;
  onDeleteCard: (cardId: string) => void;
  onToggleStep: (cardId: string, stepId: string) => void;
  onToggleFlashcardMastered: (cardId: string, flashcardId: string) => void;
  onEnrichCardWithRevision: (
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
}

type DrawerTab = "resumo" | "flashcards" | "questoes" | "fonte";

export const CardDetailDrawer: React.FC<CardDetailDrawerProps> = ({
  card,
  onClose,
  onMoveStage,
  onDeleteCard,
  onToggleStep,
  onToggleFlashcardMastered,
  onEnrichCardWithRevision,
}) => {
  const [activeTab, setActiveTab] = useState<DrawerTab>("resumo");
  const [flippedIds, setFlippedIds] = useState<Record<string, boolean>>({});
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [sourceText, setSourceText] = useState("");
  const [sourceTitle, setSourceTitle] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  if (!card) return null;

  const toggleFlip = (id: string) => {
    setFlippedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleGenerateFromCardSource = async (e: React.FormEvent) => {
    e.preventDefault();
    const contentToUse =
      sourceText.trim() ||
      `Tema: ${card.topic}\nDisciplina: ${card.discipline}\nReferências: ${card.normativeRefs}\nResumo base: ${card.summary}`;

    setIsGenerating(true);
    setGenError(null);
    try {
      const response = await fetch("/api/ai/generate-revision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceTitle: sourceTitle.trim() || card.sourceTitle || card.topic,
          sourceType: "Fonte de Estudo",
          sourceText: contentToUse,
          discipline: card.discipline,
          topic: card.topic,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Falha ao gerar revisão com Gemini.");
      }

      const newFlashcards: Flashcard[] = (data.flashcards ?? []).map(
        (fc: { front: string; back: string; articleRef: string }, idx: number) => ({
          id: `fc-ai-${Date.now()}-${idx}`,
          front: fc.front,
          back: fc.back,
          articleRef: fc.articleRef,
          mastered: false,
        })
      );

      const newQuestions: ExamQuestion[] = (data.questions ?? []).map(
        (
          q: {
            stem: string;
            options: string[];
            correctIndex: number;
            explanation: string;
            articleRef: string;
          },
          idx: number
        ) => ({
          id: `q-ai-${Date.now()}-${idx}`,
          stem: q.stem,
          options: q.options,
          correctIndex: q.correctIndex,
          explanation: q.explanation,
          articleRef: q.articleRef,
        })
      );

      onEnrichCardWithRevision(card.id, {
        summary: data.executiveSummary || card.summary,
        normativeRefs:
          Array.isArray(data.legalBasis) && data.legalBasis.length > 0
            ? data.legalBasis.join(" · ")
            : card.normativeRefs,
        examTraps:
          Array.isArray(data.examTraps) && data.examTraps.length > 0
            ? data.examTraps
            : card.examTraps,
        flashcards: [...card.flashcards, ...newFlashcards],
        questions: [...card.questions, ...newQuestions],
        sourceTitle: sourceTitle.trim() || card.sourceTitle || "Fonte gerada via Toth IA",
      });

      setSourceText("");
      setActiveTab("resumo");
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Erro ao gerar material.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 flex justify-end"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Detalhes do tópico ${card.topic}`}
    >
      <div
        className="w-full max-w-2xl bg-white h-full border-l border-slate-200 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className={getDisciplineBadgeClasses(card.discipline)}>
                {card.discipline}
              </span>
              <span aria-hidden="true">·</span>
              <span>Prioridade {card.incidence}</span>
            </div>
            <h2 className="mt-1.5 font-editorial text-xl font-semibold text-slate-900 leading-snug">
              {card.topic}
            </h2>
            <div className="mt-1 font-mono text-xs text-slate-600">{card.normativeRefs}</div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                onDeleteCard(card.id);
                onClose();
              }}
              className="p-2 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors"
              title="Excluir cartão"
              aria-label="Excluir cartão"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
              aria-label="Fechar painel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Kanban Stage Progress Selector */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200">
          <div className="text-[11px] font-medium text-slate-500 mb-2">
            Etapa no plano de estudos Kanban
          </div>
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {STUDY_STAGES.map((stage, idx) => {
              const isActive = card.stage === stage.id;
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => onMoveStage(card.id, stage.id)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? "bg-[#1E3A5F] text-white"
                      : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {idx + 1}. {stage.title}
                </button>
              );
            })}
          </div>
        </div>

        {/* Drawer Sub-Navigation Tabs */}
        <div className="px-6 border-b border-slate-200 flex items-center gap-6 overflow-x-auto">
          {(
            [
              { id: "resumo", label: "Resumo & Pontos Críticos" },
              { id: "flashcards", label: `Flashcards (${card.flashcards.length})` },
              { id: "questoes", label: `Exercícios (${card.questions.length})` },
              { id: "fonte", label: "Gerar de Fonte IA" },
            ] as const
          ).map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? "border-[#1E3A5F] text-[#1E3A5F]"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === "resumo" && (
            <>
              <section>
                <div className="flex items-center justify-between gap-4 mb-2.5">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Resumo direcionado
                  </h3>
                  <span className="font-mono text-xs text-slate-500 tabular-nums">
                    ~{card.estimatedMinutes} min de estudo
                  </span>
                </div>
                <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {card.summary}
                </div>
              </section>

              <section className="pt-5 border-t border-slate-200">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-[#B45309]" />
                  <span>Pontos de atenção e pegadinhas de prova</span>
                </h3>
                {card.examTraps.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    Nenhum ponto crítico registrado ainda. Use a aba "Gerar de Fonte IA" para extrair alertas e questões a partir da fonte.
                  </p>
                ) : (
                  <ul className="space-y-2.5">
                    {card.examTraps.map((trap, i) => (
                      <li
                        key={i}
                        className="text-sm text-slate-700 leading-relaxed pl-3 border-b border-slate-100 pb-2.5 last:border-b-0 last:pb-0"
                      >
                        <span className="font-mono text-xs text-[#9F1239] font-semibold mr-2">
                          0{i + 1}.
                        </span>
                        {trap}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="pt-5 border-t border-slate-200">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">
                  Checklist de execução
                </h3>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-md">
                  {card.steps.map((step) => (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => onToggleStep(card.id, step.id)}
                      className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-50 transition-colors"
                    >
                      <span
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          step.done
                            ? "bg-[#1E3A5F] border-[#1E3A5F] text-white"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {step.done && <Check className="w-3 h-3" />}
                      </span>
                      <span
                        className={`text-sm ${
                          step.done ? "line-through text-slate-400" : "text-slate-700"
                        }`}
                      >
                        {step.label}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            </>
          )}

          {activeTab === "flashcards" && (
            <div className="space-y-4">
              {card.flashcards.length === 0 ? (
                <div className="border border-dashed border-slate-300 rounded-md p-8 text-center">
                  <p className="text-sm text-slate-600">
                    Este item ainda não possui flashcards de revisão ativa.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("fonte")}
                    className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#1E3A5F] rounded-md hover:bg-[#162D4A]"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Gerar flashcards a partir da fonte</span>
                  </button>
                </div>
              ) : (
                card.flashcards.map((fc, idx) => {
                  const flipped = !!flippedIds[fc.id];
                  return (
                    <div
                      key={fc.id}
                      className="border border-slate-200 rounded-md bg-white overflow-hidden"
                    >
                      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500">
                        <span className="font-mono tabular-nums">
                          Flashcard {idx + 1} · {fc.articleRef}
                        </span>
                        <button
                          type="button"
                          onClick={() => onToggleFlashcardMastered(card.id, fc.id)}
                          className={`inline-flex items-center gap-1 font-medium ${
                            fc.mastered ? "text-emerald-700" : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{fc.mastered ? "Dominado" : "Marcar domínio"}</span>
                        </button>
                      </div>
                      <div className="p-4">
                        <div className="text-xs font-medium text-slate-500 mb-1">
                          {flipped ? "Resposta / Referência" : "Pergunta de Revisão"}
                        </div>
                        <p className="text-sm font-medium text-slate-900 leading-relaxed">
                          {flipped ? fc.back : fc.front}
                        </p>
                        <button
                          type="button"
                          onClick={() => toggleFlip(fc.id)}
                          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#1E3A5F] hover:underline"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                          <span>{flipped ? "Ver pergunta" : "Revelar resposta"}</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === "questoes" && (
            <div className="space-y-5">
              {card.questions.length === 0 ? (
                <div className="border border-dashed border-slate-300 rounded-md p-8 text-center">
                  <p className="text-sm text-slate-600">
                    Nenhuma questão vinculada a este cartão ainda.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("fonte")}
                    className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#1E3A5F] rounded-md hover:bg-[#162D4A]"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Gerar questões inéditas com IA</span>
                  </button>
                </div>
              ) : (
                card.questions.map((q, qIdx) => {
                  const chosen = selectedAnswers[q.id];
                  const answered = typeof chosen === "number";
                  const letters = ["A", "B", "C", "D"];

                  return (
                    <div
                      key={q.id}
                      className="border border-slate-200 rounded-md p-5 space-y-4 bg-white"
                    >
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <HelpCircle className="w-3.5 h-3.5 text-[#1E3A5F]" />
                          Questão {qIdx + 1}
                        </span>
                        <span className="font-mono">{q.articleRef}</span>
                      </div>
                      <p className="text-sm text-slate-800 leading-relaxed">{q.stem}</p>

                      <div className="space-y-2">
                        {q.options.map((opt, optIdx) => {
                          const isSelected = chosen === optIdx;
                          const isCorrect = q.correctIndex === optIdx;

                          let btnStyle =
                            "border-slate-200 bg-white text-slate-700 hover:bg-slate-50";
                          if (answered) {
                            if (isCorrect) {
                              btnStyle =
                                "border-emerald-600 bg-emerald-50 text-emerald-950 font-medium";
                            } else if (isSelected) {
                              btnStyle = "border-rose-600 bg-rose-50 text-rose-950";
                            } else {
                              btnStyle = "border-slate-200 bg-white text-slate-400";
                            }
                          }

                          return (
                            <button
                              key={optIdx}
                              type="button"
                              onClick={() =>
                                setSelectedAnswers((prev) => ({ ...prev, [q.id]: optIdx }))
                              }
                              className={`w-full text-left px-3.5 py-2.5 text-sm border rounded-md transition-colors flex items-start gap-2.5 ${btnStyle}`}
                            >
                              <span className="font-mono text-xs font-semibold mt-0.5 shrink-0">
                                {letters[optIdx]})
                              </span>
                              <span>{opt}</span>
                            </button>
                          );
                        })}
                      </div>

                      {answered && (
                        <div className="pt-3 border-t border-slate-200 text-xs text-slate-700 leading-relaxed">
                          <span className="font-semibold text-slate-900">
                            {chosen === q.correctIndex
                              ? "Correto — Comentário: "
                              : `Gabarito ${letters[q.correctIndex]} — Comentário: `}
                          </span>
                          {q.explanation}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === "fonte" && (
            <form onSubmit={handleGenerateFromCardSource} className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#1E3A5F]" />
                  <span>Gerar ou enriquecer revisão a partir de fonte</span>
                </h3>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  Cole abaixo o texto da legislação, apostila, bibliografia ou anotação de aula. Se deixar em branco, a Toth ampliará o material usando as referências já cadastradas neste cartão.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nome da fonte (opcional)
                </label>
                <input
                  type="text"
                  value={sourceTitle}
                  onChange={(e) => setSourceTitle(e.target.value)}
                  placeholder={card.sourceTitle || "Ex.: Apostila, Lei ou Capítulo de Referência"}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Texto da fonte
                </label>
                <textarea
                  rows={7}
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  placeholder="Cole o conteúdo da fonte para transformar em resumo estruturado, pontos críticos, flashcards e questões inéditas..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                />
              </div>

              {genError && (
                <div className="p-3 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-md">
                  {genError}
                </div>
              )}

              <button
                type="submit"
                disabled={isGenerating}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#1E3A5F] rounded-md hover:bg-[#162D4A] disabled:opacity-60 transition-colors"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Gerando resumo, flashcards e questões...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Gerar material de revisão para este cartão</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
