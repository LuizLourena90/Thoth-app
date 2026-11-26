import type { StudyStageId } from "../types";

export const STUDY_STAGES: Array<{
  id: StudyStageId;
  title: string;
  subtitle: string;
}> = [
  {
    id: "edital",
    title: "Edital Mapeado",
    subtitle: "Tópicos extraídos e priorizados",
  },
  {
    id: "estudo",
    title: "Em Estudo",
    subtitle: "Leitura ativa e fichamento",
  },
  {
    id: "resumo",
    title: "Resumo & Fontes",
    subtitle: "Síntese e pontos críticos",
  },
  {
    id: "exercicios",
    title: "Exercícios",
    subtitle: "Prática com questões da banca",
  },
  {
    id: "revisao",
    title: "Revisão Programada",
    subtitle: "Retenção ativa e simulado",
  },
];
