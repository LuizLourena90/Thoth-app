import React, { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  RotateCw,
  Sparkles,
} from "lucide-react";
import type { EditalCard, StudyStageId } from "../types";

interface RevisionCenterViewProps {
  cards: EditalCard[];
  onToggleFlashcardMastered: (cardId: string, flashcardId: string) => void;
  onMoveCardStage: (cardId: string, nextStage: StudyStageId) => void;
  onOpenCard: (card: EditalCard) => void;
  onOpenSourcesGenerator: () => void;
  onRecordQuizAttempt?: (questionId: string, isCorrect: boolean) => void;
}

export const RevisionCenterView: React.FC<RevisionCenterViewProps> = ({
  cards,
  onToggleFlashcardMastered,
  onMoveCardStage,
  onOpenCard,
  onOpenSourcesGenerator,
  onRecordQuizAttempt,
}) => {
  const [sessionMode, setSessionMode] = useState<"flashcards" | "quiz">("flashcards");
  const [disciplineFilter, setDisciplineFilter] = useState<string>("Todas");
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});

  const filteredCards = cards.filter(
    (c) => disciplineFilter === "Todas" || c.discipline === disciplineFilter
  );

  const allFlashcards = filteredCards.flatMap((card) =>
    card.flashcards.map((fc) => ({
      card,
      flashcard: fc,
    }))
  );

  const allQuestions = filteredCards.flatMap((card) =>
    card.questions.map((q) => ({
      card,
      question: q,
    }))
  );

  const masteredCount = allFlashcards.filter((item) => item.flashcard.mastered).length;
  const answeredCount = Object.keys(selectedAnswers).length;
  const correctCount = allQuestions.filter(
    (item) => selectedAnswers[item.question.id] === item.question.correctIndex
  ).length;

  const currentFcItem =
    allFlashcards.length > 0
      ? allFlashcards[Math.min(cardIndex, allFlashcards.length - 1)]
      : null;

  const currentQuizItem =
    allQuestions.length > 0
      ? allQuestions[Math.min(quizIndex, allQuestions.length - 1)]
      : null;

  const availableDisciplines = Array.from(new Set(cards.map((c) => c.discipline)));
  const letters = ["A", "B", "C", "D"];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header & Session Controls */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-editorial text-xl font-semibold text-slate-900">
            Central de Revisão Ativa
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Consolide a retenção dos tópicos do edital com flashcards e simulados gerados a partir das suas fontes.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md self-start md:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setSessionMode("flashcards")}
            className={`px-3.5 py-2 text-xs font-semibold rounded transition-colors whitespace-nowrap ${
              sessionMode === "flashcards"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Flashcards ({allFlashcards.length})
          </button>
          <button
            type="button"
            onClick={() => setSessionMode("quiz")}
            className={`px-3.5 py-2 text-xs font-semibold rounded transition-colors whitespace-nowrap ${
              sessionMode === "quiz"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Simulado ({allQuestions.length})
          </button>
        </div>
      </div>

      {/* Discipline Filter Bar */}
      {availableDisciplines.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 kanban-scroll">
          <button
            type="button"
            onClick={() => {
              setDisciplineFilter("Todas");
              setCardIndex(0);
              setQuizIndex(0);
              setIsFlipped(false);
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              disciplineFilter === "Todas"
                ? "bg-slate-900 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900"
            }`}
          >
            Todas as matérias
          </button>
          {availableDisciplines.map((disc) => (
            <button
              key={disc}
              type="button"
              onClick={() => {
                setDisciplineFilter(disc);
                setCardIndex(0);
                setQuizIndex(0);
                setIsFlipped(false);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                disciplineFilter === disc
                  ? "bg-slate-900 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900"
              }`}
            >
              {disc}
            </button>
          ))}
        </div>
      )}

      {sessionMode === "flashcards" ? (
        !currentFcItem ? (
          <div className="bg-white border border-slate-200 rounded-lg p-12 text-center space-y-3">
            <BookOpen className="w-7 h-7 text-slate-400 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-900">
              Nenhum flashcard disponível ainda
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Importe um edital ou envie uma fonte de estudo para gerar flashcards de revisão ativa automaticamente.
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={onOpenSourcesGenerator}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1E3A5F] rounded-md hover:bg-[#162D4A]"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Importar Edital ou Criar Plano</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-600 font-mono tabular-nums">
              <span>
                Flashcard {Math.min(cardIndex + 1, allFlashcards.length)} de {allFlashcards.length}
              </span>
              <span>
                Dominados: {masteredCount}/{allFlashcards.length}
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-slate-600">
                  <span className="font-semibold text-[#1E3A5F]">
                    {currentFcItem.card.discipline}
                  </span>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={() => onOpenCard(currentFcItem.card)}
                    className="hover:underline text-slate-700 font-medium"
                  >
                    {currentFcItem.card.topic}
                  </button>
                </div>
                <span className="font-mono text-slate-500">
                  {currentFcItem.flashcard.articleRef}
                </span>
              </div>

              <div className="p-8 min-h-[240px] flex flex-col justify-between">
                <div>
                  <div className="text-xs font-medium text-slate-500 mb-2">
                    {isFlipped ? "Resposta fundamentada" : "Pergunta de retenção ativa"}
                  </div>
                  <p className="font-editorial text-xl text-slate-900 leading-relaxed">
                    {isFlipped
                      ? currentFcItem.flashcard.back
                      : currentFcItem.flashcard.front}
                  </p>
                </div>

                <div className="mt-8 pt-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setIsFlipped((prev) => !prev)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#1E3A5F] rounded-md hover:bg-[#162D4A] transition-colors"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>{isFlipped ? "Mostrar pergunta" : "Revelar resposta"}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        onToggleFlashcardMastered(
                          currentFcItem.card.id,
                          currentFcItem.flashcard.id
                        )
                      }
                      className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border rounded-md transition-colors ${
                        currentFcItem.flashcard.mastered
                          ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        {currentFcItem.flashcard.mastered
                          ? "Tópico dominado"
                          : "Marcar como dominado"}
                      </span>
                    </button>

                    {currentFcItem.card.stage !== "revisao" && (
                      <button
                        type="button"
                        onClick={() =>
                          onMoveCardStage(currentFcItem.card.id, "revisao")
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                      >
                        <span>Mover para Revisão Programada</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                disabled={cardIndex === 0}
                onClick={() => {
                  setCardIndex((i) => Math.max(0, i - 1));
                  setIsFlipped(false);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Anterior</span>
              </button>
              <button
                type="button"
                disabled={cardIndex >= allFlashcards.length - 1}
                onClick={() => {
                  setCardIndex((i) => Math.min(allFlashcards.length - 1, i + 1));
                  setIsFlipped(false);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-40"
              >
                <span>Próximo flashcard</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )
      ) : !currentQuizItem ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center space-y-3">
          <HelpCircle className="w-7 h-7 text-slate-400 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-900">
            Nenhuma questão disponível ainda
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Gere questões inéditas a partir de fontes de estudo em "Edital & Fontes IA".
          </p>
          <div className="pt-1">
            <button
              type="button"
              onClick={onOpenSourcesGenerator}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1E3A5F] rounded-md hover:bg-[#162D4A]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Importar Edital ou Criar Plano</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-600 font-mono tabular-nums">
            <span>
              Questão {Math.min(quizIndex + 1, allQuestions.length)} de {allQuestions.length}
            </span>
            <span>
              Acertos nesta sessão: {correctCount}/{answeredCount}
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#1E3A5F]">
                  {currentQuizItem.card.discipline}
                </span>
                <span aria-hidden="true">·</span>
                <span>{currentQuizItem.card.topic}</span>
              </div>
              <span className="font-mono">{currentQuizItem.question.articleRef}</span>
            </div>

            <p className="text-sm text-slate-900 leading-relaxed font-medium">
              {currentQuizItem.question.stem}
            </p>

            <div className="space-y-2.5">
              {currentQuizItem.question.options.map((opt, optIdx) => {
                const chosen = selectedAnswers[currentQuizItem.question.id];
                const answered = typeof chosen === "number";
                const isSelected = chosen === optIdx;
                const isCorrect = currentQuizItem.question.correctIndex === optIdx;

                let cls = "border-slate-200 bg-white text-slate-700 hover:bg-slate-50";
                if (answered) {
                  if (isCorrect) {
                    cls = "border-emerald-600 bg-emerald-50 text-emerald-950 font-medium";
                  } else if (isSelected) {
                    cls = "border-rose-600 bg-rose-50 text-rose-950";
                  } else {
                    cls = "border-slate-200 bg-white text-slate-400";
                  }
                }

                return (
                  <button
                    key={optIdx}
                    type="button"
                    onClick={() => {
                      const alreadyAnswered =
                        typeof selectedAnswers[currentQuizItem.question.id] === "number";
                      setSelectedAnswers((prev) => ({
                        ...prev,
                        [currentQuizItem.question.id]: optIdx,
                      }));
                      if (!alreadyAnswered && onRecordQuizAttempt) {
                        onRecordQuizAttempt(
                          currentQuizItem.question.id,
                          optIdx === currentQuizItem.question.correctIndex
                        );
                      }
                    }}
                    className={`w-full text-left px-4 py-3 text-sm border rounded-md transition-colors flex items-start gap-3 ${cls}`}
                  >
                    <span className="font-mono text-xs font-semibold mt-0.5 shrink-0">
                      {letters[optIdx]})
                    </span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>

            {typeof selectedAnswers[currentQuizItem.question.id] === "number" && (
              <div className="pt-4 border-t border-slate-200 text-sm text-slate-700 leading-relaxed">
                <span className="font-semibold text-slate-900">
                  {selectedAnswers[currentQuizItem.question.id] ===
                  currentQuizItem.question.correctIndex
                    ? "Resposta correta — Comentário: "
                    : `Gabarito ${
                        letters[currentQuizItem.question.correctIndex]
                      } — Comentário: `}
                </span>
                {currentQuizItem.question.explanation}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              disabled={quizIndex === 0}
              onClick={() => setQuizIndex((i) => Math.max(0, i - 1))}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Questão anterior</span>
            </button>
            <button
              type="button"
              disabled={quizIndex >= allQuestions.length - 1}
              onClick={() => setQuizIndex((i) => Math.min(allQuestions.length - 1, i + 1))}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-40"
            >
              <span>Próxima questão</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
