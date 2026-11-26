import React, { useState } from "react";
import {
  ArrowRight,
  Building2,
  Check,
  GraduationCap,
  KeyRound,
  Scale,
} from "lucide-react";
import {
  isSupabaseConfigured,
  signInWithSupabase,
  signUpWithSupabase,
} from "../lib/supabaseAuth";
import type { AppEnvironment, AuthSession } from "../types";

interface PortalSelectionViewProps {
  onSelectSession: (session: AuthSession) => void;
}

export const PortalSelectionView: React.FC<PortalSelectionViewProps> = ({
  onSelectSession,
}) => {
  const [supabaseOpenFor, setSupabaseOpenFor] = useState<AppEnvironment | null>(
    null
  );
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const supabaseReady = isSupabaseConfigured();

  const handleOpenSupabaseForm = (env: AppEnvironment) => {
    if (supabaseOpenFor === env) {
      setSupabaseOpenFor(null);
      setErrorMsg(null);
      setInfoMsg(null);
      return;
    }
    setSupabaseOpenFor(env);
    setErrorMsg(null);
    setInfoMsg(null);
  };

  const handleSupabaseSubmit = async (
    e: React.FormEvent,
    env: AppEnvironment
  ) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setLoading(true);
    try {
      const result =
        authMode === "signin"
          ? await signInWithSupabase(email.trim(), password)
          : await signUpWithSupabase(email.trim(), password);

      if (result.requiresEmailConfirmation) {
        setInfoMsg(
          "Cadastro realizado. Confirme o link enviado ao seu e-mail antes de entrar."
        );
        return;
      }

      onSelectSession({
        mode: "supabase",
        environment: env,
        email: result.email,
        accessToken: result.accessToken,
      });
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Erro ao autenticar com Supabase."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-slate-900 flex flex-col">
      {/* Minimal Top Brand Bar (Three-zone contract) */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-8">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-md bg-[#1E3A5F] text-white flex items-center justify-center shrink-0">
              <Scale className="w-4 h-4" />
            </div>
            <span className="font-editorial text-xl font-semibold tracking-tight text-slate-900 whitespace-nowrap">
              Toth
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-6 text-xs font-medium text-slate-500">
            <span className="whitespace-nowrap">Organização de editais</span>
            <span className="whitespace-nowrap">Resumos e revisões com IA</span>
            <span className="whitespace-nowrap">Gestão institucional</span>
          </div>

          <div className="text-xs font-medium text-slate-600 whitespace-nowrap shrink-0">
            Selecione seu ambiente
          </div>
        </div>
      </header>

      {/* Main Selection Canvas */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-5xl space-y-10">
          {/* Editorial Heading */}
          <div className="max-w-2xl space-y-2.5">
            <div className="text-xs font-medium text-[#1E3A5F]">
              Plataforma de estudos e gestão acadêmica
            </div>
            <h1 className="font-editorial text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 leading-tight text-balance">
              Escolha o ambiente ideal para o seu perfil de acesso
            </h1>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              A Toth separa a jornada individual de estudos da gestão pedagógica de turmas. Entre rapidamente pelo Modo Demonstração ou conecte sua conta via Supabase.
            </p>
          </div>

          {/* Two Distinct Environment Entry Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Card 1: B2C Estudantes */}
            <section className="bg-white border border-slate-200 rounded-lg p-7 space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-medium text-[#1E3A5F]">
                    Jornada Individual · Concursos e Certificações
                  </div>
                  <h2 className="font-editorial text-2xl font-semibold text-slate-900">
                    Toth Estudantes (B2C)
                  </h2>
                </div>
                <div className="w-10 h-10 rounded-md bg-slate-100 text-[#1E3A5F] flex items-center justify-center shrink-0">
                  <GraduationCap className="w-5 h-5" />
                </div>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed">
                Workspace pessoal para organizar seu edital em etapas, transformar materiais em revisões com IA e acompanhar sua evolução diária.
              </p>

              <ul className="space-y-2 text-xs text-slate-700 border-t border-b border-slate-100 py-4">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#1E3A5F] shrink-0" />
                  <span>Meu Kanban de Estudos e Importador de Edital/Fontes</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#1E3A5F] shrink-0" />
                  <span>Gerador de resumos, flashcards e questões com IA</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#1E3A5F] shrink-0" />
                  <span>Gamificação individual (nível, streak, pontos) e Meu Progresso</span>
                </li>
              </ul>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() =>
                    onSelectSession({
                      mode: "demo",
                      environment: "b2c",
                      email: "estudante.demo@toth.app",
                    })
                  }
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#1E3A5F] rounded-md hover:bg-[#162D4A] transition-colors whitespace-nowrap"
                >
                  <span>Entrar no Modo Demonstração (B2C)</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenSupabaseForm("b2c")}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap"
                >
                  <KeyRound className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {supabaseOpenFor === "b2c"
                      ? "Fechar login via Supabase"
                      : "Entrar com Supabase"}
                  </span>
                </button>
              </div>

              {supabaseOpenFor === "b2c" && (
                <form
                  onSubmit={(e) => handleSupabaseSubmit(e, "b2c")}
                  className="pt-4 border-t border-slate-200 space-y-3"
                >
                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
                    <button
                      type="button"
                      onClick={() => setAuthMode("signin")}
                      className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${
                        authMode === "signin"
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-600"
                      }`}
                    >
                      Entrar
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMode("signup")}
                      className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${
                        authMode === "signup"
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-600"
                      }`}
                    >
                      Criar conta
                    </button>
                  </div>

                  {!supabaseReady && (
                    <div className="p-2.5 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded">
                      Variáveis <span className="font-mono">VITE_SUPABASE_URL</span> e{" "}
                      <span className="font-mono">VITE_SUPABASE_ANON_KEY</span> não configuradas. Use o botão acima para acessar via Modo Demonstração.
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      E-mail
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="voce@email.com"
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Senha
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                    />
                  </div>

                  {errorMsg && (
                    <p className="text-xs text-red-700 font-medium">{errorMsg}</p>
                  )}
                  {infoMsg && (
                    <p className="text-xs text-emerald-700 font-medium">{infoMsg}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 disabled:opacity-50"
                  >
                    {loading
                      ? "Conectando ao Supabase..."
                      : authMode === "signin"
                        ? "Autenticar como Estudante"
                        : "Cadastrar conta de Estudante"}
                  </button>
                </form>
              )}
            </section>

            {/* Card 2: B2B Instituições */}
            <section className="bg-white border border-slate-200 rounded-lg p-7 space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-medium text-[#1E3A5F]">
                    Coordenação Pedagógica · Faculdades e Cursos
                  </div>
                  <h2 className="font-editorial text-2xl font-semibold text-slate-900">
                    Toth Instituições (B2B)
                  </h2>
                </div>
                <div className="w-10 h-10 rounded-md bg-slate-100 text-[#1E3A5F] flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed">
                Ambiente executivo para coordenadores gerenciarem turmas, distribuírem editais padrão (ex.: OAB) e acompanharem riscos de reprovação.
              </p>

              <ul className="space-y-2 text-xs text-slate-700 border-t border-b border-slate-100 py-4">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#1E3A5F] shrink-0" />
                  <span>Painel Executivo: conclusão do edital, gargalos e alunos em risco</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#1E3A5F] shrink-0" />
                  <span>Gestão de Turmas e Editais Padrão com distribuição em 1 clique</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#1E3A5F] shrink-0" />
                  <span>Modo &ldquo;Simular Visão do Aluno&rdquo; para validação do coordenador</span>
                </li>
              </ul>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() =>
                    onSelectSession({
                      mode: "demo",
                      environment: "b2b",
                      email: "coordenacao.demo@toth.app",
                    })
                  }
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#1E3A5F] rounded-md hover:bg-[#162D4A] transition-colors whitespace-nowrap"
                >
                  <span>Entrar no Modo Demonstração (B2B)</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenSupabaseForm("b2b")}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap"
                >
                  <KeyRound className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {supabaseOpenFor === "b2b"
                      ? "Fechar login via Supabase"
                      : "Entrar com Supabase"}
                  </span>
                </button>
              </div>

              {supabaseOpenFor === "b2b" && (
                <form
                  onSubmit={(e) => handleSupabaseSubmit(e, "b2b")}
                  className="pt-4 border-t border-slate-200 space-y-3"
                >
                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
                    <button
                      type="button"
                      onClick={() => setAuthMode("signin")}
                      className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${
                        authMode === "signin"
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-600"
                      }`}
                    >
                      Entrar
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMode("signup")}
                      className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${
                        authMode === "signup"
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-600"
                      }`}
                    >
                      Criar conta
                    </button>
                  </div>

                  {!supabaseReady && (
                    <div className="p-2.5 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded">
                      Variáveis <span className="font-mono">VITE_SUPABASE_URL</span> e{" "}
                      <span className="font-mono">VITE_SUPABASE_ANON_KEY</span> não configuradas. Use o botão acima para acessar via Modo Demonstração.
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      E-mail institucional
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="coordenacao@instituicao.edu.br"
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Senha
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                    />
                  </div>

                  {errorMsg && (
                    <p className="text-xs text-red-700 font-medium">{errorMsg}</p>
                  )}
                  {infoMsg && (
                    <p className="text-xs text-emerald-700 font-medium">{infoMsg}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 disabled:opacity-50"
                  >
                    {loading
                      ? "Conectando ao Supabase..."
                      : authMode === "signin"
                        ? "Autenticar como Instituição"
                        : "Cadastrar conta Institucional"}
                  </button>
                </form>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};
