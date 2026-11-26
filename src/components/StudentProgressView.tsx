import React, { useMemo } from "react";
import {
  Award,
  BookOpenCheck,
  CheckCircle2,
  Flame,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { STUDY_STAGES } from "../data/kanbanConfig";
import type { EditalCard, StudentGamificationStats } from "../types";

interface StudentProgressViewProps {
  cards: EditalCard[];
  gamification: StudentGamificationStats;
  onOpenSourcesGenerator: () => void;
  onGoToKanban: () => void;
}

export const StudentProgressView: React.FC<StudentProgressViewProps> = ({
  cards,
  gamification,
  onOpenSourcesGenerator,
  onGoToKanban,
}) => {
  const levelSpan = Math.max(1, gamification.nextLevelXp - gamification.currentLevelFloorXp);
  const levelProgressPct = Math.min(
    100,
    Math.round(((gamification.xp - gamification.currentLevelFloorXp) / levelSpan) * 100)
  );
  const xpRemaining = Math.max(0, gamification.nextLevelXp - gamification.xp);

  const accuracyPct =
    gamification.quizzesAnswered > 0
      ? Math.round((gamification.quizzesCorrect / gamification.quizzesAnswered) * 100)
      : 0;

  const disciplineStats = useMemo(() => {
    const map = new Map<string, EditalCard[]>();
    for (const card of cards) {
      const arr = map.get(card.discipline) ?? [];
      arr.push(card);
      map.set(card.discipline, arr);
    }

    return Array.from(map.entries()).map(([discipline, discCards]) => {
      const totalSteps = discCards.reduce((acc, c) => acc + c.steps.length, 0);
      const doneSteps = discCards.reduce(
        (acc, c) => acc + c.steps.filter((s) => s.done).length,
        0
      );
      const totalFc = discCards.reduce((acc, c) => acc + c.flashcards.length, 0);
      const masteredFc = discCards.reduce(
        (acc, c) => acc + c.flashcards.filter((f) => f.mastered).length,
        0
      );
      const inRevision = discCards.filter(
        (c) => c.stage === "exercicios" || c.stage === "revisao"
      ).length;
      const pct = Math.round((inRevision / discCards.length) * 100);

      return {
        discipline,
        cardsCount: discCards.length,
        doneSteps,
        totalSteps,
        masteredFc,
        totalFc,
        inRevision,
        pct,
      };
    });
  }, [cards]);

  const stageCounts = useMemo(
    () =>
      STUDY_STAGES.map((stage, idx) => ({
        ...stage,
        indexLabel: String(idx + 1).padStart(2, "0"),
        count: cards.filter((c) => c.stage === stage.id).length,
      })),
    [cards]
  );

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Gamification & Level Banner */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-medium text-[#1E3A5F]">
              Jornada Individual · Gamificação e Desempenho
            </div>
            <h2 className="mt-1 font-editorial text-xl font-semibold text-slate-900">
              Meu Progresso de Aprovação
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Cada tópico concluído, flashcard dominado e questão respondida soma pontos no seu nível de preparação.
            </p>
          </div>

          <div className="text-left md:text-right shrink-0">
            <div className="text-xs text-slate-500">Nível atual</div>
            <div className="font-editorial text-lg font-semibold text-[#1E3A5F]">
              Nível {gamification.level} · {gamification.levelTitle}
            </div>
          </div>
        </div>

        {/* 4-Column Gamification Metrics Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 border border-slate-200 rounded-md divide-y lg:divide-y-0 lg:divide-x divide-slate-200 bg-slate-50/60">
          <div className="px-5 py-4">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Award className="w-3.5 h-3.5 text-[#1E3A5F]" />
              <span>Pontuação total</span>
            </div>
            <div className="mt-1 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
              {gamification.xp} pts
            </div>
            <div className="mt-0.5 text-xs text-slate-500 font-mono tabular-nums">
              Faltam {xpRemaining} pts para o nível {gamification.level + 1}
            </div>
          </div>

          <div className="px-5 py-4">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Flame className="w-3.5 h-3.5 text-amber-600" />
              <span>Sequência (Streak)</span>
            </div>
            <div className="mt-1 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
              {gamification.streakDays}{" "}
              {gamification.streakDays === 1 ? "dia" : "dias"}
            </div>
            <div className="mt-0.5 text-xs text-slate-500">
              Consistência de estudo ativo
            </div>
          </div>

          <div className="px-5 py-4">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Target className="w-3.5 h-3.5 text-emerald-700" />
              <span>Taxa de acertos</span>
            </div>
            <div className="mt-1 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
              {accuracyPct}%
            </div>
            <div className="mt-0.5 text-xs text-slate-500 font-mono tabular-nums">
              {gamification.quizzesCorrect}/{gamification.quizzesAnswered} questões corretas
            </div>
          </div>

          <div className="px-5 py-4">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <BookOpenCheck className="w-3.5 h-3.5 text-[#1E3A5F]" />
              <span>Tópicos no Kanban</span>
            </div>
            <div className="mt-1 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
              {cards.length}
            </div>
            <div className="mt-0.5 text-xs text-slate-500 font-mono tabular-nums">
              {cards.filter((c) => c.stage === "revisao").length} em revisão programada
            </div>
          </div>
        </div>

        {/* XP Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-600 font-mono tabular-nums">
            <span>Progresso para o Nível {gamification.level + 1}</span>
            <span>{levelProgressPct}%</span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-sm overflow-hidden">
            <div
              className="h-full bg-[#1E3A5F] transition-all"
              style={{ width: `${Math.max(3, levelProgressPct)}%` }}
            />
          </div>
        </div>
      </section>

      {cards.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center space-y-3">
          <TrendingUp className="w-7 h-7 text-slate-400 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-900">
            Importe seu primeiro edital para acompanhar seu avanço
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Assim que você adicionar matérias ao seu Kanban ou gerar revisões com IA, este painel mostrará sua evolução por etapa e por disciplina.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={onOpenSourcesGenerator}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1E3A5F] rounded-md hover:bg-[#162D4A]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Importar Edital ou Criar Plano</span>
            </button>
            <button
              type="button"
              onClick={onGoToKanban}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
            >
              <span>Ir para Meu Kanban</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Stage Pipeline Distribution */}
          <section className="lg:col-span-5 bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">
                Distribuição nas etapas do Kanban
              </h3>
              <p className="text-xs text-slate-500">
                Onde seus tópicos estão concentrados hoje
              </p>
            </div>
            <div className="p-6 space-y-4">
              {stageCounts.map((st) => {
                const share = cards.length
                  ? Math.round((st.count / cards.length) * 100)
                  : 0;
                return (
                  <div key={st.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-800">
                        {st.indexLabel}. {st.title}
                      </span>
                      <span className="font-mono tabular-nums text-slate-600">
                        {st.count} ({share}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-sm overflow-hidden">
                      <div
                        className="h-full bg-[#1E3A5F]"
                        style={{ width: `${share}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Discipline Mastery Breakdown */}
          <section className="lg:col-span-7 bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">
                Evolução por matéria
              </h3>
              <p className="text-xs text-slate-500">
                Checklist concluído, flashcards dominados e prontidão para prova
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                    <th className="py-3 px-6">Matéria</th>
                    <th className="py-3 px-4 text-right">Passos</th>
                    <th className="py-3 px-4 text-right">Flashcards</th>
                    <th className="py-3 px-6 text-right">Em revisão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {disciplineStats.map((stat) => (
                    <tr key={stat.discipline} className="hover:bg-slate-50">
                      <td className="py-3 px-6 font-medium text-slate-900">
                        {stat.discipline}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                        {stat.doneSteps}/{stat.totalSteps}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                        {stat.masteredFc}/{stat.totalFc}
                      </td>
                      <td className="py-3 px-6 text-right">
                        <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold tabular-nums text-[#1E3A5F]">
                          {stat.pct === 100 && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          )}
                          <span>
                            {stat.inRevision}/{stat.cardsCount} ({stat.pct}%)
                          </span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
