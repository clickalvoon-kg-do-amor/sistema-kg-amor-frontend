import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Dashboard() {
  const [totalCelulas, setTotalCelulas] = useState(0);
  const [totalKg, setTotalKg] = useState(0);
  const [mediaKg, setMediaKg] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase
        .from("celulas")
        .select("quantidade_kg");

      if (error) {
        console.error("Erro ao buscar células:", error);
        return;
      }

      const total = data.length;
      const somaKg = data.reduce(
        (acc, celula) => acc + (celula.quantidade_kg || 0),
        0
      );
      const media = total > 0 ? somaKg / total : 0;

      setTotalCelulas(total);
      setTotalKg(somaKg);
      setMediaKg(media);
    };

    fetchData();
  }, []);

  const cards = [
    {
      label: "Total de Células",
      value: totalCelulas,
      color: "from-indigo-500 to-blue-500",
    },
    {
      label: "Total de KG",
      value: `${totalKg.toFixed(1)} kg`,
      color: "from-emerald-500 to-teal-500",
    },
    {
      label: "Média por Célula",
      value: `${mediaKg.toFixed(1)} kg`,
      color: "from-amber-500 to-orange-500",
    },
    {
      label: "Alertas",
      value: 0,
      color: "from-rose-500 to-pink-500",
    },
  ];

  return (
    <div className="space-y-6">
      <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-800">
        <span>📊</span> Dashboard
      </h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c, i) => (
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
        <h3 className="mb-2 text-lg font-semibold text-slate-800">
          Recebimentos Recentes
        </h3>
        <p className="text-slate-500">Nenhum recebimento registrado ainda.</p>
      </div>
    </div>
  );
}
