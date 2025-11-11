import { NavLink } from "react-router-dom";

const itemClass =
  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100";
const activeClass = "bg-slate-900 text-white hover:bg-slate-900";

export default function Sidebar() {
  return (
    <aside className="w-full border-r border-slate-200 bg-white md:w-64">
      <nav className="p-3">
        <NavLink
          to="/"
          end
          className={({ isActive }) => `${itemClass} ${isActive ? activeClass : ""}`}
        >
          <span>📊</span> Dashboard
        </NavLink>
        <NavLink
          to="/celulas"
          className={({ isActive }) => `${itemClass} ${isActive ? activeClass : ""}`}
        >
          <span>🏠</span> Células
        </NavLink>
        <NavLink
          to="/recebimentos"
          className={({ isActive }) => `${itemClass} ${isActive ? activeClass : ""}`}
        >
          <span>📥</span> Recebimentos
        </NavLink>

        {/* --- LINK ADICIONADO --- */}
        <hr className="my-3 border-slate-200" />
        <NavLink
          to="/painel-gerenciador"
          className={({ isActive }) => `${itemClass} ${isActive ? activeClass : ""}`}
        >
          <span>📈</span> Painel Gerenciador
        </NavLink>
        
      </nav>
    </aside>
  );
}