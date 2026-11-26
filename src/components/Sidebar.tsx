import React, { useState } from "react";
import {
  BookOpenCheck,
  Building2,
  Check,
  ChevronDown,
  ChevronUp,
  Columns3,
  Download,
  FileText,
  Pencil,
  Plus,
  Scale,
  SlidersHorizontal,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { ExamTrack, WorkspaceTab } from "../types";

interface SidebarProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  institutionName: string;
  onUpdateInstitutionName: (name: string) => void;
  tracks: ExamTrack[];
  activeTrackId: string | null;
  onSelectTrack: (trackId: string) => void;
  onCreateTrack: (input: { title: string; banca: string; targetDate: string }) => void;
  onExportTrack: () => void;
  onLoadOabDemo: () => void;
  onClearAll: () => void;
  cardCountByTrack: Record<string, number>;
  revisionReadyCount: number;
  totalStudents: number;
  hasActiveTrackCards: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  institutionName,
  onUpdateInstitutionName,
  tracks,
  activeTrackId,
  onSelectTrack,
  onCreateTrack,
  onExportTrack,
  onLoadOabDemo,
  onClearAll,
  cardCountByTrack,
  revisionReadyCount,
  totalStudents,
  hasActiveTrackCards,
}) => {
  const [editingInst, setEditingInst] = useState(false);
  const [instDraft, setInstDraft] = useState(institutionName);
  const [showNewTrackForm, setShowNewTrackForm] = useState(false);
  const [newTrackTitle, setNewTrackTitle] = useState("");
  const [newTrackBanca, setNewTrackBanca] = useState("");
  const [demoMenuOpen, setDemoMenuOpen] = useState(false);

  const activeTrackCardCount = activeTrackId ? cardCountByTrack[activeTrackId] ?? 0 : 0;

  const navItems: Array<{
    id: WorkspaceTab;
    label: string;
    icon: React.ReactNode;
    count?: number;
  }> = [
    {
      id: "kanban",
      label: "Kanban do Edital",
      icon: <Columns3 className="w-4 h-4 shrink-0" />,
      count: activeTrackCardCount,
    },
    {
      id: "sources",
      label: "Edital & Fontes IA",
      icon: <FileText className="w-4 h-4 shrink-0" />,
    },
    {
      id: "revision",
      label: "Central de Revisão",
      icon: <BookOpenCheck className="w-4 h-4 shrink-0" />,
      count: revisionReadyCount,
    },
    {
      id: "coordination",
      label: "Coordenação B2B",
      icon: <Building2 className="w-4 h-4 shrink-0" />,
    },
  ];

  const handleSaveInstitution = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateInstitutionName(instDraft.trim() || "Minha Instituição");
    setEditingInst(false);
  };

  const handleCreateTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrackTitle.trim()) return;
    onCreateTrack({
      title: newTrackTitle.trim(),
      banca: newTrackBanca.trim() || "Geral",
      targetDate: "A definir",
    });
    setNewTrackTitle("");
    setNewTrackBanca("");
    setShowNewTrackForm(false);
  };

  return (
    <aside className="w-full lg:w-[256px] shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col justify-between">
      <div>
        {/* Brand Wordmark */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-[#1E3A5F] text-white flex items-center justify-center shrink-0">
            <Scale className="w-4 h-4" />
          </div>
          <span className="font-editorial text-xl font-semibold tracking-tight text-slate-900 whitespace-nowrap">
            Toth
          </span>
        </div>

        {/* Institutional Tenant Context (Editable, zero fictional defaults) */}
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-500">Workspace institucional</span>
            {!editingInst && (
              <button
                type="button"
                onClick={() => {
                  setInstDraft(institutionName);
                  setEditingInst(true);
                }}
                title="Editar nome da instituição"
                className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
              >
                <Pencil className="w-3 h-3" />
              </button>
            )}
          </div>

          {editingInst ? (
            <form onSubmit={handleSaveInstitution} className="mt-1.5 flex items-center gap-1.5">
              <input
                type="text"
                value={instDraft}
                onChange={(e) => setInstDraft(e.target.value)}
                placeholder="Nome da instituição"
                autoFocus
                className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#1E3A5F]"
              />
              <button
                type="submit"
                className="p-1.5 bg-[#1E3A5F] text-white rounded hover:bg-[#162D4A]"
                aria-label="Salvar nome da instituição"
              >
                <Check className="w-3 h-3" />
              </button>
            </form>
          ) : (
            <div className="mt-1 text-sm font-semibold text-slate-900 leading-snug truncate">
              {institutionName.trim() || "Minha Instituição"}
            </div>
          )}

          <div className="mt-0.5 text-xs text-slate-500 font-mono tabular-nums">
            {totalStudents} {totalStudents === 1 ? "aluno cadastrado" : "alunos cadastrados"}
          </div>
        </div>

        {/* Primary Workspace Navigation */}
        <nav className="p-3 space-y-1" aria-label="Navegação principal">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                  isActive
                    ? "bg-[#1E3A5F] text-white"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span className="flex items-center gap-2.5 truncate">
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                </span>
                {typeof item.count === "number" && (
                  <span
                    className={`font-mono text-xs tabular-nums ${
                      isActive ? "text-slate-200" : "text-slate-500"
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Active Exam Track Selector */}
        <div className="px-4 pt-3 pb-4 border-t border-slate-100">
          <div className="px-1 mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Planos e editais</span>
            <button
              type="button"
              onClick={() => setShowNewTrackForm((prev) => !prev)}
              title="Criar novo plano"
              className="p-1 text-slate-500 hover:text-[#1E3A5F] hover:bg-slate-100 rounded transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {showNewTrackForm && (
            <form onSubmit={handleCreateTrackSubmit} className="mb-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-md space-y-2">
              <input
                type="text"
                required
                value={newTrackTitle}
                onChange={(e) => setNewTrackTitle(e.target.value)}
                placeholder="Nome do plano ou edital"
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#1E3A5F]"
              />
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={newTrackBanca}
                  onChange={(e) => setNewTrackBanca(e.target.value)}
                  placeholder="Banca (opcional)"
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#1E3A5F]"
                />
                <button
                  type="submit"
                  className="px-2.5 py-1.5 text-xs font-medium text-white bg-[#1E3A5F] rounded hover:bg-[#162D4A] shrink-0"
                >
                  Criar
                </button>
              </div>
            </form>
          )}

          {tracks.length === 0 ? (
            <div className="px-2 py-3 text-xs text-slate-500 border border-dashed border-slate-200 rounded-md text-center">
              Nenhum plano criado ainda.
            </div>
          ) : (
            <div className="space-y-1">
              {tracks.map((track) => {
                const selected = track.id === activeTrackId;
                return (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() => onSelectTrack(track.id)}
                    className={`w-full text-left px-3 py-2 rounded-md border transition-colors ${
                      selected
                        ? "border-[#1E3A5F] bg-slate-50 text-slate-900"
                        : "border-transparent hover:bg-slate-50 text-slate-600"
                    }`}
                  >
                    <div className="text-xs font-semibold truncate">{track.title}</div>
                    <div className="mt-0.5 text-[11px] text-slate-500 flex items-center gap-1.5 font-mono tabular-nums">
                      <span>{track.banca}</span>
                      <span aria-hidden="true">·</span>
                      <span>{cardCountByTrack[track.id] ?? 0} itens</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Institutional Export & Discreet Demo Settings Footer */}
      <div className="p-4 border-t border-slate-200 space-y-3">
        <button
          type="button"
          onClick={onExportTrack}
          disabled={!hasActiveTrackCards}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 hover:text-slate-900 disabled:opacity-45 disabled:pointer-events-none transition-colors whitespace-nowrap"
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          <span>Exportar caderno do edital</span>
        </button>

        <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setDemoMenuOpen((prev) => !prev)}
            aria-expanded={demoMenuOpen}
            className="w-full flex items-center justify-between gap-2 px-2 py-1.5 text-[11px] font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded transition-colors"
          >
            <span className="flex items-center gap-1.5 truncate">
              <SlidersHorizontal className="w-3.5 h-3.5 shrink-0 text-slate-400" />
              <span className="truncate">Configurações de Demonstração</span>
            </span>
            {demoMenuOpen ? (
              <ChevronUp className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            )}
          </button>

          {demoMenuOpen && (
            <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-md space-y-2.5">
              <div>
                <label
                  htmlFor="demo-partner-institution"
                  className="block text-[11px] font-medium text-slate-600 mb-1"
                >
                  Nome da Instituição Parceira
                </label>
                <input
                  id="demo-partner-institution"
                  type="text"
                  value={institutionName}
                  onChange={(e) => onUpdateInstitutionName(e.target.value)}
                  placeholder="Ex.: Faculdade de Direito..."
                  className="w-full px-2.5 py-1.5 text-xs bg-white text-slate-900 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#1E3A5F]"
                />
              </div>

              <div className="flex flex-col gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={onLoadOabDemo}
                  className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-white bg-[#1E3A5F] rounded hover:bg-[#162D4A] transition-colors whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>Carregar Exemplo OAB</span>
                </button>

                <button
                  type="button"
                  onClick={onClearAll}
                  className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-100 hover:text-slate-900 transition-colors whitespace-nowrap"
                >
                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Limpar Tudo</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
