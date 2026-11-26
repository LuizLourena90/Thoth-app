export interface SupabaseAuthResult {
  email: string;
  accessToken?: string;
  requiresEmailConfirmation?: boolean;
}

function getSupabaseConfig(): { url: string; anonKey: string } | null {
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();
  if (!url || !anonKey) {
    return null;
  }
  return { url: url.replace(/\/+$/, ""), anonKey };
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfig() !== null;
}

export async function signInWithSupabase(
  email: string,
  password: string
): Promise<SupabaseAuthResult> {
  const cfg = getSupabaseConfig();
  if (!cfg) {
    throw new Error(
      "Supabase não configurado neste ambiente. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nas variáveis de ambiente ou entre pelo Modo Demonstração."
    );
  }

  const res = await fetch(`${cfg.url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: cfg.anonKey,
    },
    body: JSON.stringify({ email, password }),
  });

  const data = (await res.json()) as {
    access_token?: string;
    user?: { email?: string };
    error_description?: string;
    msg?: string;
  };

  if (!res.ok) {
    throw new Error(
      data.error_description ||
        data.msg ||
        "Não foi possível autenticar no Supabase. Verifique e-mail e senha."
    );
  }

  return {
    email: data.user?.email ?? email,
    accessToken: data.access_token,
  };
}

export async function signUpWithSupabase(
  email: string,
  password: string
): Promise<SupabaseAuthResult> {
  const cfg = getSupabaseConfig();
  if (!cfg) {
    throw new Error(
      "Supabase não configurado neste ambiente. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nas variáveis de ambiente ou entre pelo Modo Demonstração."
    );
  }

  const res = await fetch(`${cfg.url}/auth/v1/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: cfg.anonKey,
    },
    body: JSON.stringify({ email, password }),
  });

  const data = (await res.json()) as {
    access_token?: string;
    user?: { email?: string };
    error_description?: string;
    msg?: string;
  };

  if (!res.ok) {
    throw new Error(
      data.error_description ||
        data.msg ||
        "Não foi possível concluir o cadastro no Supabase."
    );
  }

  return {
    email: data.user?.email ?? email,
    accessToken: data.access_token,
    requiresEmailConfirmation: !data.access_token,
  };
}

export async function signOutSupabase(accessToken?: string): Promise<void> {
  const cfg = getSupabaseConfig();
  if (!cfg || !accessToken) return;
  try {
    await fetch(`${cfg.url}/auth/v1/logout`, {
      method: "POST",
      headers: {
        apikey: cfg.anonKey,
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch {
    // Best-effort remote sign-out; local memory session is always cleared
  }
}
