export type StudyStageId =
  | "edital"
  | "estudo"
  | "resumo"
  | "exercicios"
  | "revisao";

export type IncidenceLevel = "Alta" | "Média" | "Base";

export type WorkspaceTab =
  | "kanban"
  | "sources"
  | "revision"
  | "coordination";

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
