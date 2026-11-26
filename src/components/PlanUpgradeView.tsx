import React, { useState } from "react";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import type { AppEnvironment, PlanTier } from "../types";

interface PlanUpgradeViewProps {
  currentPlanTier: PlanTier;
  currentEnvironment: AppEnvironment;
  authMode: "demo" | "supabase";
  onChangePlanTier: (nextTier: PlanTier) => Promise<void>;
  onGoToEnvironment?: (env: AppEnvironment) => void;
}

const PLAN_LABELS: Record<PlanTier, string> = {
  free: "Free (Gratuito)",
  pro_b2c: "Pro Estudantes (B2C)",
  enterprise_b2b: "Enterprise Instituições (B2B)",
};

interface TierDefinition {
  id: PlanTier;
  audience: string;
  title: string;
  price: string;
  cadence: string;
  summary: string;
  limits: string[];
  recommendedFor?: AppEnvironment;
  ctaLabel: string;
}

const TIER_DEFINITIONS: TierDefinition[] = [
  {
    id: "free",
    audience: "Para começar a estruturar seu edital",
    title: "Plano Free",
    price: "R$ 0",
    cadence: "para sempre",
    summary:
      "Ideal para conhecer o Kanban de estudos e organizar o primeiro edital sem custo.",
    limits: [
      "1 edital ativo no Kanban",
      "Até 15 tópicos mapeados",
      "5 gerações de resumo e questões com IA/mês",
      "Movimentação livre entre as 5 colunas de estudo",
    ],
    ctaLabel: "Usar Plano Free",
  },
  {
    id: "pro_b2c",
    audience: "Para estudantes e concurseiros individuais",
    title: "Pro Estudantes",
    price: "R$ 49",
    cadence: "por mês",
    summary:
      "Preparação individual completa com IA ilimitada, revisão ativa e painel de evolução.",
    limits: [
      "Editais e planos de estudo ilimitados",
      "Geração ilimitada de resumos, flashcards e questões com IA",
      "Gamificação completa (nível, streak, pontos) e Meu Progresso",
      "Exportação completa do caderno organizado em Markdown",
    ],
    recommendedFor: "b2c",
    ctaLabel: "Fazer upgrade para Pro B2C",
  },
  {
    id: "enterprise_b2b",
    audience: "Para faculdades, cursos e coordenações",
    title: "Enterprise Instituições",
    price: "Sob consulta",
    cadence: "contrato institucional",
    summary:
      "Gestão pedagógica centralizada para distribuir editais padrão e elevar a aprovação das turmas.",
    limits: [
      "Painel Executivo da Coordenação com métricas agregadas",
      "Gestão ilimitada de turmas e Editais Padrão",
      "Alerta de matérias críticas e alunos em risco de reprovação",
      "Modo Simular Visão do Aluno e marca institucional no workspace",
    ],
    recommendedFor: "b2b",
    ctaLabel: "Ativar Enterprise B2B",
  },
];

export const PlanUpgradeView: React.FC<PlanUpgradeViewProps> = ({
  currentPlanTier,
  currentEnvironment,
  authMode,
  onChangePlanTier,
  onGoToEnvironment,
}) => {
  const [updatingTier, setUpdatingTier] = useState<PlanTier | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSelect = async (tier: PlanTier) => {
    setErrorMsg(null);
    setUpdatingTier(tier);
    try {
      await onChangePlanTier(tier);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Não foi possível atualizar o plano."
      );
    } finally {
      setUpdatingTier(null);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-[#1E3A5F]">
            Assinatura & Limites da Conta · {authMode === "supabase" ? "Sincronizado em profiles" : "Sessão Demo"}
          </div>
          <h2 className="mt-1 font-editorial text-xl font-semibold text-slate-900">
            Planos e Upgrade da Plataforma
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Gerencie seu <span className="font-mono text-xs text-slate-800">plan_tier</span> ativo e desbloqueie recursos individuais ou institucionais conforme sua necessidade.
          </p>
        </div>

        <div className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-md shrink-0">
          <div className="text-[11px] text-slate-500">Plano atual</div>
          <div className="text-sm font-semibold text-[#1E3A5F]">
            {PLAN_LABELS[currentPlanTier]}
          </div>
        </div>
      </section>

      {errorMsg && (
        <div className="px-4 py-3 text-xs font-medium text-red-800 bg-red-50 border border-red-200 rounded-md">
          {errorMsg}
        </div>
      )}

      {/* 3-Column Tier Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {TIER_DEFINITIONS.map((tier) => {
          const isCurrent = tier.id === currentPlanTier;
          const isRecommended =
            !isCurrent && tier.recommendedFor === currentEnvironment;
          const isUpdating = updatingTier === tier.id;

          return (
            <section
              key={tier.id}
              className={`bg-white rounded-lg p-6 flex flex-col justify-between border transition-colors ${
                isCurrent
                  ? "border-[#1E3A5F]"
                  : isRecommended
                    ? "border-slate-400"
                    : "border-slate-200"
              }`}
            >
              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-[#1E3A5F]">
                      {tier.audience}
                    </span>
                    {isCurrent && (
                      <span className="font-mono text-[11px] font-semibold text-emerald-700 shrink-0">
                        Plano atual
                      </span>
                    )}
                    {!isCurrent && isRecommended && (
                      <span className="font-mono text-[11px] font-semibold text-slate-700 shrink-0">
                        Recomendado
                      </span>
                    )}
                  </div>

                  <h3 className="font-editorial text-xl font-semibold text-slate-900">
                    {tier.title}
                  </h3>
                </div>

                <div className="flex items-baseline gap-1.5 pt-1">
                  <span className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
                    {tier.price}
                  </span>
                  <span className="text-xs text-slate-500">{tier.cadence}</span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {tier.summary}
                </p>

                <ul className="space-y-2.5 pt-4 border-t border-slate-100 text-xs text-slate-700">
                  {tier.limits.map((limit) => (
                    <li key={limit} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-[#1E3A5F] mt-0.5 shrink-0" />
                      <span>{limit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100 space-y-2">
                <button
                  type="button"
                  disabled={isCurrent || updatingTier !== null}
                  onClick={() => handleSelect(tier.id)}
                  className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    isCurrent
                      ? "bg-slate-100 text-slate-500 cursor-default"
                      : "bg-[#1E3A5F] text-white hover:bg-[#162D4A] disabled:opacity-50"
                  }`}
                >
                  {isCurrent ? (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                      <span>Plano ativo nesta conta</span>
                    </>
                  ) : (
                    <>
                      <span>{isUpdating ? "Atualizando..." : tier.ctaLabel}</span>
                      <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                    </>
                  )}
                </button>

                {isCurrent &&
                  tier.id === "enterprise_b2b" &&
                  currentEnvironment === "b2c" &&
                  onGoToEnvironment && (
                    <button
                      type="button"
                      onClick={() => onGoToEnvironment("b2b")}
                      className="w-full py-2 text-xs font-medium text-[#1E3A5F] hover:underline"
                    >
                      Acessar ambiente Toth Instituições (B2B) →
                    </button>
                  )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};
