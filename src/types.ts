export type StudyStageId =
  | "edital"
  | "estudo"
  | "resumo"
  | "exercicios"
  | "revisao";

export type IncidenceLevel = "Alta" | "Média" | "Base";

export type AppEnvironment = "b2c" | "b2b";

export type B2CTab = "kanban" | "sources" | "revision" | "progress";

export type B2BTab =
  | "executive"
  | "cohorts"
  | "standard_edital"
  | "student_preview";

export type WorkspaceTab = B2CTab | B2BTab;

export interface AuthSession {
  mode: "demo" | "supabase";
  environment: AppEnvironment;
  email?: string;
  accessToken?: string;
}

export interface StudentGamificationStats {
  xp: number;
  level: number;
  levelTitle: string;
  nextLevelXp: number;
  currentLevelFloorXp: number;
  streakDays: number;
  quizzesAnswered: number;
  quizzesCorrect: number;
}

export interface StudyStep {
  id: string;
  label: string;
  done: boolean;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  articleRef: string;
  mastered?: boolean;
}

export interface ExamQuestion {
  id: string;
  stem: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  articleRef: string;
}

export interface EditalCard {
  id: string;
  trackId: string;
  discipline: string;
  topic: string;
  normativeRefs: string;
  incidence: IncidenceLevel;
  examWeightQuestions: number;
  stage: StudyStageId;
  estimatedMinutes: number;
  summary: string;
  examTraps: string[];
  steps: StudyStep[];
  flashcards: Flashcard[];
  questions: ExamQuestion[];
  sourceTitle?: string;
  updatedAt: string;
}

export interface ExamTrack {
  id: string;
  title: string;
  subtitle: string;
  banca: string;
  targetDate: string;
}

export interface CohortInfo {
  id: string;
  name: string;
  semester: string;
  enrolledStudents: number;
  activeWeeklyRate: number;
  averageAccuracy: number;
  atRiskStudents?: number;
  publishedTrackIds: string[];
  coordinatorNotes: string;
}
