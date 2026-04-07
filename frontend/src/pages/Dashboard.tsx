import { useEffect, useMemo, useState } from "react";
import { BarChart3, Boxes, Download, Network, Users } from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "../lib/supabaseClient";
import { formatLocalDate } from "../utils/date";
import { PageHeader, StatCard, Surface } from "../components/ui";

type HistoricoComCelula = {
  quantidade: number;
  quantidade_itens: number;
  data_chegada: string;
  observacoes: string | null;
  celulas: {
    id: number;
    nome: string;
    lider?: string | null;
    supervisores: string;
    redes?: {
      cor: string | null;
    } | null;
  } | null;
};

type Filtros = {
  rede: string;
  supervisao: string;
  dataIni: string;
  dataFim: string;
};

type RankingBoxProps = {
  title: string;
  data: [string, number][];
  suffix?: string;
};

const NETWORK_COLORS: Record<string, string> = {
  BRANCA: "#E2E8F0",
  BRANCO: "#E2E8F0",
  AMARELA: "#FFEB3B",
  AMARELO: "#FFEB3B",
  VERMELHA: "#F44336",
  VERMELHO: "#F44336",
  VERDE: "#4CAF50",
  AZUL: "#2196F3",
  MARROM: "#8D6E63",
  ROXA: "#9C27B0",
  ROXO: "#9C27B0",
};

const formatPt = (n: number) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n);

const formatInt = (n: number) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

const getDateOnly = (iso: string) => (iso ? iso.slice(0, 10) : "");

const getNetworkColor = (value?: string | null) => NETWORK_COLORS[(value || "").toUpperCase()] || "#64748b";

function RankingBox({ title, data, suffix = "" }: RankingBoxProps) {
  return (
    <Surface
      title={title}
      className="h-full"
      bodyClassName="space-y-1.5 px-4 py-4 lg:px-5 lg:py-5"
    >
      {data.length === 0 ? (
        <p className="text-sm text-slate-400">Nenhum dado encontrado para os filtros selecionados.</p>
      ) : (
        <ol className="space-y-1.5 text-sm text-slate-600">
          {data.map(([nome, total], index) => (
            <li
              key={`${nome}-${index}`}
              className="flex items-center justify-between gap-3 rounded-[18px] border border-slate-100 bg-slate-50/80 px-3 py-2"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-700 shadow-sm">
                  {index + 1}
                </span>
                <span className="truncate font-medium text-slate-700">{nome}</span>
              </div>
              <span className="shrink-0 text-right font-semibold text-slate-900">
                {formatPt(total)}
                {suffix}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Surface>
  );
}

export default function Dashboard() {
  const [todoHistorico, setTodoHistorico] = useState<HistoricoComCelula[]>([]);
  const [loading, setLoading] = useState(true);
  const [redesDisponiveis, setRedesDisponiveis] = useState<string[]>([]);
  const [filtros, setFiltros] = useState<Filtros>({
    rede: "Todas",
    supervisao: "Todos",
    dataIni: "",
    dataFim: "",
  });

  const opcoesRede = useMemo(() => {
    const set = new Set<string>(redesDisponiveis.map((rede) => rede.toUpperCase()));
    todoHistorico.forEach((registro) => set.add((registro.celulas?.redes?.cor || "Sem rede").toUpperCase()));
    return ["Todas", ...Array.from(set).sort()];
  }, [todoHistorico, redesDisponiveis]);

  const opcoesSupervisao = useMemo(() => {
    const set = new Set<string>();
    todoHistorico.forEach((registro) => set.add((registro.celulas?.supervisores || "N/D").toUpperCase()));
    return ["Todos", ...Array.from(set).sort()];
  }, [todoHistorico]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data, error }, { data: redesData }] = await Promise.all([
        supabase.from("historico_kg").select(`
          quantidade,
          quantidade_itens,
          data_chegada,
          observacoes,
          celulas (
            id,
            nome,
            lider,
            supervisores,
            redes (cor)
          )
        `),
        supabase.from("redes").select("cor").eq("ativo", true),
      ]);

      if (error) {
        console.error("Erro ao buscar historico:", error);
        setTodoHistorico([]);
      } else {
        const normalizados = (data || []).map((registro: any) => ({
          ...registro,
          data_chegada: getDateOnly(registro.data_chegada),
        }));
        setTodoHistorico(normalizados as HistoricoComCelula[]);
      }

      const listaRedes = (redesData || [])
        .map((rede: { cor: string | null }) => (rede.cor || "").toUpperCase())
        .filter(Boolean);
      setRedesDisponiveis(listaRedes);
      setLoading(false);
    })();
  }, []);

  const filtradas = useMemo(() => {
    let registros = [...todoHistorico];

    if (filtros.rede !== "Todas") {
      const alvo = filtros.rede.toUpperCase();
      registros = registros.filter(
        (registro) => (registro.celulas?.redes?.cor || "Sem rede").toUpperCase() === alvo
      );
    }

    if (filtros.supervisao !== "Todos") {
      const alvo = filtros.supervisao.toUpperCase();
      registros = registros.filter(
        (registro) => (registro.celulas?.supervisores || "").toUpperCase() === alvo
      );
    }

    if (filtros.dataIni) {
      registros = registros.filter((registro) => getDateOnly(registro.data_chegada) >= filtros.dataIni);
    }

    if (filtros.dataFim) {
      registros = registros.filter((registro) => getDateOnly(registro.data_chegada) <= filtros.dataFim);
    }

    return registros;
  }, [todoHistorico, filtros]);

  const celulasUnicas = useMemo(() => {
    const ids = new Set<number>();
    filtradas.forEach((registro) => {
      if (registro.celulas?.id) ids.add(registro.celulas.id);
    });
    return ids;
  }, [filtradas]);

  const totalCelulas = celulasUnicas.size;
  const totalKg = useMemo(
    () => filtradas.reduce((soma, registro) => soma + (Number(registro.quantidade) || 0), 0),
    [filtradas]
  );
  const totalItens = useMemo(
    () => filtradas.reduce((soma, registro) => soma + (Number(registro.quantidade_itens) || 0), 0),
    [filtradas]
  );
  const mediaKg = totalCelulas > 0 ? totalKg / totalCelulas : 0;

  const topSupervisao = useMemo(() => {
    const mapa = new Map<string, number>();
    filtradas.forEach((registro) => {
      if (!registro.celulas) return;
      const chave = (registro.celulas.supervisores || "N/D").toUpperCase();
      mapa.set(chave, (mapa.get(chave) || 0) + (Number(registro.quantidade) || 0));
    });
    return Array.from(mapa.entries()).sort((a, b) => b[1] - a[1]).slice(0, 15);
  }, [filtradas]);

  const topCelulas = useMemo(() => {
    const mapa = new Map<string, number>();
    filtradas.forEach((registro) => {
      if (!registro.celulas) return;
      const chave = registro.celulas.nome;
      mapa.set(chave, (mapa.get(chave) || 0) + (Number(registro.quantidade) || 0));
    });
    return Array.from(mapa.entries()).sort((a, b) => b[1] - a[1]).slice(0, 15);
  }, [filtradas]);

  const rankingRedes = useMemo(() => {
    const mapa = new Map<string, number>();
    filtradas.forEach((registro) => {
      const cor = (registro.celulas?.redes?.cor || "Sem rede").toUpperCase();
      mapa.set(cor, (mapa.get(cor) || 0) + (Number(registro.quantidade) || 0));
    });
    return Array.from(mapa.entries()).sort((a, b) => b[1] - a[1]);
  }, [filtradas]);

  const totalRedesKg = useMemo(
    () => rankingRedes.reduce((total, [, kg]) => total + kg, 0),
    [rankingRedes]
  );

  const topSupervisaoMax = useMemo(
    () => topSupervisao.reduce((max, [, kg]) => Math.max(max, kg), 0),
    [topSupervisao]
  );

  const supervisaoColors = useMemo(() => {
    const mapa = new Map<string, string>();
    filtradas.forEach((registro) => {
      if (!registro.celulas) return;
      const chave = (registro.celulas.supervisores || "N/D").toUpperCase();
      if (!mapa.has(chave)) {
        mapa.set(chave, getNetworkColor(registro.celulas.redes?.cor));
      }
    });
    return mapa;
  }, [filtradas]);

  const handleExportExcel = () => {
    const dataSupervisao = topSupervisao.map(([Supervisao, KG]) => ({ Supervisao, KG }));
    const dataCelulas = topCelulas.map(([Celula, KG]) => ({ Celula, KG }));
    const dataRedes = rankingRedes.map(([Rede, KG]) => ({ Rede, KG }));
    const dataDetalhada = filtradas.map((registro) => ({
      Data: getDateOnly(registro.data_chegada),
      Celula: registro.celulas?.nome || "N/D",
      Supervisores: registro.celulas?.supervisores || "N/D",
      Rede: registro.celulas?.redes?.cor || "N/D",
      Quantidade_KG: registro.quantidade,
      Quantidade_Itens: registro.quantidade_itens || 0,
      Observacoes: registro.observacoes || "",
    }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(dataDetalhada), "Lancamentos Filtrados");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(dataSupervisao), "Top Supervisao");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(dataCelulas), "Top Celulas");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(dataRedes), "Ranking Redes");

    XLSX.writeFile(workbook, `Relatorio_KG_do_Amor_${formatLocalDate()}.xlsx`);
  };

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="app-surface flex min-w-[280px] flex-col items-center gap-4 px-8 py-10 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-slate-200 border-t-slate-900" />
          <div>
            <div className="text-base font-semibold text-slate-900">Carregando dashboard</div>
            <div className="mt-1 text-sm text-slate-500">Consolidando dados operacionais.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Visao operacional"
        title="Dashboard de recebimentos"
        description="Acompanhe o volume recebido, desempenho por supervisao e distribuicao por redes com filtros rapidos para diferentes periodos."
        actions={
          <button type="button" onClick={handleExportExcel} className="button-base button-secondary">
            <Download className="h-4 w-4" />
            Exportar Excel
          </button>
        }
      />

      <div className="toolbar-surface">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="pill">
            <Network className="h-3.5 w-3.5" />
            Filtros ativos
          </span>
          <span className="text-sm text-slate-500">
            Refine a leitura por rede, supervisao e intervalo de datas.
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.1fr_1.1fr_0.9fr_0.9fr]">
          <select
            value={filtros.rede}
            onChange={(event) => setFiltros((prev) => ({ ...prev, rede: event.target.value }))}
          >
            {opcoesRede.map((rede) => (
              <option key={rede} value={rede}>
                {rede === "Todas" ? "Cor da rede" : rede}
              </option>
            ))}
          </select>
          <select
            value={filtros.supervisao}
            onChange={(event) => setFiltros((prev) => ({ ...prev, supervisao: event.target.value }))}
          >
            {opcoesSupervisao.map((supervisao) => (
              <option key={supervisao} value={supervisao}>
                {supervisao === "Todos" ? "Supervisao" : supervisao}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={filtros.dataIni}
            onChange={(event) => setFiltros((prev) => ({ ...prev, dataIni: event.target.value }))}
          />
          <input
            type="date"
            value={filtros.dataFim}
            onChange={(event) => setFiltros((prev) => ({ ...prev, dataFim: event.target.value }))}
          />
        </div>
      </div>

      <div className="stats-grid">
        <StatCard
          label="Celulas com doacoes"
          value={totalCelulas}
          note="Total unico dentro do recorte atual"
          icon={<Users className="h-5 w-5" />}
          tone="blue"
        />
        <StatCard
          label="Volume no periodo"
          value={`${formatPt(totalKg)} kg`}
          note="Soma consolidada dos lancamentos filtrados"
          icon={<BarChart3 className="h-5 w-5" />}
          tone="green"
        />
        <StatCard
          label="Media por celula"
          value={`${formatPt(mediaKg)} kg`}
          note="Media apenas entre celulas com registro"
          icon={<Network className="h-5 w-5" />}
          tone="amber"
        />
        <StatCard
          label="Itens recebidos"
          value={formatInt(totalItens)}
          note="Quantidade total de itens lancados"
          icon={<Boxes className="h-5 w-5" />}
          tone="rose"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_1.25fr_0.9fr]">
        <RankingBox title="Top 15 supervisoes" data={topSupervisao} suffix=" kg" />
        <RankingBox title="Top 15 celulas" data={topCelulas} suffix=" kg" />
        <RankingBox title="Ranking de rede" data={rankingRedes} suffix=" kg" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_1.35fr]">
        <Surface
          title="Distribuicao por redes"
          subtitle="Participacao percentual do volume recebido por cor de rede."
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
            <div className="mx-auto shrink-0">
              <svg width="180" height="180" viewBox="0 0 140 140" className="-rotate-90">
                {rankingRedes.length > 0 && totalRedesKg > 0 ? (
                  (() => {
                    let currentAngle = 0;
                    return rankingRedes.map(([cor, kg]) => {
                      if (kg === 0) return null;
                      const angle = (kg / totalRedesKg) * 360;
                      const startAngle = currentAngle;
                      const endAngle = currentAngle + angle;
                      const startAngleRad = (startAngle * Math.PI) / 180;
                      const endAngleRad = (endAngle * Math.PI) / 180;
                      const largeArcFlag = angle > 180 ? 1 : 0;
                      const x1 = 70 + 55 * Math.cos(startAngleRad);
                      const y1 = 70 + 55 * Math.sin(startAngleRad);
                      const x2 = 70 + 55 * Math.cos(endAngleRad);
                      const y2 = 70 + 55 * Math.sin(endAngleRad);
                      const pathData = ["M 70 70", `L ${x1} ${y1}`, `A 55 55 0 ${largeArcFlag} 1 ${x2} ${y2}`, "Z"].join(" ");
                      currentAngle += angle;

                      return (
                        <path
                          key={cor}
                          d={pathData}
                          fill={getNetworkColor(cor)}
                          stroke={cor === "BRANCA" || cor === "BRANCO" ? "#cbd5e1" : "white"}
                          strokeWidth="2"
                        />
                      );
                    });
                  })()
                ) : (
                  <circle cx="70" cy="70" r="55" fill="#e2e8f0" />
                )}
                <circle cx="70" cy="70" r="28" fill="white" />
              </svg>
            </div>

            <div className="flex-1 space-y-2">
              {rankingRedes.length === 0 ? (
                <p className="text-sm text-slate-400">Nenhum dado disponivel para este recorte.</p>
              ) : (
                rankingRedes.map(([cor, kg]) => {
                  if (kg === 0) return null;
                  const percentage = totalRedesKg > 0 ? ((kg / totalRedesKg) * 100).toFixed(1) : "0";
                  return (
                    <div
                      key={cor}
                      className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-sm"
                    >
                      <div
                        className="h-3.5 w-3.5 rounded-full border"
                        style={{
                          backgroundColor: getNetworkColor(cor),
                          borderColor: cor === "BRANCA" || cor === "BRANCO" ? "#cbd5e1" : "transparent",
                        }}
                      />
                      <span className="flex-1 font-medium text-slate-700">{cor}</span>
                      <span className="font-semibold text-slate-900">{percentage}%</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </Surface>

        <Surface
          title="Top 15 supervisoes"
          subtitle="Escala visual do volume total por supervisao dentro do periodo filtrado."
        >
          {topSupervisao.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhum ranking disponivel para o filtro atual.</p>
          ) : (
            <>
              <div className="rounded-[22px] bg-slate-50/90 px-4 pb-4 pt-4">
                <div className="overflow-x-auto pb-1">
                  <div className="flex min-w-max items-end justify-between gap-2 pt-14">
                    {topSupervisao.map(([nome, kg], index) => {
                  const height = topSupervisaoMax > 0 ? Math.max((kg / topSupervisaoMax) * 180, 18) : 18;
                  const color = supervisaoColors.get(nome.toUpperCase()) || "#64748b";
                  const isLight = color === "#E2E8F0";
                  const tooltipPositionClass =
                    index <= 1
                      ? "left-0 translate-x-0 text-left"
                      : index >= topSupervisao.length - 2
                        ? "left-auto right-0 translate-x-0 text-left"
                        : "left-1/2 -translate-x-1/2 text-left";

                  return (
                    <div key={nome} className="group relative flex min-w-[44px] flex-col items-center justify-end gap-2">
                      <div
                        className={`pointer-events-none absolute top-0 z-10 hidden max-w-[160px] rounded-2xl bg-slate-900 px-3 py-2 text-xs leading-4 text-white shadow-lg group-hover:block ${tooltipPositionClass}`}
                      >
                        <div className="font-medium">{nome}</div>
                        <div>{formatPt(kg)} kg</div>
                      </div>
                      <div
                        className="w-9 rounded-t-[14px] border-b-2 transition duration-200 group-hover:opacity-85"
                        style={{
                          height: `${height}px`,
                          backgroundColor: color,
                          borderColor: isLight ? "#cbd5e1" : "transparent",
                        }}
                      />
                      <div className="text-xs font-semibold text-slate-700">{index + 1}o</div>
                    </div>
                  );
                })}
                  </div>
                </div>
              </div>
              <div className="mt-4 text-xs text-slate-500">
                Passe o cursor sobre as barras para visualizar o nome da supervisao e o total em kg.
              </div>
            </>
          )}
        </Surface>
      </div>
    </div>
  );
}
