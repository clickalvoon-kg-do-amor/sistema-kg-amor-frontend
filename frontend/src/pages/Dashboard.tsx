export default function Dashboard() {
  return (
    <div className="space-y-6">
      <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-800">
        <span>📊</span> Dashboard
      </h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total de Células", value: 0, color: "from-indigo-500 to-blue-500" },
          { label: "Recebimentos", value: 0, color: "from-emerald-500 to-teal-500" },
          { label: "Produtos", value: 0, color: "from-amber-500 to-orange-500" },
          { label: "Alertas", value: 0, color: "from-rose-500 to-pink-500" },
        ].map((c, i) => (
          <div
            key={i}
            className={`rounded-xl bg-gradient-to-br ${c.color} p-[1px] shadow`}
          >
            <div className="rounded-xl bg-white p-4">
              <div className="text-3xl font-bold text-slate-800">{c.value}</div>
              <div className="text-sm text-slate-500">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-2 text-lg font-semibold text-slate-800">Recebimentos Recentes</h3>
        <p className="text-slate-500">Nenhum recebimento registrado ainda.</p>
      </div>
    </div>
  );
}
