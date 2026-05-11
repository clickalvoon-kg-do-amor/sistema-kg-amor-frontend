import { LogOut, Menu, PanelLeftClose, ShieldCheck } from "lucide-react";

type Props = {
  user?: { email?: string };
  onLogout: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
};

export default function Navbar({ user, onLogout, sidebarOpen, onToggleSidebar }: Props) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/60 bg-[rgba(248,250,252,0.78)] backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] w-full max-w-[1600px] items-center justify-between gap-4 px-3 sm:px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="icon-button lg:hidden"
            aria-label={sidebarOpen ? "Fechar menu" : "Abrir menu"}
          >
            {sidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="flex items-center gap-3">
            <span
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-extrabold tracking-[0.18em] text-white shadow-lg"
              style={{ background: "var(--brand-gradient)" }}
            >
              KG
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
                  Sistema KG do Amor
                </h1>
                <span className="pill hidden sm:inline-flex">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Base 360
                </span>
              </div>
              <p className="hidden text-xs text-slate-500 sm:block">
                Estrutura sincronizada com o 360 e operacao dedicada do KG.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden rounded-full border border-white/80 bg-white/80 px-3 py-2 text-sm text-slate-600 shadow-sm md:block">
            {user?.email ?? "usuario"}
          </span>
          <button
            onClick={onLogout}
            className="button-base button-secondary"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </div>
    </header>
  );
}
