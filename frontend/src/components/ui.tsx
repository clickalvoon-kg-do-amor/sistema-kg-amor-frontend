import type { ReactNode } from "react";
import { X } from "lucide-react";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <section className={cx("app-hero", className)}>
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          {eyebrow ? <div className="app-kicker">{eyebrow}</div> : null}
          <h1 className="app-title">{title}</h1>
          {description ? <p className="app-subtitle">{description}</p> : null}
        </div>
        {actions ? <div className="app-actions">{actions}</div> : null}
      </div>
    </section>
  );
}

type SurfaceProps = {
  title?: string;
  subtitle?: string;
  headerActions?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
};

export function Surface({
  title,
  subtitle,
  headerActions,
  className,
  bodyClassName,
  children,
}: SurfaceProps) {
  const hasHeader = title || subtitle || headerActions;

  return (
    <section className={cx("app-surface", className)}>
      {hasHeader ? (
        <div className="surface-header">
          <div>
            {title ? <h2 className="surface-title">{title}</h2> : null}
            {subtitle ? <p className="surface-subtitle">{subtitle}</p> : null}
          </div>
          {headerActions ? <div className="app-actions">{headerActions}</div> : null}
        </div>
      ) : null}
      <div className={cx(hasHeader ? "surface-body" : "p-5 lg:p-6", bodyClassName)}>
        {children}
      </div>
    </section>
  );
}

type StatTone = "blue" | "green" | "amber" | "rose" | "violet" | "slate";

const statToneMap: Record<StatTone, string> = {
  blue: "bg-sky-100 text-sky-700",
  green: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  rose: "bg-rose-100 text-rose-700",
  violet: "bg-violet-100 text-violet-700",
  slate: "bg-slate-200 text-slate-700",
};

type StatCardProps = {
  label: string;
  value: ReactNode;
  note?: string;
  icon?: ReactNode;
  tone?: StatTone;
  className?: string;
};

export function StatCard({
  label,
  value,
  note,
  icon,
  tone = "slate",
  className,
}: StatCardProps) {
  return (
    <article className={cx("stat-card", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="stat-label">{label}</div>
          <div className="stat-value">{value}</div>
          {note ? <div className="stat-note">{note}</div> : null}
        </div>
        {icon ? <div className={cx("stat-icon", statToneMap[tone])}>{icon}</div> : null}
      </div>
    </article>
  );
}

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description: string;
  className?: string;
};

export function EmptyState({ icon, title, description, className }: EmptyStateProps) {
  return (
    <div className={cx("empty-state", className)}>
      {icon ? <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-100 text-slate-400">{icon}</div> : null}
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

type ModalFrameProps = {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  maxWidthClass?: string;
  className?: string;
  bodyClassName?: string;
};

export function ModalFrame({
  title,
  subtitle,
  onClose,
  children,
  footer,
  maxWidthClass = "max-w-3xl",
  className,
  bodyClassName,
}: ModalFrameProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-sm sm:p-6">
      <div className={cx("app-surface flex max-h-[92vh] w-full flex-col overflow-hidden", maxWidthClass, className)}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="icon-button" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className={cx("overflow-y-auto p-5 sm:p-6", bodyClassName)}>{children}</div>
        {footer ? (
          <div className="border-t border-slate-200/80 px-5 py-4 sm:px-6">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}

export { cx };
