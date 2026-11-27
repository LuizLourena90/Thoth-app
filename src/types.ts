export type StudyStageId =
  | "edital"
  | "estudo"
  | "resumo"
  | "exercicios"
  | "revisao";

export type IncidenceLevel = "Alta" | "Média" | "Base";

export type AppEnvironment = "b2c" | "b2b";

export type PlanTier = "free" | "pro_b2c" | "enterprise_b2b";

export type B2CTab = "kanban" | "sources" | "revision" | "progress" | "plans";

export type B2BTab =
  | "executive"
  | "cohorts"
  | "standard_edital"
  | "student_preview"
  | "plans";

export type WorkspaceTab = B2CTab | B2BTab;

export interface AuthSession {
  mode: "demo" | "supabase";
  userId?: string;
  environment: AppEnvironment;
  planTier: PlanTier;
  email?: string;
}

export interface UserProfile {
  id: string;
  role: AppEnvironment;
  plan_tier: PlanTier;
}

export interface B2CActivityRecord {
  streakDays: number;
  lastActiveDate: string | null;
  quizzesAnswered: number;
  quizzesCorrect: number;
}

export interface StudyPlanBoardData {
  b2c?: {
    tracks: ExamTrack[];
    cards: EditalCard[];
    activeTrackId: string | null;
    activity: B2CActivityRecord;
  };
  b2b?: {
    tracks: ExamTrack[];
    cards: EditalCard[];
    activeTrackId: string | null;
    cohorts: CohortInfo[];
    institutionName: string;
  };
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
  macroTopic?: string;
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
