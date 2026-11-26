import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  AppEnvironment,
  EditalCard,
  ExamTrack,
  PlanTier,
  StudyPlanBoardData,
  UserProfile,
} from "../types";

function getSupabaseEnv(): { url: string; anonKey: string } | null {
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  const anonKey = (
    import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  )?.trim();
  if (!url || !anonKey) {
    return null;
  }
  return { url: url.replace(/\/+$/, ""), anonKey };
}

const supabaseEnv = getSupabaseEnv();

export const supabase: SupabaseClient | null = supabaseEnv
  ? createClient(supabaseEnv.url, supabaseEnv.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

export function isSupabaseConfigured(): boolean {
  return supabase !== null;
}

function normalizeRole(value: unknown, fallback: AppEnvironment): AppEnvironment {
  return value === "b2b" || value === "b2c" ? value : fallback;
}

function normalizePlanTier(value: unknown): PlanTier {
  if (value === "pro_b2c" || value === "enterprise_b2b" || value === "free") {
    return value;
  }
  return "free";
}

function normalizeBoardData(raw: unknown): StudyPlanBoardData {
  if (!raw || typeof raw !== "object") {
    return {};
  }
  const obj = raw as Record<string, unknown>;
  if ("b2c" in obj || "b2b" in obj) {
    return obj as StudyPlanBoardData;
  }
  // Fallback if an external row stored flat { tracks, cards, activeTrackId }
  if (Array.isArray(obj.cards) || Array.isArray(obj.tracks)) {
    return {
      b2c: {
        tracks: Array.isArray(obj.tracks) ? (obj.tracks as ExamTrack[]) : [],
        cards: Array.isArray(obj.cards) ? (obj.cards as EditalCard[]) : [],
        activeTrackId:
          typeof obj.activeTrackId === "string" ? obj.activeTrackId : null,
        activity: {
          streakDays: 0,
          lastActiveDate: null,
          quizzesAnswered: 0,
          quizzesCorrect: 0,
        },
      },
    };
  }
  return {};
}

export async function fetchOrCreateProfile(
  userId: string,
  preferredRole: AppEnvironment,
  metadataRole?: unknown,
  metadataPlanTier?: unknown
): Promise<UserProfile> {
  if (!supabase) {
    throw new Error("Cliente Supabase não configurado.");
  }

  const { data: existing, error: selectError } = await supabase
    .from("profiles")
    .select("id, role, plan_tier")
    .eq("id", userId)
    .maybeSingle();

  if (selectError) {
    throw new Error(
      `Erro ao consultar tabela profiles: ${selectError.message}`
    );
  }

  if (existing) {
    return {
      id: existing.id as string,
      role: normalizeRole(existing.role, preferredRole),
      plan_tier: normalizePlanTier(existing.plan_tier),
    };
  }

  const resolvedRole = normalizeRole(metadataRole, preferredRole);
  const resolvedTier = normalizePlanTier(metadataPlanTier);

  const { data: created, error: insertError } = await supabase
    .from("profiles")
    .insert({
      id: userId,
      role: resolvedRole,
      plan_tier: resolvedTier,
    })
    .select("id, role, plan_tier")
    .single();

  if (insertError) {
    throw new Error(
      `Erro ao criar perfil na tabela profiles: ${insertError.message}`
    );
  }

  return {
    id: created.id as string,
    role: normalizeRole(created.role, resolvedRole),
    plan_tier: normalizePlanTier(created.plan_tier),
  };
}

export async function updateProfilePlanTier(
  userId: string,
  planTier: PlanTier,
  role?: AppEnvironment
): Promise<UserProfile> {
  if (!supabase) {
    throw new Error("Cliente Supabase não configurado.");
  }

  const payload: { plan_tier: PlanTier; role?: AppEnvironment } = {
    plan_tier: planTier,
  };
  if (role) {
    payload.role = role;
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", userId)
    .select("id, role, plan_tier")
    .single();

  if (error) {
    throw new Error(`Erro ao atualizar plano em profiles: ${error.message}`);
  }

  return {
    id: data.id as string,
    role: normalizeRole(data.role, role ?? "b2c"),
    plan_tier: normalizePlanTier(data.plan_tier),
  };
}

export async function updateProfileRole(
  userId: string,
  role: AppEnvironment
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId);
  if (error) {
    throw new Error(`Erro ao atualizar perfil: ${error.message}`);
  }
}

export async function loadStudyPlanBoardData(
  userId: string
): Promise<StudyPlanBoardData | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("study_plans")
    .select("id, board_data")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Erro ao carregar study_plans: ${error.message}`
    );
  }

  if (!data) return null;
  return normalizeBoardData(data.board_data);
}

export async function saveStudyPlanBoardData(
  userId: string,
  boardData: StudyPlanBoardData
): Promise<void> {
  if (!supabase) return;

  const { data: existing, error: lookupError } = await supabase
    .from("study_plans")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (lookupError) {
    throw new Error(
      `Erro ao verificar study_plans: ${lookupError.message}`
    );
  }

  if (existing?.id) {
    const { error: updateError } = await supabase
      .from("study_plans")
      .update({ board_data: boardData })
      .eq("id", existing.id);

    if (updateError) {
      throw new Error(
        `Erro ao atualizar study_plans: ${updateError.message}`
      );
    }
  } else {
    const { error: insertError } = await supabase
      .from("study_plans")
      .insert({
        user_id: userId,
        board_data: boardData,
      });

    if (insertError) {
      throw new Error(
        `Erro ao salvar study_plans: ${insertError.message}`
      );
    }
  }
}

export interface SupabaseAuthBundle {
  userId: string;
  email: string;
  profile?: UserProfile;
  boardData?: StudyPlanBoardData | null;
  requiresEmailConfirmation?: boolean;
}

export async function signInWithSupabase(
  email: string,
  password: string,
  preferredRole: AppEnvironment
): Promise<SupabaseAuthBundle> {
  if (!supabase) {
    throw new Error(
      "Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY ou use 'Acessar Modo Demo'."
    );
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    throw new Error(
      error?.message ||
        "Não foi possível autenticar no Supabase. Verifique e-mail e senha."
    );
  }

  const profile = await fetchOrCreateProfile(
    data.user.id,
    preferredRole,
    data.user.user_metadata?.role,
    data.user.user_metadata?.plan_tier
  );

  const boardData = await loadStudyPlanBoardData(data.user.id);

  return {
    userId: data.user.id,
    email: data.user.email ?? email,
    profile,
    boardData,
  };
}

export async function signUpWithSupabase(
  email: string,
  password: string,
  role: AppEnvironment
): Promise<SupabaseAuthBundle> {
  if (!supabase) {
    throw new Error(
      "Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY ou use 'Acessar Modo Demo'."
    );
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role,
        plan_tier: "free" satisfies PlanTier,
      },
    },
  });

  if (error || !data.user) {
    throw new Error(
      error?.message || "Não foi possível concluir o cadastro no Supabase."
    );
  }

  if (!data.session) {
    return {
      userId: data.user.id,
      email: data.user.email ?? email,
      requiresEmailConfirmation: true,
    };
  }

  const profile = await fetchOrCreateProfile(data.user.id, role, role, "free");
  const boardData = await loadStudyPlanBoardData(data.user.id);

  return {
    userId: data.user.id,
    email: data.user.email ?? email,
    profile,
    boardData,
  };
}

export async function restoreSupabaseSession(): Promise<SupabaseAuthBundle | null> {
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.user) {
    return null;
  }

  const user = data.session.user;
  const profile = await fetchOrCreateProfile(
    user.id,
    normalizeRole(user.user_metadata?.role, "b2c"),
    user.user_metadata?.role,
    user.user_metadata?.plan_tier
  );
  const boardData = await loadStudyPlanBoardData(user.id);

  return {
    userId: user.id,
    email: user.email ?? "",
    profile,
    boardData,
  };
}

export async function signOutSupabase(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}
