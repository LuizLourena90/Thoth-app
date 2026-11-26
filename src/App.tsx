import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Eye, Sparkles, Trash2 } from "lucide-react";
import { B2BAdminView } from "./components/B2BAdminView";
import { CardDetailDrawer } from "./components/CardDetailDrawer";
import { KanbanBoard } from "./components/KanbanBoard";
import { PortalSelectionView } from "./components/PortalSelectionView";
import { RevisionCenterView } from "./components/RevisionCenterView";
import { Sidebar } from "./components/Sidebar";
import { SourceOrganizerView } from "./components/SourceOrganizerView";
import { StudentProgressView } from "./components/StudentProgressView";
import { STUDY_STAGES } from "./data/kanbanConfig";
import {
  createOabDemoCards,
  createOabDemoCohorts,
  OAB_DEMO_TRACK,
} from "./data/oabDemoExample";
import { signOutSupabase } from "./lib/supabaseAuth";
import type {
  AuthSession,
  B2BTab,
  B2CTab,
  CohortInfo,
  EditalCard,
  ExamQuestion,
  ExamTrack,
  Flashcard,
  IncidenceLevel,
  StudentGamificationStats,
  StudyStageId,
  WorkspaceTab,
} from "./types";

const B2C_CARDS_KEY = "toth_b2c_cards_v1";
const B2C_TRACKS_KEY = "toth_b2c_tracks_v1";
const B2C_ACTIVITY_KEY = "toth_b2c_activity_v1";

const B2B_CARDS_KEY = "toth_b2b_cards_v1";
const B2B_TRACKS_KEY = "toth_b2b_tracks_v1";
const B2B_COHORTS_KEY = "toth_b2b_cohorts_v1";
const B2B_INST_KEY = "toth_b2b_inst_v1";

interface B2CActivityRecord {
  streakDays: number;
  lastActiveDate: string | null;
  quizzesAnswered: number;
  quizzesCorrect: number;
}

const DEFAULT_ACTIVITY: B2CActivityRecord = {
  streakDays: 0,
  lastActiveDate: null,
  quizzesAnswered: 0,
  quizzesCorrect: 0,
};

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

function loadStoredActivity(): B2CActivityRecord {
  try {
    const saved = localStorage.getItem(B2C_ACTIVITY_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<B2CActivityRecord>;
      return {
        streakDays: Number(parsed.streakDays) || 0,
        lastActiveDate: parsed.lastActiveDate ?? null,
        quizzesAnswered: Number(parsed.quizzesAnswered) || 0,
        quizzesCorrect: Number(parsed.quizzesCorrect) || 0,
      };
    }
  } catch {
    // Fallback
  }
  return DEFAULT_ACTIVITY;
}

function loadStoredInstitution(): string {
  try {
    const saved = localStorage.getItem(B2B_INST_KEY);
    if (saved && saved.trim().length > 0) {
      return saved;
    }
  } catch {
    // Fallback
  }
  return "Minha Instituição";
}

function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function getYesterdayIsoDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function computeGamificationStats(
  cards: EditalCard[],
  activity: B2CActivityRecord
): StudentGamificationStats {
  const stagePoints = cards.reduce((acc, c) => {
    if (c.stage === "revisao") return acc + 80;
    if (c.stage === "exercicios") return acc + 50;
    if (c.stage === "resumo") return acc + 30;
    return acc;
  }, 0);

  const stepPoints = cards.reduce(
    (acc, c) => acc + c.steps.filter((s) => s.done).length * 25,
    0
  );

  const flashcardPoints = cards.reduce(
    (acc, c) => acc + c.flashcards.filter((f) => f.mastered).length * 40,
    0
  );

  const quizPoints =
    activity.quizzesCorrect * 50 +
    Math.max(0, activity.quizzesAnswered - activity.quizzesCorrect) * 15;

  const xp = stagePoints + stepPoints + flashcardPoints + quizPoints;

  let level = 1;
  let levelTitle = "Iniciante";
  let currentLevelFloorXp = 0;
  let nextLevelXp = 200;

  if (xp >= 1800) {
    level = 5 + Math.floor((xp - 1800) / 800);
    levelTitle = "Mestre do Edital";
    currentLevelFloorXp = 1800 + Math.floor((xp - 1800) / 800) * 800;
    nextLevelXp = currentLevelFloorXp + 800;
  } else if (xp >= 1000) {
    level = 4;
    levelTitle = "Estrategista";
    currentLevelFloorXp = 1000;
    nextLevelXp = 1800;
  } else if (xp >= 500) {
    level = 3;
    levelTitle = "Avançado";
    currentLevelFloorXp = 500;
    nextLevelXp = 1000;
  } else if (xp >= 200) {
    level = 2;
    levelTitle = "Constante";
    currentLevelFloorXp = 200;
    nextLevelXp = 500;
  }

  return {
    xp,
    level,
    levelTitle,
    nextLevelXp,
    currentLevelFloorXp,
    streakDays: activity.streakDays,
    quizzesAnswered: activity.quizzesAnswered,
    quizzesCorrect: activity.quizzesCorrect,
  };
}

export default function App() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [b2cTab, setB2cTab] = useState<B2CTab>("kanban");
  const [b2bTab, setB2bTab] = useState<B2BTab>("executive");
  const [b2bEditalSubView, setB2bEditalSubView] = useState<"kanban" | "sources">("kanban");
  const [b2bStudentPreviewMode, setB2bStudentPreviewMode] = useState<"kanban" | "revision">("kanban");

  // Isolated B2C Student State
  const [b2cTracks, setB2cTracks] = useState<ExamTrack[]>(() =>
    loadStoredArray<ExamTrack>(B2C_TRACKS_KEY)
  );
  const [b2cCards, setB2cCards] = useState<EditalCard[]>(() =>
    loadStoredArray<EditalCard>(B2C_CARDS_KEY)
  );
  const [b2cActiveTrackId, setB2cActiveTrackId] = useState<string | null>(() => {
    const initial = loadStoredArray<ExamTrack>(B2C_TRACKS_KEY);
    return initial[0]?.id ?? null;
  });
  const [b2cActivity, setB2cActivity] = useState<B2CActivityRecord>(loadStoredActivity);

  // Isolated B2B Institution State
  const [institutionName, setInstitutionName] = useState<string>(loadStoredInstitution);
  const [b2bTracks, setB2bTracks] = useState<ExamTrack[]>(() =>
    loadStoredArray<ExamTrack>(B2B_TRACKS_KEY)
  );
  const [b2bCards, setB2bCards] = useState<EditalCard[]>(() =>
    loadStoredArray<EditalCard>(B2B_CARDS_KEY)
  );
  const [cohorts, setCohorts] = useState<CohortInfo[]>(() =>
    loadStoredArray<CohortInfo>(B2B_COHORTS_KEY)
  );
  const [b2bActiveTrackId, setB2bActiveTrackId] = useState<string | null>(() => {
    const initial = loadStoredArray<ExamTrack>(B2B_TRACKS_KEY);
    return initial[0]?.id ?? null;
  });

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Persist B2C state
  useEffect(() => {
    try {
      localStorage.setItem(B2C_CARDS_KEY, JSON.stringify(b2cCards));
    } catch {
      // Ignore quota errors
    }
  }, [b2cCards]);

  useEffect(() => {
    try {
      localStorage.setItem(B2C_TRACKS_KEY, JSON.stringify(b2cTracks));
    } catch {
      // Ignore quota errors
    }
  }, [b2cTracks]);

  useEffect(() => {
    try {
      localStorage.setItem(B2C_ACTIVITY_KEY, JSON.stringify(b2cActivity));
    } catch {
      // Ignore quota errors
    }
  }, [b2cActivity]);

  // Persist B2B state
  useEffect(() => {
    try {
      localStorage.setItem(B2B_CARDS_KEY, JSON.stringify(b2bCards));
    } catch {
      // Ignore quota errors
    }
  }, [b2bCards]);

  useEffect(() => {
    try {
      localStorage.setItem(B2B_TRACKS_KEY, JSON.stringify(b2bTracks));
    } catch {
      // Ignore quota errors
    }
  }, [b2bTracks]);

  useEffect(() => {
    try {
      localStorage.setItem(B2B_COHORTS_KEY, JSON.stringify(cohorts));
    } catch {
      // Ignore quota errors
    }
  }, [cohorts]);

  useEffect(() => {
    try {
      if (institutionName.trim().length > 0) {
        localStorage.setItem(B2B_INST_KEY, institutionName);
      } else {
        localStorage.removeItem(B2B_INST_KEY);
      }
    } catch {
      // Ignore quota errors
    }
  }, [institutionName]);

  const showNotice = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => {
      setNotice((curr) => (curr === msg ? null : curr));
    }, 4500);
  };

  const recordB2CStudyTouch = () => {
    const today = getTodayIsoDate();
    const yesterday = getYesterdayIsoDate();
    setB2cActivity((prev) => {
      if (prev.lastActiveDate === today) return prev;
      const nextStreak =
        prev.lastActiveDate === yesterday ? prev.streakDays + 1 : Math.max(1, prev.streakDays === 0 ? 1 : 1);
      return {
        ...prev,
        streakDays: nextStreak,
        lastActiveDate: today,
      };
    });
  };

  const handleRecordQuizAttempt = (_questionId: string, isCorrect: boolean) => {
    const today = getTodayIsoDate();
    const yesterday = getYesterdayIsoDate();
    setB2cActivity((prev) => {
      const nextStreak =
        prev.lastActiveDate === today
          ? prev.streakDays
          : prev.lastActiveDate === yesterday
            ? prev.streakDays + 1
            : 1;
      return {
        streakDays: nextStreak,
        lastActiveDate: today,
        quizzesAnswered: prev.quizzesAnswered + 1,
        quizzesCorrect: prev.quizzesCorrect + (isCorrect ? 1 : 0),
      };
    });
  };

  const gamificationStats = useMemo(
    () => computeGamificationStats(b2cCards, b2cActivity),
    [b2cCards, b2cActivity]
  );

  // Active environment bindings
  const environment = session?.environment ?? "b2c";
  const tracks = environment === "b2c" ? b2cTracks : b2bTracks;
  const setTracks = environment === "b2c" ? setB2cTracks : setB2bTracks;
  const cards = environment === "b2c" ? b2cCards : b2bCards;
  const setCards = environment === "b2c" ? setB2cCards : setB2bCards;
  const activeTrackId = environment === "b2c" ? b2cActiveTrackId : b2bActiveTrackId;
  const setActiveTrackId =
    environment === "b2c" ? setB2cActiveTrackId : setB2bActiveTrackId;

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

  const displayInstitutionName = institutionName.trim() || "Minha Instituição";

  const ensureTrackExists = (preferredTitle?: string): string => {
    if (activeTrackId && tracks.some((t) => t.id === activeTrackId)) {
      return activeTrackId;
    }
    const newTrack: ExamTrack = {
      id: `plano-${environment}-${Date.now()}`,
      title:
        preferredTitle ||
        (environment === "b2c" ? "Meu Plano de Estudos" : "Edital Padrão Institucional"),
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
      id: `plano-${environment}-${Date.now()}`,
      title: input.title,
      subtitle: environment === "b2c" ? "Plano individual" : "Edital padrão B2B",
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
    if (environment === "b2c") recordB2CStudyTouch();
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
    if (environment === "b2c") recordB2CStudyTouch();
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
    if (environment === "b2c") recordB2CStudyTouch();
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
    if (environment === "b2c") recordB2CStudyTouch();
    showNotice(`Tópico "${input.topic}" adicionado ao Kanban.`);
  };

  const handleAddParsedCards = (newCards: EditalCard[], customPlanTitle?: string) => {
    const resolvedTrackId = ensureTrackExists(customPlanTitle);
    const normalizedCards = newCards.map((c) => ({
      ...c,
      trackId: activeTrackId ?? resolvedTrackId,
    }));
    setCards((prev) => [...normalizedCards, ...prev]);
    if (environment === "b2c") recordB2CStudyTouch();
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
    if (environment === "b2c") recordB2CStudyTouch();
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
      environment === "b2b" ? `Instituição: ${displayInstitutionName}` : "Plano Individual Toth",
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

    setB2bTracks((prev) => {
      const exists = prev.some((t) => t.id === OAB_DEMO_TRACK.id);
      return exists ? prev : [OAB_DEMO_TRACK, ...prev];
    });
    setB2bCards((prev) => [
      ...demoCards,
      ...prev.filter((c) => c.trackId !== OAB_DEMO_TRACK.id),
    ]);
    setCohorts((prev) => [
      ...demoCohorts,
      ...prev.filter((c) => !demoCohortIds.has(c.id)),
    ]);
    setB2bActiveTrackId(OAB_DEMO_TRACK.id);
    setSelectedCardId(null);
    if (!stayOnCurrentTab) {
      setB2bTab("executive");
    }
    showNotice("Exemplo OAB carregado com 5 tópicos reais e 2 turmas de demonstração.");
  };

  const handleClearCurrentEnvironment = () => {
    if (environment === "b2c") {
      localStorage.removeItem(B2C_CARDS_KEY);
      localStorage.removeItem(B2C_TRACKS_KEY);
      localStorage.removeItem(B2C_ACTIVITY_KEY);
      setB2cCards([]);
      setB2cTracks([]);
      setB2cActiveTrackId(null);
      setB2cActivity(DEFAULT_ACTIVITY);
      setSelectedCardId(null);
      showNotice("Seu quadro individual foi limpo.");
    } else {
      localStorage.removeItem(B2B_CARDS_KEY);
      localStorage.removeItem(B2B_TRACKS_KEY);
      localStorage.removeItem(B2B_COHORTS_KEY);
      localStorage.removeItem(B2B_INST_KEY);
      setB2bCards([]);
      setB2bTracks([]);
      setCohorts([]);
      setInstitutionName("Minha Instituição");
      setB2bActiveTrackId(null);
      setSelectedCardId(null);
      showNotice("Tudo limpo. Ambiente institucional pronto para começar do zero.");
    }
  };

  const handleEnterSession = (nextSession: AuthSession) => {
    setSession(nextSession);
    setSelectedCardId(null);
    setNotice(null);
    if (nextSession.environment === "b2c") {
      setB2cTab("kanban");
    } else {
      setB2bTab("executive");
    }
  };

  const handleSwitchEnvironment = () => {
    if (!session) return;
    const nextEnv = session.environment === "b2c" ? "b2b" : "b2c";
    setSession({
      ...session,
      environment: nextEnv,
    });
    setSelectedCardId(null);
    if (nextEnv === "b2c") {
      setB2cTab("kanban");
      showNotice("Ambiente alternado para Toth Estudantes (B2C).");
    } else {
      setB2bTab("executive");
      showNotice("Ambiente alternado para Toth Instituições (B2B).");
    }
  };

  const handleExitToPortal = async () => {
    if (session?.mode === "supabase" && session.accessToken) {
      await signOutSupabase(session.accessToken);
    }
    setSession(null);
    setSelectedCardId(null);
    setNotice(null);
  };

  if (!session) {
    return <PortalSelectionView onSelectSession={handleEnterSession} />;
  }

  const activeTab: WorkspaceTab = environment === "b2c" ? b2cTab : b2bTab;

  const handleSelectTab = (tab: WorkspaceTab) => {
    if (environment === "b2c") {
      setB2cTab(tab as B2CTab);
    } else {
      setB2bTab(tab as B2BTab);
    }
  };

  const b2cTitles: Record<B2CTab, string> = {
    kanban: "Meu Kanban de Estudos",
    sources: "Importador de Edital & Fontes IA",
    revision: "Resumos e Revisões com IA",
    progress: "Meu Progresso & Gamificação",
  };

  const b2bTitles: Record<B2BTab, string> = {
    executive: "Painel Executivo da Coordenação",
    cohorts: "Gestão de Turmas & Editais Padrão",
    standard_edital: "Editais Padrão & Gerador IA",
    student_preview: "Simulação da Visão do Aluno",
  };

  const currentTabTitle =
    environment === "b2c" ? b2cTitles[b2cTab] : b2bTitles[b2bTab];

  const hasClearableData =
    environment === "b2c"
      ? b2cCards.length > 0 || b2cTracks.length > 0
      : b2bCards.length > 0 || b2bTracks.length > 0 || cohorts.length > 0;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F7F8FA] text-slate-900">
      <Sidebar
        environment={environment}
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        userEmail={session.email}
        authMode={session.mode}
        institutionName={institutionName}
        onUpdateInstitutionName={setInstitutionName}
        gamification={environment === "b2c" ? gamificationStats : undefined}
        tracks={tracks}
        activeTrackId={activeTrackId}
        onSelectTrack={(id) => {
          setActiveTrackId(id);
          setSelectedCardId(null);
        }}
        onCreateTrack={handleCreateTrack}
        onExportTrack={handleExportTrack}
        onLoadOabDemo={() => handleLoadOabDemo(true)}
        onClearAll={handleClearCurrentEnvironment}
        onSwitchEnvironment={handleSwitchEnvironment}
        onExitToPortal={handleExitToPortal}
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
              <span>
                {environment === "b2c" ? "Toth Estudantes" : displayInstitutionName}
              </span>
              <span aria-hidden="true">/</span>
              <span className="truncate">
                {activeTrack?.title ??
                  (environment === "b2c" ? "Meu Plano" : "Edital Institucional")}
              </span>
              <span aria-hidden="true">/</span>
              <span className="font-medium text-slate-800">{currentTabTitle}</span>
            </div>
            <h1 className="mt-1 font-editorial text-2xl font-semibold text-slate-900 truncate">
              {activeTrack?.title ??
                (environment === "b2c"
                  ? "Meu Plano de Estudos"
                  : "Gestão Institucional de Aprovação")}
            </h1>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {hasClearableData && (
              <button
                type="button"
                onClick={handleClearCurrentEnvironment}
                title="Limpar dados deste ambiente"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpar quadro</span>
              </button>
            )}

            {environment === "b2c" ? (
              <button
                type="button"
                onClick={() => setB2cTab("sources")}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1E3A5F] rounded-md hover:bg-[#162D4A] transition-colors whitespace-nowrap shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Importar Edital ou Criar Plano</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setB2bTab("standard_edital");
                  setB2bEditalSubView("sources");
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1E3A5F] rounded-md hover:bg-[#162D4A] transition-colors whitespace-nowrap shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Importar Edital ou Criar Plano</span>
              </button>
            )}
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

        {/* Main Viewport: Strictly Separated B2C vs B2B */}
        <main className="flex-1 p-6">
          {environment === "b2c" ? (
            <>
              {b2cTab === "kanban" && (
                <KanbanBoard
                  cards={trackCards}
                  onMoveCard={handleMoveCard}
                  onSelectCard={(card) => setSelectedCardId(card.id)}
                  onAddManualCard={handleAddManualCard}
                  onOpenSourcesGenerator={() => setB2cTab("sources")}
                />
              )}

              {b2cTab === "sources" && (
                <SourceOrganizerView
                  activeTrackId={activeTrackId}
                  activeTrackTitle={activeTrack?.title ?? null}
                  existingCards={trackCards}
                  onAddParsedCards={handleAddParsedCards}
                  onAttachRevisionToCard={handleEnrichCardWithRevision}
                  onGoToKanban={() => setB2cTab("kanban")}
                />
              )}

              {b2cTab === "revision" && (
                <RevisionCenterView
                  cards={trackCards}
                  onToggleFlashcardMastered={handleToggleFlashcardMastered}
                  onMoveCardStage={handleMoveCard}
                  onOpenCard={(card) => setSelectedCardId(card.id)}
                  onOpenSourcesGenerator={() => setB2cTab("sources")}
                  onRecordQuizAttempt={handleRecordQuizAttempt}
                />
              )}

              {b2cTab === "progress" && (
                <StudentProgressView
                  cards={trackCards}
                  gamification={gamificationStats}
                  onOpenSourcesGenerator={() => setB2cTab("sources")}
                  onGoToKanban={() => setB2cTab("kanban")}
                />
              )}
            </>
          ) : (
            <>
              {b2bTab === "executive" && (
                <B2BAdminView
                  viewMode="executive"
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

              {b2bTab === "cohorts" && (
                <B2BAdminView
                  viewMode="cohorts"
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

              {b2bTab === "standard_edital" && (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-lg px-5 py-3.5">
                    <div>
                      <div className="text-xs font-medium text-[#1E3A5F]">
                        Edital Padrão da Instituição
                      </div>
                      <div className="text-sm font-semibold text-slate-900">
                        Estruture os tópicos e materiais-base antes de distribuir às turmas
                      </div>
                    </div>

                    <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
                      <button
                        type="button"
                        onClick={() => setB2bEditalSubView("kanban")}
                        className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                          b2bEditalSubView === "kanban"
                            ? "bg-white text-slate-900 shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Quadro do Edital Padrão
                      </button>
                      <button
                        type="button"
                        onClick={() => setB2bEditalSubView("sources")}
                        className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                          b2bEditalSubView === "sources"
                            ? "bg-white text-slate-900 shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Importar Edital & Fontes IA
                      </button>
                    </div>
                  </div>

                  {b2bEditalSubView === "kanban" ? (
                    <KanbanBoard
                      cards={trackCards}
                      onMoveCard={handleMoveCard}
                      onSelectCard={(card) => setSelectedCardId(card.id)}
                      onAddManualCard={handleAddManualCard}
                      onOpenSourcesGenerator={() => setB2bEditalSubView("sources")}
                    />
                  ) : (
                    <SourceOrganizerView
                      activeTrackId={activeTrackId}
                      activeTrackTitle={activeTrack?.title ?? null}
                      existingCards={trackCards}
                      onAddParsedCards={handleAddParsedCards}
                      onAttachRevisionToCard={handleEnrichCardWithRevision}
                      onGoToKanban={() => setB2bEditalSubView("kanban")}
                    />
                  )}
                </div>
              )}

              {b2bTab === "student_preview" && (
                <div className="space-y-5">
                  {/* Coordinator Simulation Banner */}
                  <div className="bg-white border border-[#1E3A5F] rounded-lg px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <Eye className="w-5 h-5 text-[#1E3A5F] mt-0.5 shrink-0" />
                      <div>
                        <div className="text-xs font-semibold text-[#1E3A5F]">
                          Modo Simulação · Visão do Aluno ({displayInstitutionName})
                        </div>
                        <p className="mt-0.5 text-xs text-slate-600">
                          Você está testando exatamente como o aluno visualiza o edital padrão{" "}
                          <span className="font-medium text-slate-900">
                            {activeTrack?.title ?? "selecionado"}
                          </span>{" "}
                          em seu Kanban e na prática de revisão ativa.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
                        <button
                          type="button"
                          onClick={() => setB2bStudentPreviewMode("kanban")}
                          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                            b2bStudentPreviewMode === "kanban"
                              ? "bg-white text-slate-900 shadow-xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          Kanban do Aluno
                        </button>
                        <button
                          type="button"
                          onClick={() => setB2bStudentPreviewMode("revision")}
                          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                            b2bStudentPreviewMode === "revision"
                              ? "bg-white text-slate-900 shadow-xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          Revisão & Simulado
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setB2bTab("executive")}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Voltar ao Painel Executivo</span>
                      </button>
                    </div>
                  </div>

                  {b2bStudentPreviewMode === "kanban" ? (
                    <KanbanBoard
                      cards={trackCards}
                      onMoveCard={handleMoveCard}
                      onSelectCard={(card) => setSelectedCardId(card.id)}
                      onAddManualCard={handleAddManualCard}
                      onOpenSourcesGenerator={() => {
                        setB2bTab("standard_edital");
                        setB2bEditalSubView("sources");
                      }}
                    />
                  ) : (
                    <RevisionCenterView
                      cards={trackCards}
                      onToggleFlashcardMastered={handleToggleFlashcardMastered}
                      onMoveCardStage={handleMoveCard}
                      onOpenCard={(card) => setSelectedCardId(card.id)}
                      onOpenSourcesGenerator={() => {
                        setB2bTab("standard_edital");
                        setB2bEditalSubView("sources");
                      }}
                    />
                  )}
                </div>
              )}
            </>
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
