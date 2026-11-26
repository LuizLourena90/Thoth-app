import React, { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckSquare,
  Columns3,
  HelpCircle,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import { STUDY_STAGES } from "../data/kanbanConfig";
import { getDisciplineBadgeClasses } from "../utils/disciplineColors";
import type { EditalCard, IncidenceLevel, StudyStageId } from "../types";

interface KanbanBoardProps {
  cards: EditalCard[];
  onMoveCard: (cardId: string, nextStage: StudyStageId) => void;
  onSelectCard: (card: EditalCard) => void;
  onAddManualCard: (input: {
    discipline: string;
    topic: string;
    normativeRefs: string;
    incidence: IncidenceLevel;
    stage: StudyStageId;
  }) => void;
  onOpenSourcesGenerator: () => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  cards,
  onMoveCard,
  onSelectCard,
  onAddManualCard,
  onOpenSourcesGenerator,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>("Todas");
  const [selectedIncidence, setSelectedIncidence] = useState<string>("Todas");
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<StudyStageId | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);

  const [newDiscipline, setNewDiscipline] = useState("");
  const [newTopic, setNewTopic] = useState("");
  const [newRefs, setNewRefs] = useState("");
  const [newIncidence, setNewIncidence] = useState<IncidenceLevel>("Alta");
  const [newStage, setNewStage] = useState<StudyStageId>("edital");

  const filteredCards = cards.filter((card) => {
    const matchesSearch =
      searchQuery.trim() === "" ||
      card.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.normativeRefs.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.discipline.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDiscipline =
      selectedDiscipline === "Todas" || card.discipline === selectedDiscipline;
    const matchesIncidence =
      selectedIncidence === "Todas" || card.incidence === selectedIncidence;
    return matchesSearch && matchesDiscipline && matchesIncidence;
  });

  const totalFlashcards = cards.reduce((acc, c) => acc + c.flashcards.length, 0);
  const totalQuestions = cards.reduce((acc, c) => acc + c.questions.length, 0);
  const revisionCount = cards.filter((c) => c.stage === "revisao").length;
  const completionPct = cards.length
    ? Math.round((revisionCount / cards.length) * 100)
    : 0;

  const availableDisciplines = Array.from(new Set(cards.map((c) => c.discipline)));

  const handleDrop = (stageId: StudyStageId) => {
    if (draggedCardId) {
      onMoveCard(draggedCardId, stageId);
    }
    setDraggedCardId(null);
    setDragOverStage(null);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopic.trim()) return;
    onAddManualCard({
      discipline: newDiscipline.trim() || "Matéria Geral",
      topic: newTopic.trim(),
      normativeRefs: newRefs.trim() || "Referências a definir",
      incidence: newIncidence,
      stage: newStage,
    });
    setNewDiscipline("");
    setNewTopic("");
    setNewRefs("");
    setNewStage("edital");
    setShowNewForm(false);
  };

  const getPrevStage = (current: StudyStageId): StudyStageId | null => {
    const idx = STUDY_STAGES.findIndex((s) => s.id === current);
    if (idx <= 0) return null;
    return STUDY_STAGES[idx - 1].id;
  };

  const getNextStage = (current: StudyStageId): StudyStageId | null => {
    const idx = STUDY_STAGES.findIndex((s) => s.id === current);
    if (idx === -1 || idx >= STUDY_STAGES.length - 1) return null;
    return STUDY_STAGES[idx + 1].id;
  };

  return (
    <div className="space-y-5">
      {/* Live Study Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-lg divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        <div className="px-5 py-4">
          <div className="text-xs font-medium text-slate-500">Itens do edital</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
              {cards.length}
            </span>
            <span className="text-xs text-slate-500">tópicos mapeados</span>
          </div>
        </div>
        <div className="px-5 py-4">
          <div className="text-xs font-medium text-slate-500">Em revisão programada</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-semibold text-[#1E3A5F] tabular-nums">
              {revisionCount}
            </span>
            <span className="font-mono text-xs text-slate-500 tabular-nums">
              ({completionPct}% do edital)
            </span>
          </div>
        </div>
        <div className="px-5 py-4">
          <div className="text-xs font-medium text-slate-500">Flashcards gerados</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
              {totalFlashcards}
            </span>
            <span className="text-xs text-slate-500">cards de retenção</span>
          </div>
        </div>
        <div className="px-5 py-4">
          <div className="text-xs font-medium text-slate-500">Exercícios comentados</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
              {totalQuestions}
            </span>
            <span className="text-xs text-slate-500">questões no plano</span>
          </div>
        </div>
      </div>

      {/* Filter & Actions Toolbar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar matéria, tópico ou referência..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:bg-white transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
              {(["Todas", "Alta", "Média", "Base"] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setSelectedIncidence(level)}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                    selectedIncidence === level
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {level === "Todas" ? "Todas prioridades" : `Prioridade ${level}`}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowNewForm((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Novo tópico</span>
            </button>

            <button
              type="button"
              onClick={onOpenSourcesGenerator}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#1E3A5F] rounded-md hover:bg-[#162D4A] transition-colors whitespace-nowrap shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Importar Edital ou Criar Plano</span>
            </button>
          </div>
        </div>

        {/* Discipline Filter Segmented Row (only when subjects exist) */}
        {availableDisciplines.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 kanban-scroll border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => setSelectedDiscipline("Todas")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                selectedDiscipline === "Todas"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              Todas as matérias ({cards.length})
            </button>
            {availableDisciplines.map((disc) => {
              const count = cards.filter((c) => c.discipline === disc).length;
              const active = selectedDiscipline === disc;
              return (
                <button
                  key={disc}
                  type="button"
                  onClick={() => setSelectedDiscipline(disc)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {disc} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Inline Manual Card Creation Form */}
        {showNewForm && (
          <form
            onSubmit={handleCreateSubmit}
            className="pt-3 border-t border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
          >
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Matéria / Disciplina
              </label>
              <input
                type="text"
                value={newDiscipline}
                onChange={(e) => setNewDiscipline(e.target.value)}
                placeholder="Ex.: Direito Civil, Português, Biologia..."
                required
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Tópico do edital
              </label>
              <input
                type="text"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                placeholder="Ex.: Contratos e Obrigações"
                required
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Referência / Fonte
              </label>
              <input
                type="text"
                value={newRefs}
                onChange={(e) => setNewRefs(e.target.value)}
                placeholder="Ex.: Cap. 3 · Art. 421"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Coluna inicial
              </label>
              <select
                value={newStage}
                onChange={(e) => setNewStage(e.target.value as StudyStageId)}
                className="w-full px-2.5 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
              >
                {STUDY_STAGES.map((st, idx) => (
                  <option key={st.id} value={st.id}>
                    0{idx + 1}. {st.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 flex items-center gap-2">
              <select
                value={newIncidence}
                onChange={(e) => setNewIncidence(e.target.value as IncidenceLevel)}
                aria-label="Prioridade"
                className="w-full px-2.5 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
              >
                <option value="Alta">Alta</option>
                <option value="Média">Média</option>
                <option value="Base">Base</option>
              </select>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-[#1E3A5F] rounded-md hover:bg-[#162D4A] whitespace-nowrap shrink-0"
              >
                Adicionar
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Prominent Clean Empty State when there are 0 cards */}
      {cards.length === 0 && !showNewForm && (
        <div className="bg-white border border-slate-200 rounded-lg px-6 py-10 text-center space-y-4">
          <div className="w-11 h-11 rounded-lg bg-slate-100 text-[#1E3A5F] flex items-center justify-center mx-auto">
            <Columns3 className="w-5 h-5" />
          </div>
          <div className="max-w-lg mx-auto space-y-1.5">
            <h2 className="font-editorial text-xl font-semibold text-slate-900">
              Seu quadro Kanban está limpo e pronto para começar
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Importe o texto de um edital para gerar matérias, resumos e revisões automaticamente, ou adicione tópicos manualmente e mova os cartões livremente entre as etapas.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={onOpenSourcesGenerator}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#1E3A5F] rounded-md hover:bg-[#162D4A] transition-colors whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4" />
              <span>Importar Edital ou Criar Plano</span>
            </button>
            <button
              type="button"
              onClick={() => setShowNewForm(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>+ Novo tópico</span>
            </button>
          </div>
        </div>
      )}

      {/* 5-Column Kanban Board */}
      <div className="overflow-x-auto pb-4 kanban-scroll">
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4 min-w-[1120px] xl:min-w-0">
          {STUDY_STAGES.map((stage, stageIdx) => {
            const stageCards = filteredCards.filter((c) => c.stage === stage.id);
            const isDropTarget = dragOverStage === stage.id;

            return (
              <section
                key={stage.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverStage(stage.id);
                }}
                onDragLeave={() => setDragOverStage(null)}
                onDrop={() => handleDrop(stage.id)}
                className={`flex flex-col rounded-lg border transition-colors min-h-[420px] ${
                  isDropTarget
                    ? "bg-slate-100 border-[#1E3A5F]"
                    : "bg-[#F1F4F8] border-slate-200"
                }`}
              >
                {/* Column Header */}
                <div className="px-4 py-3.5 border-b border-slate-200 bg-white rounded-t-lg">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900 truncate">
                      {String(stageIdx + 1).padStart(2, "0")}. {stage.title}
                    </h3>
                    <span className="font-mono text-xs font-semibold text-slate-600 tabular-nums shrink-0">
                      {stageCards.length}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500 truncate">{stage.subtitle}</p>
                </div>

                {/* Cards Stack */}
                <div className="p-3 space-y-3 flex-1">
                  {stageCards.length === 0 ? (
                    <div className="h-32 border border-dashed border-slate-300 rounded-md flex items-center justify-center p-4 text-center">
                      <span className="text-xs text-slate-500">
                        {cards.length === 0
                          ? "Coluna vazia"
                          : "Arraste um cartão para esta etapa"}
                      </span>
                    </div>
                  ) : (
                    stageCards.map((card) => {
                      const doneSteps = card.steps.filter((s) => s.done).length;
                      const prevStage = getPrevStage(card.stage);
                      const nextStage = getNextStage(card.stage);

                      return (
                        <article
                          key={card.id}
                          draggable
                          onDragStart={() => setDraggedCardId(card.id)}
                          onDragEnd={() => {
                            setDraggedCardId(null);
                            setDragOverStage(null);
                          }}
                          className={`group bg-white border border-slate-200 rounded-md p-3.5 hover:border-slate-400 transition-colors cursor-pointer ${
                            draggedCardId === card.id ? "opacity-50" : "opacity-100"
                          }`}
                          onClick={() => onSelectCard(card)}
                        >
                          {/* Discipline Colored Tag & Incidence */}
                          <div className="flex items-center justify-between gap-2 text-[11px]">
                            <span
                              className={getDisciplineBadgeClasses(card.discipline)}
                              title={card.discipline}
                            >
                              {card.discipline}
                            </span>
                            <span
                              className={`font-mono shrink-0 ${
                                card.incidence === "Alta"
                                  ? "text-[#9F1239] font-semibold"
                                  : "text-slate-500"
                              }`}
                            >
                              {card.incidence === "Alta"
                                ? "Alta prioridade"
                                : card.incidence === "Média"
                                ? "Média"
                                : "Base"}
                            </span>
                          </div>

                          {/* Card Subtopic Title */}
                          <h4 className="mt-2 text-sm font-semibold text-slate-900 leading-snug group-hover:text-[#1E3A5F] transition-colors">
                            {card.topic}
                          </h4>

                          {/* Normative Reference */}
                          <div className="mt-1.5 font-mono text-[11px] text-slate-500 truncate">
                            {card.normativeRefs}
                          </div>

                          {/* Footer Metrics & Bidirectional Stage Movement */}
                          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px] text-slate-500 font-mono tabular-nums">
                            <div className="flex items-center gap-2.5 truncate">
                              <span
                                className="inline-flex items-center gap-1"
                                title="Etapas concluídas"
                              >
                                <CheckSquare className="w-3 h-3 text-slate-400" />
                                {doneSteps}/{card.steps.length}
                              </span>
                              <span
                                className="inline-flex items-center gap-1"
                                title="Flashcards disponíveis"
                              >
                                <BookOpen className="w-3 h-3 text-slate-400" />
                                {card.flashcards.length}
                              </span>
                              <span
                                className="inline-flex items-center gap-1"
                                title="Questões"
                              >
                                <HelpCircle className="w-3 h-3 text-slate-400" />
                                {card.questions.length}
                              </span>
                            </div>

                            <div className="flex items-center gap-0.5 shrink-0">
                              {prevStage && (
                                <button
                                  type="button"
                                  title="Mover para etapa anterior"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onMoveCard(card.id, prevStage);
                                  }}
                                  className="p-1 text-slate-400 hover:text-[#1E3A5F] hover:bg-slate-100 rounded transition-colors"
                                >
                                  <ArrowLeft className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {nextStage && (
                                <button
                                  type="button"
                                  title="Avançar para próxima etapa"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onMoveCard(card.id, nextStage);
                                  }}
                                  className="p-1 text-slate-400 hover:text-[#1E3A5F] hover:bg-slate-100 rounded transition-colors"
                                >
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
};
