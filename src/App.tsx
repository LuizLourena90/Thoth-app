import React, { useEffect, useMemo, useState } from "react";
import { Sparkles, Trash2 } from "lucide-react";
import { B2BAdminView } from "./components/B2BAdminView";
import { CardDetailDrawer } from "./components/CardDetailDrawer";
import { KanbanBoard } from "./components/KanbanBoard";
import { RevisionCenterView } from "./components/RevisionCenterView";
import { Sidebar } from "./components/Sidebar";
import { SourceOrganizerView } from "./components/SourceOrganizerView";
import { STUDY_STAGES } from "./data/kanbanConfig";
import {
  createOabDemoCards,
  createOabDemoCohorts,
  OAB_DEMO_TRACK,
} from "./data/oabDemoExample";
import type {
  CohortInfo,
  EditalCard,
  ExamQuestion,
  ExamTrack,
  Flashcard,
  IncidenceLevel,
  StudyStageId,
  WorkspaceTab,
} from "./types";

const STORAGE_CARDS_KEY = "toth_clean_cards_v1";
const STORAGE_TRACKS_KEY = "toth_clean_tracks_v1";
const STORAGE_COHORTS_KEY = "toth_clean_cohorts_v1";
const STORAGE_INST_KEY = "toth_clean_inst_v1";

function loadStoredArray<T>(key: string): T[] {
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed as T[];
      }
    }
  } catch {
    // Return empty array on invalid storage
  }
  return [];
}

function loadStoredInstitution(): string {
  try {
    const saved = localStorage.getItem(STORAGE_INST_KEY);
    if (saved && saved.trim().length > 0) {
      return saved;
    }
  } catch {
    // Fallback
  }
  return "Minha Instituição";
}

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("kanban");
  const [institutionName, setInstitutionName] = useState<string>(loadStoredInstitution);
  const [tracks, setTracks] = useState<ExamTrack[]>(() =>
    loadStoredArray<ExamTrack>(STORAGE_TRACKS_KEY)
  );
  const [cards, setCards] = useState<EditalCard[]>(() =>
    loadStoredArray<EditalCard>(STORAGE_CARDS_KEY)
  );
  const [cohorts, setCohorts] = useState<CohortInfo[]>(() =>
    loadStoredArray<CohortInfo>(STORAGE_COHORTS_KEY)
  );
  const [activeTrackId, setActiveTrackId] = useState<string | null>(() => {
    const initialTracks = loadStoredArray<ExamTrack>(STORAGE_TRACKS_KEY);
    return initialTracks[0]?.id ?? null;
  });
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CARDS_KEY, JSON.stringify(cards));
    } catch {
      // Ignore quota errors
    }
  }, [cards]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_TRACKS_KEY, JSON.stringify(tracks));
    } catch {
      // Ignore quota errors
    }
  }, [tracks]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_COHORTS_KEY, JSON.stringify(cohorts));
    } catch {
      // Ignore quota errors
    }
  }, [cohorts]);

  useEffect(() => {
    try {
      if (institutionName.trim().length > 0) {
        localStorage.setItem(STORAGE_INST_KEY, institutionName);
      } else {
        localStorage.removeItem(STORAGE_INST_KEY);
      }
    } catch {
      // Ignore quota errors
    }
  }, [institutionName]);

  const displayInstitutionName = institutionName.trim() || "Minha Instituição";

  const showNotice = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => {
      setNotice((curr) => (curr === msg ? null : curr));
    }, 4500);
  };

  const activeTrack = useMemo(
    () => tracks.find((t) => t.id === activeTrackId) ?? null,
    [tracks, activeTrackId]
  );

  const trackCards = useMemo(() => {
    if (!activeTrackId) return cards;
    return cards.filter((c) => c.trackId === activeTrackId);
  }, [cards, activeTrackId]);

  const cardCountByTrack = useMemo(() => {
    const map: Record<string, number> = {};
    for (const track of tracks) {
      map[track.id] = cards.filter((c) => c.trackId === track.id).length;
    }
    return map;
  }, [tracks, cards]);

  const revisionReadyCount = useMemo(
    () =>
      trackCards.filter(
        (c) =>
          c.stage === "resumo" ||
          c.stage === "exercicios" ||
          c.stage === "revisao"
      ).length,
    [trackCards]
  );

  const totalStudents = useMemo(
    () => cohorts.reduce((acc, c) => acc + c.enrolledStudents, 0),
    [cohorts]
  );

  const selectedCard = useMemo(
    () => cards.find((c) => c.id === selectedCardId) ?? null,
    [cards, selectedCardId]
  );

  const ensureTrackExists = (preferredTitle?: string): string => {
    if (activeTrackId && tracks.some((t) => t.id === activeTrackId)) {
      return activeTrackId;
    }
    const newTrack: ExamTrack = {
      id: `plano-${Date.now()}`,
      title: preferredTitle || "Meu Plano de Estudos",
      subtitle: "Organização de edital e revisão",
      banca: "Geral",
      targetDate: "A definir",
    };
    setTracks((prev) => [newTrack, ...prev]);
    setActiveTrackId(newTrack.id);
    return newTrack.id;
  };

  const handleCreateTrack = (input: {
    title: string;
    banca: string;
    targetDate: string;
  }) => {
    const newTrack: ExamTrack = {
      id: `plano-${Date.now()}`,
      title: input.title,
      subtitle: "Plano de estudos Kanban",
      banca: input.banca,
      targetDate: input.targetDate,
    };
    setTracks((prev) => [newTrack, ...prev]);
    setActiveTrackId(newTrack.id);
    setSelectedCardId(null);
    showNotice(`Plano "${input.title}" criado.`);
  };

  const handleMoveCard = (cardId: string, nextStage: StudyStageId) => {
    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId ? { ...c, stage: nextStage, updatedAt: "Agora" } : c
      )
    );
  };

  const handleDeleteCard = (cardId: string) => {
    setCards((prev) => prev.filter((c) => c.id !== cardId));
    showNotice("Tópico removido do Kanban.");
  };

  const handleToggleStep = (cardId: string, stepId: string) => {
    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId
          ? {
              ...c,
              steps: c.steps.map((s) =>
                s.id === stepId ? { ...s, done: !s.done } : s
              ),
              updatedAt: "Agora",
            }
          : c
      )
    );
  };

  const handleToggleFlashcardMastered = (cardId: string, flashcardId: string) => {
    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId
          ? {
              ...c,
              flashcards: c.flashcards.map((fc) =>
                fc.id === flashcardId ? { ...fc, mastered: !fc.mastered } : fc
              ),
            }
          : c
      )
    );
  };

  const handleAddManualCard = (input: {
    discipline: string;
    topic: string;
    normativeRefs: string;
    incidence: IncidenceLevel;
    stage: StudyStageId;
  }) => {
    const trackId = ensureTrackExists();
    const newCard: EditalCard = {
      id: `card-manual-${Date.now()}`,
      trackId,
      discipline: input.discipline,
      topic: input.topic,
      normativeRefs: input.normativeRefs,
      incidence: input.incidence,
      examWeightQuestions: input.incidence === "Alta" ? 8 : input.incidence === "Média" ? 5 : 3,
      stage: input.stage,
      estimatedMinutes: 45,
      summary:
        "Tópico adicionado ao plano de estudos. Utilize a aba 'Gerar de Fonte IA' dentro deste cartão para produzir resumo estruturado, pontos críticos, flashcards e questões a partir do seu material-base.",
      examTraps: [],
      steps: [
        { id: `s-${Date.now()}-1`, label: "Leitura da fonte base", done: false },
        { id: `s-${Date.now()}-2`, label: "Elaborar resumo e flashcards", done: false },
        { id: `s-${Date.now()}-3`, label: "Resolver bateria de exercícios", done: false },
      ],
      flashcards: [],
      questions: [],
      updatedAt: "Agora",
    };

    setCards((prev) => [newCard, ...prev]);
    showNotice(`Tópico "${input.topic}" adicionado ao Kanban.`);
  };

  const handleAddParsedCards = (newCards: EditalCard[], customPlanTitle?: string) => {
    const resolvedTrackId = ensureTrackExists(customPlanTitle);
    const normalizedCards = newCards.map((c) => ({
      ...c,
      trackId: activeTrackId ?? resolvedTrackId,
    }));
    setCards((prev) => [...normalizedCards, ...prev]);
    showNotice(
      `${normalizedCards.length} ${
        normalizedCards.length === 1 ? "cartão adicionado" : "cartões adicionados"
      } ao Kanban.`
    );
  };

  const handleEnrichCardWithRevision = (
    cardId: string,
    payload: {
      summary: string;
      normativeRefs: string;
      examTraps: string[];
      flashcards: Flashcard[];
      questions: ExamQuestion[];
      sourceTitle: string;
    }
  ) => {
    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId
          ? {
              ...c,
              summary: payload.summary,
              normativeRefs: payload.normativeRefs,
              examTraps: payload.examTraps,
              flashcards: payload.flashcards,
              questions: payload.questions,
              sourceTitle: payload.sourceTitle,
              stage: c.stage === "edital" || c.stage === "estudo" ? "resumo" : c.stage,
              updatedAt: "Agora",
            }
          : c
      )
    );
    showNotice("Material de revisão e questões vinculados ao cartão.");
  };

  const handleToggleCohortTrack = (cohortId: string, trackId: string) => {
    setCohorts((prev) =>
      prev.map((cohort) => {
        if (cohort.id !== cohortId) return cohort;
        const exists = cohort.publishedTrackIds.includes(trackId);
        return {
          ...cohort,
          publishedTrackIds: exists
            ? cohort.publishedTrackIds.filter((id) => id !== trackId)
            : [...cohort.publishedTrackIds, trackId],
        };
      })
    );
  };

  const handleAddCohort = (input: {
    name: string;
    semester: string;
    enrolledStudents: number;
    coordinatorNotes: string;
  }) => {
    const newCohort: CohortInfo = {
      id: `turma-${Date.now()}`,
      name: input.name,
      semester: input.semester,
      enrolledStudents: input.enrolledStudents,
      activeWeeklyRate: 0,
      averageAccuracy: 0,
      publishedTrackIds: activeTrackId ? [activeTrackId] : [],
      coordinatorNotes: input.coordinatorNotes,
    };
    setCohorts((prev) => [...prev, newCohort]);
    showNotice(`Turma "${input.name}" cadastrada.`);
  };

  const handleExportTrack = () => {
    if (trackCards.length === 0) return;
    const trackTitle = activeTrack?.title ?? "Plano de Estudos Toth";
    const lines: string[] = [
      `# ${trackTitle}`,
      `Instituição: ${displayInstitutionName}`,
      "",
    ];

    for (const stage of STUDY_STAGES) {
      const stageCards = trackCards.filter((c) => c.stage === stage.id);
      if (stageCards.length === 0) continue;
      lines.push(`## Etapa: ${stage.title} (${stageCards.length} tópicos)`);
      lines.push("");

      for (const card of stageCards) {
        lines.push(`### [${card.discipline}] ${card.topic}`);
        lines.push(`- Referências: ${card.normativeRefs}`);
        lines.push(`- Prioridade: ${card.incidence}`);
        lines.push("");
        lines.push(card.summary);
        lines.push("");
        if (card.examTraps.length > 0) {
          lines.push(`**Pontos críticos e pegadinhas:**`);
          card.examTraps.forEach((t) => lines.push(`- ${t}`));
          lines.push("");
        }
        if (card.flashcards.length > 0) {
          lines.push(`**Flashcards:**`);
          card.flashcards.forEach((fc) =>
            lines.push(`- P: ${fc.front} | R: ${fc.back} (${fc.articleRef})`)
          );
          lines.push("");
        }
      }
    }

    const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeTrack?.id ?? "plano-toth"}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotice("Caderno organizado do edital exportado em Markdown.");
  };

  const handleLoadOabDemo = (stayOnCurrentTab = false) => {
    const demoCards = createOabDemoCards(OAB_DEMO_TRACK.id);
    const demoCohorts = createOabDemoCohorts(OAB_DEMO_TRACK.id);
    const demoCohortIds = new Set(demoCohorts.map((c) => c.id));

    setTracks((prev) => {
      const exists = prev.some((t) => t.id === OAB_DEMO_TRACK.id);
      return exists ? prev : [OAB_DEMO_TRACK, ...prev];
    });
    setCards((prev) => [
      ...demoCards,
      ...prev.filter((c) => c.trackId !== OAB_DEMO_TRACK.id),
    ]);
    setCohorts((prev) => [
      ...demoCohorts,
      ...prev.filter((c) => !demoCohortIds.has(c.id)),
    ]);
    setActiveTrackId(OAB_DEMO_TRACK.id);
    setSelectedCardId(null);
    if (!stayOnCurrentTab) {
      setActiveTab("kanban");
    }
    showNotice("Exemplo OAB carregado com 5 tópicos reais e 2 turmas de demonstração.");
  };

  const handleClearWorkspace = () => {
    localStorage.removeItem(STORAGE_CARDS_KEY);
    localStorage.removeItem(STORAGE_TRACKS_KEY);
    localStorage.removeItem(STORAGE_COHORTS_KEY);
    localStorage.removeItem(STORAGE_INST_KEY);
    setCards([]);
    setTracks([]);
    setCohorts([]);
    setInstitutionName("Minha Instituição");
    setActiveTrackId(null);
    setSelectedCardId(null);
    showNotice("Tudo limpo. Quadro pronto para começar do zero.");
  };

  const tabTitleMap: Record<WorkspaceTab, string> = {
    kanban: "Kanban do Edital",
    sources: "Importar Edital & Fontes IA",
    revision: "Central de Revisão Ativa",
    coordination: "Coordenação B2B & Turmas",
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F7F8FA] text-slate-900">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        institutionName={institutionName}
        onUpdateInstitutionName={setInstitutionName}
        tracks={tracks}
        activeTrackId={activeTrackId}
        onSelectTrack={(id) => {
          setActiveTrackId(id);
          setSelectedCardId(null);
        }}
        onCreateTrack={handleCreateTrack}
        onExportTrack={handleExportTrack}
        onLoadOabDemo={() => handleLoadOabDemo(false)}
        onClearAll={handleClearWorkspace}
        cardCountByTrack={cardCountByTrack}
        revisionReadyCount={revisionReadyCount}
        totalStudents={totalStudents}
        hasActiveTrackCards={trackCards.length > 0}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Contextual Workspace Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs text-slate-500 flex items-center gap-1.5 truncate">
              <span>{displayInstitutionName}</span>
              <span aria-hidden="true">/</span>
              <span className="truncate">{activeTrack?.title ?? "Novo Plano"}</span>
              <span aria-hidden="true">/</span>
              <span className="font-medium text-slate-800">{tabTitleMap[activeTab]}</span>
            </div>
            <h1 className="mt-1 font-editorial text-2xl font-semibold text-slate-900 truncate">
              {activeTrack?.title ?? "Plano de Estudos Kanban"}
            </h1>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {(cards.length > 0 || tracks.length > 0 || cohorts.length > 0) && (
              <button
                type="button"
                onClick={handleClearWorkspace}
                title="Limpar planos e cartões"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpar quadro</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab("sources")}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1E3A5F] rounded-md hover:bg-[#162D4A] transition-colors whitespace-nowrap shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Importar Edital ou Criar Plano</span>
            </button>
          </div>
        </header>

        {/* Live Feedback Banner */}
        {notice && (
          <div className="mx-6 mt-4 px-4 py-2.5 text-xs font-medium text-[#1E3A5F] bg-white border border-slate-300 rounded-md flex items-center justify-between">
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="text-slate-500 hover:text-slate-800"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Main Viewport */}
        <main className="flex-1 p-6">
          {activeTab === "kanban" && (
            <KanbanBoard
              cards={trackCards}
              onMoveCard={handleMoveCard}
              onSelectCard={(card) => setSelectedCardId(card.id)}
              onAddManualCard={handleAddManualCard}
              onOpenSourcesGenerator={() => setActiveTab("sources")}
            />
          )}

          {activeTab === "sources" && (
            <SourceOrganizerView
              activeTrackId={activeTrackId}
              activeTrackTitle={activeTrack?.title ?? null}
              existingCards={trackCards}
              onAddParsedCards={handleAddParsedCards}
              onAttachRevisionToCard={handleEnrichCardWithRevision}
              onGoToKanban={() => setActiveTab("kanban")}
            />
          )}

          {activeTab === "revision" && (
            <RevisionCenterView
              cards={trackCards}
              onToggleFlashcardMastered={handleToggleFlashcardMastered}
              onMoveCardStage={handleMoveCard}
              onOpenCard={(card) => setSelectedCardId(card.id)}
              onOpenSourcesGenerator={() => setActiveTab("sources")}
            />
          )}

          {activeTab === "coordination" && (
            <B2BAdminView
              cohorts={cohorts}
              tracks={tracks}
              activeTrackId={activeTrackId}
              cards={trackCards}
              onToggleCohortTrack={handleToggleCohortTrack}
              onAddCohort={handleAddCohort}
              onExportPack={handleExportTrack}
              onLoadOabDemo={() => handleLoadOabDemo(true)}
            />
          )}
        </main>
      </div>

      {/* Card Inspection & Active Study Drawer */}
      <CardDetailDrawer
        card={selectedCard}
        onClose={() => setSelectedCardId(null)}
        onMoveStage={handleMoveCard}
        onDeleteCard={handleDeleteCard}
        onToggleStep={handleToggleStep}
        onToggleFlashcardMastered={handleToggleFlashcardMastered}
        onEnrichCardWithRevision={handleEnrichCardWithRevision}
      />
    </div>
  );
}
