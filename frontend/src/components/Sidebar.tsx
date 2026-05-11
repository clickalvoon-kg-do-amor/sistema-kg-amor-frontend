import { NavLink } from "react-router-dom";
import {
  BarChart3,
  Boxes,
  LayoutDashboard,
  Package,
  Tags,
  Truck,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cx } from "./ui";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
};

const sections: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Visao geral",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
      { to: "/painel-gerenciador", label: "Painel Gerenciador", icon: BarChart3 },
    ],
  },
  {
    label: "Operacao",
    items: [
      { to: "/celulas", label: "Celulas", icon: UsersRound },
      { to: "/recebimentos", label: "Recebimentos", icon: Package },
      { to: "/estoque", label: "Estoque", icon: Boxes },
      { to: "/retiradas", label: "Retiradas", icon: Truck },
      { to: "/categorias", label: "Categorias", icon: Tags },
    ],
  },
];

export default function Sidebar({ isOpen, onClose }: Props) {
  return (
    <>
      <button
        type="button"
        onClick={onClose}
        className={cx(
          "fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm transition lg:hidden",
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
        aria-label="Fechar menu"
      />

      <aside
        className={cx(
          "fixed inset-y-0 left-0 z-50 w-[286px] max-w-[calc(100vw-1.5rem)] transition-transform duration-300 lg:sticky lg:top-[5rem] lg:z-10 lg:block lg:w-[280px] lg:max-w-none lg:self-start",
          isOpen ? "translate-x-0" : "-translate-x-[110%] lg:translate-x-0"
        )}
      >
        <div className="flex h-full flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,#0b1120_0%,#111827_100%)] p-3 text-white shadow-[0_28px_56px_-34px_rgba(15,23,42,0.52)] backdrop-blur">
          <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-white/5 px-4 py-4 shadow-lg shadow-black/15">
            <div
              className="pointer-events-none absolute inset-x-4 top-0 h-1 rounded-full"
              style={{ background: "var(--brand-gradient)" }}
            />
            <div className="flex items-center gap-3">
              <span
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-extrabold tracking-[0.22em] text-white"
                style={{ background: "var(--brand-gradient)" }}
              >
                KG
              </span>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
                  Sistema integrado
                </div>
                <div className="mt-1 text-base font-semibold tracking-tight text-white">
                  KG do Amor
                </div>
              </div>
            </div>
            <div className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Navegacao
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Mesma base visual e estrutural do 360 para a operacao mensal do KG.
            </p>
          </div>

          <nav className="mt-4 flex-1 space-y-5 overflow-y-auto px-1 pb-2">
            {sections.map((section) => (
              <div key={section.label}>
                <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  {section.label}
                </div>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        onClick={onClose}
                        className={({ isActive }) =>
                          cx("sidebar-link", isActive && "sidebar-link-active")
                        }
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
}
