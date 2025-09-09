type Props = {
  user?: { email?: string };
  onLogout: () => void;
};

export default function Navbar({ user, onLogout }: Props) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <span className="inline-grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-white">KG</span>
          <h1 className="text-lg font-semibold text-slate-800">Sistema KG do Amor</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-slate-500 md:block">
            {user?.email ?? "usuário"}
          </span>
          <button
            onClick={onLogout}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
          >
            Sair
          </button>
        </div>
      </div>
    </header>
  );
}
