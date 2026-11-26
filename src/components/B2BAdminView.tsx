import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  Download,
  Plus,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import type { CohortInfo, EditalCard, ExamTrack, StudyStageId } from "../types";

interface B2BAdminViewProps {
  viewMode?: "executive" | "cohorts";
  cohorts: CohortInfo[];
  tracks: ExamTrack[];
  activeTrackId: string | null;
  cards: EditalCard[];
  onToggleCohortTrack: (cohortId: string, trackId: string) => void;
  onAddCohort: (input: {
    name: string;
    semester: string;
    enrolledStudents: number;
    coordinatorNotes: string;
  }) => void;
  onExportPack: () => void;
  onLoadOabDemo?: () => void;
}

const STAGE_COMPLETION_WEIGHT: Record<StudyStageId, number> = {
  edital: 15,
  estudo: 35,
  resumo: 60,
  exercicios: 80,
  revisao: 100,
};

function computeCardReadiness(card: EditalCard): number {
  const stageWeight = STAGE_COMPLETION_WEIGHT[card.stage];
  if (card.steps.length === 0) return stageWeight;
  const doneSteps = card.steps.filter((s) => s.done).length;
  const stepPct = Math.round((doneSteps / card.steps.length) * 100);
  return Math.round(stageWeight * 0.7 + stepPct * 0.3);
}

function resolveAtRiskCount(cohort: CohortInfo): number {
  if (cohort.averageAccuracy === 0 && cohort.activeWeeklyRate === 0) {
    return 0;
  }
  if (typeof cohort.atRiskStudents === "number") {
    return Math.min(cohort.enrolledStudents, Math.max(0, cohort.atRiskStudents));
  }
  const ratio =
    cohort.averageAccuracy < 55
      ? 0.34
      : cohort.averageAccuracy < 65
        ? 0.22
        : cohort.averageAccuracy < 75
          ? 0.12
          : 0.05;
  return Math.round(cohort.enrolledStudents * ratio);
}

export const B2BAdminView: React.FC<B2BAdminViewProps> = ({
  viewMode = "executive",
  cohorts,
  tracks,
  activeTrackId,
  cards,
  onToggleCohortTrack,
  onAddCohort,
  onExportPack,
  onLoadOabDemo,
}) => {
  const [showAddCohort, setShowAddCohort] = useState(false);
  const [selectedCohortFilter, setSelectedCohortFilter] = useState<string>("all");
  const [name, setName] = useState("");
  const [semester, setSemester] = useState("2026.2");
  const [students, setStudents] = useState("40");
  const [notes, setNotes] = useState("");
  const [publishedBanner, setPublishedBanner] = useState<string | null>(null);

  const hasLoadedData = cards.length > 0 || cohorts.length > 0;

  const scopedCohorts = useMemo(() => {
    if (selectedCohortFilter === "all") return cohorts;
    const match = cohorts.filter((c) => c.id === selectedCohortFilter);
    return match.length > 0 ? match : cohorts;
  }, [cohorts, selectedCohortFilter]);

  const activeTrack = tracks.find((t) => t.id === activeTrackId);

  const executiveMetrics = useMemo(() => {
    const totalStudents = scopedCohorts.reduce((acc, c) => acc + c.enrolledStudents, 0);
    const assessedCohorts = scopedCohorts.filter(
      (c) => c.averageAccuracy > 0 || c.activeWeeklyRate > 0
    );
    const assessedStudents = assessedCohorts.reduce(
      (acc, c) => acc + c.enrolledStudents,
      0
    );

    const avgEngagement = assessedCohorts.length
      ? Math.round(
          assessedCohorts.reduce(
            (acc, c) => acc + c.activeWeeklyRate * c.enrolledStudents,
            0
          ) / Math.max(1, assessedStudents)
        )
      : 0;

    const avgAccuracy = assessedCohorts.length
      ? Math.round(
          assessedCohorts.reduce(
            (acc, c) => acc + c.averageAccuracy * c.enrolledStudents,
            0
          ) / Math.max(1, assessedStudents)
        )
      : 0;

    let atRiskStudents = 0;
    let attentionStudents = 0;
    let onTrackStudents = 0;
    let pendingDiagnosticStudents = 0;

    for (const cohort of scopedCohorts) {
      if (cohort.averageAccuracy === 0 && cohort.activeWeeklyRate === 0) {
        pendingDiagnosticStudents += cohort.enrolledStudents;
        continue;
      }
      const risk = resolveAtRiskCount(cohort);
      const rest = Math.max(0, cohort.enrolledStudents - risk);
      const readyRatio = Math.min(
        0.88,
        Math.max(0.2, (cohort.averageAccuracy - 35) / 55)
      );
      const ready = Math.round(rest * readyRatio);
      const attention = Math.max(0, rest - ready);

      atRiskStudents += risk;
      onTrackStudents += ready;
      attentionStudents += attention;
    }

    const atRiskPct =
      assessedStudents > 0 ? Math.round((atRiskStudents / assessedStudents) * 100) : 0;

    // Edital completion rate derived from Kanban stages & checklist steps
    const editalCompletionRate =
      cards.length > 0
        ? Math.round(
            cards.reduce((acc, c) => acc + computeCardReadiness(c), 0) / cards.length
          )
        : 0;

    const consolidatedCardsCount = cards.filter(
      (c) => c.stage === "exercicios" || c.stage === "revisao"
    ).length;

    // Group disciplines and rank from lowest readiness (highest student difficulty) to highest
    const disciplineMap = new Map<string, EditalCard[]>();
    for (const card of cards) {
      const list = disciplineMap.get(card.discipline) ?? [];
      list.push(card);
      disciplineMap.set(card.discipline, list);
    }

    const disciplineStats = Array.from(disciplineMap.entries())
      .map(([discipline, discCards]) => {
        const readiness = Math.round(
          discCards.reduce((acc, c) => acc + computeCardReadiness(c), 0) /
            discCards.length
        );
        const fcCount = discCards.reduce((acc, c) => acc + c.flashcards.length, 0);
        const qCount = discCards.reduce((acc, c) => acc + c.questions.length, 0);
        const inRevision = discCards.filter(
          (c) => c.stage === "revisao" || c.stage === "exercicios"
        ).length;
        const difficultyScore = 100 - readiness;

        return {
          discipline,
          cardsCount: discCards.length,
          readiness,
          difficultyScore,
          fcCount,
          qCount,
          inRevision,
          hasActiveProgress: discCards.some((c) => c.stage !== "edital"),
        };
      })
      .sort((a, b) => a.readiness - b.readiness);

    const hardestDisciplines = disciplineStats.filter((d) => d.readiness < 70);

    return {
      totalStudents,
      assessedStudents,
      avgEngagement,
      avgAccuracy,
      atRiskStudents,
      attentionStudents,
      onTrackStudents,
      pendingDiagnosticStudents,
      atRiskPct,
      editalCompletionRate,
      consolidatedCardsCount,
      disciplineStats,
      hardestDisciplines,
    };
  }, [scopedCohorts, cards]);

  const handleCreateCohort = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAddCohort({
      name: name.trim(),
      semester: semester.trim() || "2026.2",
      enrolledStudents: Math.max(1, Number(students) || 30),
      coordinatorNotes: notes.trim() || "Turma vinculada ao plano institucional.",
    });
    setName("");
    setNotes("");
    setShowAddCohort(false);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Executive Section (Shown on Painel Executivo) */}
      {viewMode === "executive" && (
        <>
          <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-medium text-[#1E3A5F]">
                Painel Executivo B2B · Coordenação Pedagógica
              </div>
              <h2 className="mt-1 font-editorial text-xl font-semibold text-slate-900">
                Desempenho das Turmas e Cobertura do Edital
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Acompanhe a taxa de conclusão do edital, identifique matérias críticas e intervenha em alunos com risco de reprovação.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onExportPack}
                disabled={cards.length === 0}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-45 disabled:pointer-events-none whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar pacote da turma</span>
              </button>
              <button
                type="button"
                disabled={!activeTrack || cohorts.length === 0}
                onClick={() =>
                  setPublishedBanner(
                    `Plano "${activeTrack?.title}" sincronizado com ${cohorts.filter((c) =>
                      activeTrackId ? c.publishedTrackIds.includes(activeTrackId) : false
                    ).length} turmas ativas.`
                  )
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1E3A5F] rounded-md hover:bg-[#162D4A] disabled:opacity-45 disabled:pointer-events-none whitespace-nowrap shrink-0"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Publicar atualizações às turmas</span>
              </button>
            </div>
          </div>

          {publishedBanner && (
            <div className="px-4 py-3 text-xs font-medium text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-md flex items-center justify-between">
              <span>{publishedBanner}</span>
              <button
                type="button"
                onClick={() => setPublishedBanner(null)}
                className="text-emerald-700 hover:underline whitespace-nowrap"
              >
                Dispensar
              </button>
            </div>
          )}
        </>
      )}

      {/* Cohorts Header (Shown on Turmas & Distribuição) */}
      {viewMode === "cohorts" && (
        <>
          <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-medium text-[#1E3A5F]">
                Gestão de Turmas & Editais Padrão
              </div>
              <h2 className="mt-1 font-editorial text-xl font-semibold text-slate-900">
                Distribuição de Editais Padrão para Turmas
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Cadastre turmas da instituição, libere o edital padrão selecionado e acompanhe a cobertura de materiais por disciplina.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onExportPack}
                disabled={cards.length === 0}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-45 disabled:pointer-events-none whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar pacote da turma</span>
              </button>
              <button
                type="button"
                disabled={!activeTrack || cohorts.length === 0}
                onClick={() =>
                  setPublishedBanner(
                    `Edital padrão "${activeTrack?.title}" publicado para ${cohorts.filter((c) =>
                      activeTrackId ? c.publishedTrackIds.includes(activeTrackId) : false
                    ).length} turmas.`
                  )
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1E3A5F] rounded-md hover:bg-[#162D4A] disabled:opacity-45 disabled:pointer-events-none whitespace-nowrap shrink-0"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Publicar edital às turmas</span>
              </button>
            </div>
          </div>

          {publishedBanner && (
            <div className="px-4 py-3 text-xs font-medium text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-md flex items-center justify-between">
              <span>{publishedBanner}</span>
              <button
                type="button"
                onClick={() => setPublishedBanner(null)}
                className="text-emerald-700 hover:underline whitespace-nowrap"
              >
                Dispensar
              </button>
            </div>
          )}
        </>
      )}

      {viewMode === "executive" && !hasLoadedData ? (
        /* Illustrative Executive Preview when no cohort/edital data is loaded */
        <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-medium text-slate-500">
                Prévia ilustrativa · Sem dados carregados no workspace
              </div>
              <h3 className="mt-1 text-base font-semibold text-slate-900">
                Como a coordenação acompanha o desempenho da turma
              </h3>
              <p className="mt-0.5 text-xs text-slate-600 max-w-2xl">
                Assim que você cadastrar uma turma ou importar um edital, este painel passa a calcular em tempo real a conclusão do programa, gargalos por disciplina e alunos em risco.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowAddCohort(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Cadastrar primeira turma</span>
              </button>
              {onLoadOabDemo && (
                <button
                  type="button"
                  onClick={onLoadOabDemo}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1E3A5F] rounded-md hover:bg-[#162D4A] whitespace-nowrap shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Carregar Exemplo OAB</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
            {/* Illustrative Chart 1: Weekly Edital Completion Trajectory */}
            <div className="lg:col-span-7 p-6">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                    <TrendingUp className="w-4 h-4 text-[#1E3A5F]" />
                    <span>Evolução semanal de conclusão do edital (ilustração)</span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Comparativo entre avanço real da turma no Kanban e meta mínima de aprovação
                  </p>
                </div>
                <div className="text-[11px] font-mono tabular-nums text-slate-500 shrink-0">
                  Meta: 70%
                </div>
              </div>

              <div className="w-full">
                <svg
                  viewBox="0 0 560 210"
                  className="w-full h-auto overflow-visible"
                  role="img"
                  aria-label="Gráfico ilustrativo mostrando evolução semanal de conclusão do edital de 18% até 82% em comparação com a meta de 70%"
                >
                  {/* Horizontal Gridlines */}
                  {[
                    { y: 24, label: "100%" },
                    { y: 66, label: "75%" },
                    { y: 108, label: "50%" },
                    { y: 150, label: "25%" },
                    { y: 180, label: "0%" },
                  ].map((grid) => (
                    <g key={grid.label}>
                      <line
                        x1="42"
                        y1={grid.y}
                        x2="540"
                        y2={grid.y}
                        stroke="#E2E8F0"
                        strokeWidth="1"
                      />
                      <text
                        x="34"
                        y={grid.y + 4}
                        textAnchor="end"
                        className="fill-slate-400 text-[10px] font-mono"
                      >
                        {grid.label}
                      </text>
                    </g>
                  ))}

                  {/* Target threshold line (70% -> y = 74.4) */}
                  <line
                    x1="42"
                    y1="74"
                    x2="540"
                    y2="74"
                    stroke="#D97706"
                    strokeWidth="1.5"
                    strokeDasharray="5 4"
                  />
                  <text
                    x="536"
                    y="67"
                    textAnchor="end"
                    className="fill-amber-700 text-[10px] font-medium"
                  >
                    Meta de prontidão (70%)
                  </text>

                  {/* Illustrative Area Under Curve */}
                  <path
                    d="M 62 152 L 128 138 L 194 122 L 260 105 L 326 88 L 392 71 L 458 58 L 524 46 L 524 180 L 62 180 Z"
                    fill="#1E3A5F"
                    fillOpacity="0.08"
                  />

                  {/* Illustrative Progression Line */}
                  <path
                    d="M 62 152 L 128 138 L 194 122 L 260 105 L 326 88 L 392 71 L 458 58 L 524 46"
                    fill="none"
                    stroke="#1E3A5F"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Weekly Data Nodes & Labels */}
                  {[
                    { x: 62, y: 152, week: "S1", val: "18%" },
                    { x: 128, y: 138, week: "S2", val: "27%" },
                    { x: 194, y: 122, week: "S3", val: "37%" },
                    { x: 260, y: 105, week: "S4", val: "48%" },
                    { x: 326, y: 88, week: "S5", val: "59%" },
                    { x: 392, y: 71, week: "S6", val: "70%" },
                    { x: 458, y: 58, week: "S7", val: "78%" },
                    { x: 524, y: 46, week: "S8", val: "86%" },
                  ].map((pt, idx) => (
                    <g key={pt.week}>
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="4"
                        fill={idx >= 5 ? "#16A34A" : "#1E3A5F"}
                        stroke="#FFFFFF"
                        strokeWidth="1.5"
                      />
                      <text
                        x={pt.x}
                        y={pt.y - 10}
                        textAnchor="middle"
                        className="fill-slate-700 text-[10px] font-mono"
                      >
                        {pt.val}
                      </text>
                      <text
                        x={pt.x}
                        y="198"
                        textAnchor="middle"
                        className="fill-slate-500 text-[10px] font-mono"
                      >
                        {pt.week}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            </div>

            {/* Illustrative Chart 2: Difficulty & Risk Radar */}
            <div className="lg:col-span-5 p-6 flex flex-col justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                  <BarChart3 className="w-4 h-4 text-[#1E3A5F]" />
                  <span>Identificação de gargalos e risco (ilustração)</span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  Exemplo de como matérias críticas e faixas de risco aparecem após os primeiros simulados
                </p>

                <div className="mt-5 space-y-3.5">
                  {[
                    {
                      label: "Matéria com maior dificuldade",
                      pct: 38,
                      status: "Intervenção",
                      barClass: "bg-red-600",
                      textClass: "text-red-700",
                    },
                    {
                      label: "Matéria em revisão parcial",
                      pct: 56,
                      status: "Atenção",
                      barClass: "bg-amber-500",
                      textClass: "text-amber-700",
                    },
                    {
                      label: "Matéria consolidada",
                      pct: 82,
                      status: "No ritmo",
                      barClass: "bg-emerald-600",
                      textClass: "text-emerald-700",
                    },
                  ].map((sample) => (
                    <div key={sample.label} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-700">{sample.label}</span>
                        <span className="font-mono tabular-nums text-slate-600">
                          {sample.pct}% · <span className={sample.textClass}>{sample.status}</span>
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-sm overflow-hidden">
                        <div
                          className={`h-full ${sample.barClass}`}
                          style={{ width: `${sample.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-2">
                <div className="text-xs font-medium text-slate-700">
                  Segmentação automática dos alunos
                </div>
                <div className="w-full h-2.5 rounded-sm overflow-hidden flex bg-slate-100">
                  <div className="h-full bg-red-600" style={{ width: "18%" }} />
                  <div className="h-full bg-amber-500" style={{ width: "32%" }} />
                  <div className="h-full bg-emerald-600" style={{ width: "50%" }} />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 font-mono tabular-nums">
                  <span className="text-red-700">Em risco (&lt;50%)</span>
                  <span className="text-amber-700">Atenção (50–69%)</span>
                  <span className="text-emerald-700">No ritmo (≥70%)</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : viewMode === "executive" ? (
        /* Live Executive Dashboard when Data is Present */
        <>
          {/* Optional Cohort Scope Filter when cohorts exist */}
          {cohorts.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-md overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setSelectedCohortFilter("all")}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                    selectedCohortFilter === "all"
                      ? "bg-[#1E3A5F] text-white"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  Todas as turmas ({cohorts.length})
                </button>
                {cohorts.map((cohort) => (
                  <button
                    key={cohort.id}
                    type="button"
                    onClick={() => setSelectedCohortFilter(cohort.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                      selectedCohortFilter === cohort.id
                        ? "bg-[#1E3A5F] text-white"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    {cohort.name}
                  </button>
                ))}
              </div>

              <div className="text-xs text-slate-500 font-mono tabular-nums">
                {activeTrack ? `Edital ativo: ${activeTrack.title}` : "Sem edital selecionado"}
              </div>
            </div>
          )}

          {/* 4-Column Executive KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-lg divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
            {/* KPI 1: Taxa de conclusão do edital */}
            <div className="px-6 py-4">
              <div className="text-xs font-medium text-slate-500">
                Taxa de conclusão do edital
              </div>
              <div className="mt-1 font-mono text-2xl font-semibold text-[#1E3A5F] tabular-nums">
                {executiveMetrics.editalCompletionRate}%
              </div>
              <div className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
                {executiveMetrics.consolidatedCardsCount} de {cards.length} tópicos em revisão/exercícios
              </div>
            </div>

            {/* KPI 2: Matérias com maior dificuldade */}
            <div className="px-6 py-4">
              <div className="text-xs font-medium text-slate-500">
                Matérias com maior dificuldade
              </div>
              <div className="mt-1 font-mono text-2xl font-semibold text-amber-700 tabular-nums">
                {executiveMetrics.hardestDisciplines.length}
              </div>
              <div className="mt-1 text-xs text-slate-600 truncate">
                {executiveMetrics.disciplineStats.length === 0
                  ? "Importe tópicos para mapear matérias"
                  : executiveMetrics.hardestDisciplines.length > 0
                    ? `Principal gargalo: ${executiveMetrics.hardestDisciplines[0].discipline}`
                    : "Todas as matérias acima de 70%"}
              </div>
            </div>

            {/* KPI 3: Alunos em risco de reprovação */}
            <div className="px-6 py-4">
              <div className="text-xs font-medium text-slate-500">
                Alunos em risco de reprovação
              </div>
              <div
                className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${
                  executiveMetrics.atRiskStudents > 0 ? "text-red-700" : "text-slate-900"
                }`}
              >
                {executiveMetrics.atRiskStudents}
              </div>
              <div className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
                {executiveMetrics.assessedStudents > 0
                  ? `${executiveMetrics.atRiskPct}% dos ${executiveMetrics.assessedStudents} alunos avaliados`
                  : cohorts.length > 0
                    ? "Aguardando primeiros simulados"
                    : "Cadastre turmas para monitorar"}
              </div>
            </div>

            {/* KPI 4: Adesão e aproveitamento */}
            <div className="px-6 py-4">
              <div className="text-xs font-medium text-slate-500">
                Aproveitamento médio da turma
              </div>
              <div className="mt-1 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
                {executiveMetrics.avgAccuracy}%
              </div>
              <div className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
                {executiveMetrics.totalStudents} alunos · {executiveMetrics.avgEngagement}% adesão semanal
              </div>
            </div>
          </div>

          {/* 2-Column Executive Breakdown: Discipline Difficulty + Risk Segmentation */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Matérias com maior dificuldade dos alunos */}
            <section className="lg:col-span-7 bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Matérias com maior dificuldade dos alunos
                  </h3>
                  <p className="text-xs text-slate-500">
                    Ordenadas do menor para o maior índice de prontidão e revisão no edital.
                  </p>
                </div>
                <span className="text-xs font-mono tabular-nums text-slate-500 shrink-0">
                  {executiveMetrics.disciplineStats.length}{" "}
                  {executiveMetrics.disciplineStats.length === 1 ? "matéria" : "matérias"}
                </span>
              </div>

              {executiveMetrics.disciplineStats.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  Adicione tópicos ao Kanban ou importe um edital para visualizar a dificuldade por matéria.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {executiveMetrics.disciplineStats.map((item) => {
                    const isCritical = item.readiness < 45;
                    const isAttention = item.readiness >= 45 && item.readiness < 70;
                    const barColor = isCritical
                      ? "bg-red-600"
                      : isAttention
                        ? "bg-amber-500"
                        : "bg-emerald-600";
                    const statusText = isCritical
                      ? "Atenção prioritária"
                      : isAttention
                        ? "Em evolução"
                        : "Consolidada";
                    const statusTone = isCritical
                      ? "text-red-700"
                      : isAttention
                        ? "text-amber-700"
                        : "text-emerald-700";

                    return (
                      <div key={item.discipline} className="px-6 py-3.5 space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex items-center gap-2 text-xs">
                            <span className="font-semibold text-slate-900 truncate">
                              {item.discipline}
                            </span>
                            <span aria-hidden="true" className="text-slate-300">
                              ·
                            </span>
                            <span className="text-slate-500 font-mono tabular-nums shrink-0">
                              {item.cardsCount}{" "}
                              {item.cardsCount === 1 ? "tópico" : "tópicos"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs shrink-0">
                            <span className={`font-medium ${statusTone}`}>
                              {statusText}
                            </span>
                            <span aria-hidden="true" className="text-slate-300">
                              ·
                            </span>
                            <span className="font-mono font-semibold text-slate-900 tabular-nums">
                              {item.readiness}%
                            </span>
                          </div>
                        </div>

                        <div className="w-full h-2 bg-slate-100 rounded-sm overflow-hidden">
                          <div
                            className={`h-full transition-all ${barColor}`}
                            style={{ width: `${Math.max(4, item.readiness)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Right: Alunos em risco de reprovação */}
            <section className="lg:col-span-5 bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col justify-between">
              <div>
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Faixas de risco de reprovação
                    </h3>
                    <p className="text-xs text-slate-500">
                      Distribuição estimada conforme aproveitamento e adesão.
                    </p>
                  </div>
                  <ShieldAlert className="w-4 h-4 text-slate-400 shrink-0" />
                </div>

                {executiveMetrics.totalStudents === 0 ? (
                  <div className="p-8 text-center space-y-2">
                    <Users className="w-5 h-5 text-slate-400 mx-auto" />
                    <div className="text-xs font-medium text-slate-700">
                      Nenhuma turma vinculada ainda
                    </div>
                    <p className="text-xs text-slate-500">
                      Cadastre uma turma abaixo para segmentar alunos em risco.
                    </p>
                  </div>
                ) : (
                  <div className="p-6 space-y-5">
                    {/* Segmented horizontal bar */}
                    <div>
                      <div className="w-full h-3 rounded-sm overflow-hidden flex bg-slate-100">
                        {executiveMetrics.atRiskStudents > 0 && (
                          <div
                            className="h-full bg-red-600"
                            style={{
                              width: `${(executiveMetrics.atRiskStudents / executiveMetrics.totalStudents) * 100}%`,
                            }}
                            title={`Em risco: ${executiveMetrics.atRiskStudents}`}
                          />
                        )}
                        {executiveMetrics.attentionStudents > 0 && (
                          <div
                            className="h-full bg-amber-500"
                            style={{
                              width: `${(executiveMetrics.attentionStudents / executiveMetrics.totalStudents) * 100}%`,
                            }}
                            title={`Zona de atenção: ${executiveMetrics.attentionStudents}`}
                          />
                        )}
                        {executiveMetrics.onTrackStudents > 0 && (
                          <div
                            className="h-full bg-emerald-600"
                            style={{
                              width: `${(executiveMetrics.onTrackStudents / executiveMetrics.totalStudents) * 100}%`,
                            }}
                            title={`No ritmo de aprovação: ${executiveMetrics.onTrackStudents}`}
                          />
                        )}
                        {executiveMetrics.pendingDiagnosticStudents > 0 && (
                          <div
                            className="h-full bg-slate-300"
                            style={{
                              width: `${(executiveMetrics.pendingDiagnosticStudents / executiveMetrics.totalStudents) * 100}%`,
                            }}
                            title={`Sem diagnóstico: ${executiveMetrics.pendingDiagnosticStudents}`}
                          />
                        )}
                      </div>
                    </div>

                    {/* Explicit Band Breakdown */}
                    <div className="divide-y divide-slate-100 border-t border-b border-slate-100">
                      <div className="py-3 flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 text-red-700 font-medium">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>Em risco de reprovação (&lt; 50%)</span>
                        </div>
                        <span className="font-mono font-semibold text-slate-900 tabular-nums">
                          {executiveMetrics.atRiskStudents} alunos
                        </span>
                      </div>

                      <div className="py-3 flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 text-amber-700 font-medium">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          <span>Zona de atenção (50% a 69%)</span>
                        </div>
                        <span className="font-mono font-semibold text-slate-900 tabular-nums">
                          {executiveMetrics.attentionStudents} alunos
                        </span>
                      </div>

                      <div className="py-3 flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 text-emerald-700 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>No ritmo de aprovação (≥ 70%)</span>
                        </div>
                        <span className="font-mono font-semibold text-slate-900 tabular-nums">
                          {executiveMetrics.onTrackStudents} alunos
                        </span>
                      </div>

                      {executiveMetrics.pendingDiagnosticStudents > 0 && (
                        <div className="py-3 flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 text-slate-600 font-medium">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>Aguardando 1º simulado</span>
                          </div>
                          <span className="font-mono font-semibold text-slate-900 tabular-nums">
                            {executiveMetrics.pendingDiagnosticStudents} alunos
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {executiveMetrics.atRiskStudents > 0 && (
                <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-600">
                  Recomendação: direcionar simulado de reforço nas matérias com prontidão abaixo de 50% para os{" "}
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    {executiveMetrics.atRiskStudents}
                  </span>{" "}
                  alunos em risco.
                </div>
              )}
            </section>
          </div>
        </>
      ) : null}

      {/* Cohorts Management Table */}
      {(viewMode === "cohorts" || (viewMode === "executive" && (cohorts.length > 0 || showAddCohort))) && (
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Turmas e disponibilização de planos
            </h3>
            <p className="text-xs text-slate-500">
              {activeTrack
                ? `Gerencie o acesso das turmas ao plano: ${activeTrack.title}.`
                : "Crie um plano ou importe um edital para vincular às turmas."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddCohort((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova turma</span>
          </button>
        </div>

        {showAddCohort && (
          <form
            onSubmit={handleCreateCohort}
            className="p-5 bg-slate-50 border-b border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
          >
            <div className="md:col-span-4">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nome da turma
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Turma Manhã A"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Período
              </label>
              <input
                type="text"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nº de alunos
              </label>
              <input
                type="number"
                min={1}
                value={students}
                onChange={(e) => setStudents(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
              />
            </div>
            <div className="md:col-span-4 flex items-center gap-2">
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observação pedagógica"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
              />
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-[#1E3A5F] rounded-md hover:bg-[#162D4A] whitespace-nowrap shrink-0"
              >
                Criar
              </button>
            </div>
          </form>
        )}

        {cohorts.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <Users className="w-6 h-6 text-slate-400 mx-auto" />
            <div className="text-sm font-medium text-slate-700">
              Nenhuma turma cadastrada ainda
            </div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Clique em &ldquo;Nova turma&rdquo; acima para cadastrar suas turmas e liberar seus planos de estudo.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                  <th className="py-3 px-6">Turma / Núcleo</th>
                  <th className="py-3 px-4 text-right">Alunos</th>
                  <th className="py-3 px-4 text-right">Em risco</th>
                  <th className="py-3 px-4 text-right">Adesão semanal</th>
                  <th className="py-3 px-4 text-right">Acerto médio</th>
                  <th className="py-3 px-6 text-right">Disponibilização</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {cohorts.map((cohort) => {
                  const isPublished = activeTrackId
                    ? cohort.publishedTrackIds.includes(activeTrackId)
                    : false;
                  const cohortRisk = resolveAtRiskCount(cohort);
                  return (
                    <tr key={cohort.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-6">
                        <div className="font-semibold text-slate-900 flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{cohort.name}</span>
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500">
                          {cohort.semester} · {cohort.coordinatorNotes}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                        {cohort.enrolledStudents}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono tabular-nums font-medium ${
                          cohortRisk > 0 ? "text-red-700" : "text-slate-500"
                        }`}
                      >
                        {cohortRisk}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                        {cohort.activeWeeklyRate}%
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                        {cohort.averageAccuracy}%
                      </td>
                      <td className="py-3 px-6 text-right">
                        <button
                          type="button"
                          disabled={!activeTrackId}
                          onClick={() =>
                            activeTrackId && onToggleCohortTrack(cohort.id, activeTrackId)
                          }
                          className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 disabled:opacity-40 ${
                            isPublished
                              ? "border-[#1E3A5F] bg-[#1E3A5F] text-white"
                              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {isPublished ? "Ativa para a turma" : "Liberar plano"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      )}

      {/* Discipline Coverage Matrix (visible on cohorts view when cards exist) */}
      {viewMode === "cohorts" && cards.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">
              Cobertura do edital e materiais por matéria
            </h3>
            <p className="text-xs text-slate-500">
              Diagnóstico calculado em tempo real sobre os cartões adicionados ao Kanban.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                  <th className="py-3 px-6">Matéria / Disciplina</th>
                  <th className="py-3 px-4 text-right">Tópicos no Kanban</th>
                  <th className="py-3 px-4 text-right">Flashcards</th>
                  <th className="py-3 px-4 text-right">Questões</th>
                  <th className="py-3 px-6">Estado da preparação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {executiveMetrics.disciplineStats.map((stat) => {
                  let statusLabel = "Mapeado no edital";
                  let statusIcon = (
                    <AlertCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  );
                  let statusTone = "text-slate-600";

                  if (stat.inRevision > 0 || (stat.fcCount > 0 && stat.qCount > 0)) {
                    statusLabel = "Material consolidado";
                    statusIcon = (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    );
                    statusTone = "text-emerald-700";
                  } else if (stat.hasActiveProgress) {
                    statusLabel = "Em produção / estudo";
                    statusIcon = (
                      <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    );
                    statusTone = "text-amber-700";
                  }

                  return (
                    <tr key={stat.discipline} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-6 font-medium text-slate-900">
                        {stat.discipline}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900 font-semibold">
                        {stat.cardsCount}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                        {stat.fcCount}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                        {stat.qCount}
                      </td>
                      <td className="py-3 px-6">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium ${statusTone}`}
                        >
                          {statusIcon}
                          <span>{statusLabel}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};
