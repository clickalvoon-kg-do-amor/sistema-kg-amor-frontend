import { useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, Boxes, CheckCircle, Download, Network, Pencil, Search, Users, X, XCircle } from "lucide-react";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";
import { supabase } from "../lib/supabaseClient";
import { formatLocalDate, toUtcISOStringFromLocalDate } from "../utils/date";
import { PageHeader, StatCard, Surface } from "../components/ui";

type HistoricoComCelula = {
  id: number;
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

type CelulaInfo = {
  id: number;
  nome: string;
  lider?: string | null;
  supervisores: string;
  redes?: { cor: string | null } | null;
};

type Filtros = {
  rede: string;
  supervisao: string;
  dataIni: string;
  dataFim: string;
};

type FormEdicao = {
  quantidade: string;
  quantidade_itens: string;
  observacoes: string;
  data_chegada: string;
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
  const [todasCelulas, setTodasCelulas] = useState<CelulaInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [redesDisponiveis, setRedesDisponiveis] = useState<string[]>([]);
  const [filtros, setFiltros] = useState<Filtros>(() => {
    const now = new Date();
    return {
      rede: "Todas",
      supervisao: "Todos",
      dataIni: formatLocalDate(new Date(now.getFullYear(), now.getMonth(), 1)),
      dataFim: formatLocalDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
    };
  });

  // --- estados da consulta por célula ---
  const [buscaCelula, setBuscaCelula] = useState("");
  const [celulaSelecionada, setCelulaSelecionada] = useState<CelulaInfo | null>(null);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // --- estados do modal de edição ---
  const [editandoRegistro, setEditandoRegistro] = useState<HistoricoComCelula | null>(null);
  const [formEdicao, setFormEdicao] = useState<FormEdicao>({
    quantidade: "",
    quantidade_itens: "",
    observacoes: "",
    data_chegada: "",
  });
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  // click-outside fecha o dropdown
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setMostrarSugestoes(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

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

      const inicio = toUtcISOStringFromLocalDate(filtros.dataIni);
      const fim    = toUtcISOStringFromLocalDate(filtros.dataFim, true);

      let historicoQuery = supabase
        .from("historico_kg")
        .select("id, celula_id, quantidade, quantidade_itens, data_chegada, observacoes");
      if (inicio) historicoQuery = historicoQuery.gte("data_chegada", inicio);
      if (fim)    historicoQuery = historicoQuery.lte("data_chegada", fim);

      const [
        { data: historicoData, error },
        { data: celulasData },
        { data: redesData },
      ] = await Promise.all([
        historicoQuery,
        supabase.from("celulas").select("id, nome, lider, supervisores, redes(cor)").eq("ativo", true).order("nome"),
        supabase.from("redes").select("cor").eq("ativo", true),
      ]);

      if (error) {
        console.error("Erro ao buscar historico:", error);
        setTodoHistorico([]);
      } else {
        const celulaMap = new Map(
          (celulasData || []).map((c: any) => [c.id, c])
        );
        const normalizados = (historicoData || []).map((registro: any) => ({
          id: registro.id,
          quantidade: registro.quantidade,
          quantidade_itens: registro.quantidade_itens,
          data_chegada: getDateOnly(registro.data_chegada),
          observacoes: registro.observacoes,
          celulas: (celulaMap.get(registro.celula_id) as any) ?? null,
        }));
        setTodoHistorico(normalizados as HistoricoComCelula[]);
      }

      setTodasCelulas((celulasData || []) as CelulaInfo[]);

      const listaRedes = (redesData || [])
        .map((rede: { cor: string | null }) => (rede.cor || "").toUpperCase())
        .filter(Boolean);
      setRedesDisponiveis(listaRedes);
      setLoading(false);
    })();
  }, [filtros.dataIni, filtros.dataFim]);

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

    return registros;
  }, [todoHistorico, filtros.rede, filtros.supervisao]);

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

  // --- consulta por célula ---
  const sugestoesCelulas = useMemo(() => {
    if (!buscaCelula.trim() || celulaSelecionada) return [];
    const termo = buscaCelula.toUpperCase().trim();
    return todasCelulas.filter((c) => c.nome.toUpperCase().includes(termo)).slice(0, 8);
  }, [buscaCelula, todasCelulas, celulaSelecionada]);

  const registrosDaCelulaSelecionada = useMemo(() => {
    if (!celulaSelecionada) return [];
    return todoHistorico.filter((r) => r.celulas?.id === celulaSelecionada.id);
  }, [celulaSelecionada, todoHistorico]);

  const selecionarCelula = (celula: CelulaInfo) => {
    setCelulaSelecionada(celula);
    setBuscaCelula(celula.nome);
    setMostrarSugestoes(false);
  };

  const limparBusca = () => {
    setBuscaCelula("");
    setCelulaSelecionada(null);
    setMostrarSugestoes(false);
  };

  const abrirEdicao = (registro: HistoricoComCelula) => {
    setEditandoRegistro(registro);
    setFormEdicao({
      quantidade: String(registro.quantidade),
      quantidade_itens: String(registro.quantidade_itens || 0),
      observacoes: registro.observacoes || "",
      data_chegada: registro.data_chegada,
    });
  };

  const salvarEdicao = async () => {
    if (!editandoRegistro) return;
    setSalvandoEdicao(true);

    const quantidadeNova = parseFloat(formEdicao.quantidade.replace(",", "."));
    const itensNovos = parseInt(formEdicao.quantidade_itens) || 0;

    if (isNaN(quantidadeNova) || quantidadeNova < 0) {
      toast.error("Quantidade inválida.");
      setSalvandoEdicao(false);
      return;
    }

    const { error: histError } = await supabase
      .from("historico_kg")
      .update({
        quantidade: quantidadeNova,
        quantidade_itens: itensNovos,
        observacoes: formEdicao.observacoes || null,
        data_chegada: toUtcISOStringFromLocalDate(formEdicao.data_chegada),
      })
      .eq("id", editandoRegistro.id);

    if (histError) {
      toast.error("Erro ao salvar alterações.");
      setSalvandoEdicao(false);
      return;
    }

    // atualiza o saldo acumulado da célula com o delta
    const celulaId = editandoRegistro.celulas?.id;
    if (celulaId) {
      const deltaKg = quantidadeNova - (editandoRegistro.quantidade || 0);
      const deltaItens = itensNovos - (editandoRegistro.quantidade_itens || 0);
      if (deltaKg !== 0 || deltaItens !== 0) {
        const { data: celulaAtual } = await supabase
          .from("celulas")
          .select("quantidade_kg, quantidade_itens")
          .eq("id", celulaId)
          .single();
        if (celulaAtual) {
          await supabase
            .from("celulas")
            .update({
              quantidade_kg: (celulaAtual.quantidade_kg || 0) + deltaKg,
              quantidade_itens: (celulaAtual.quantidade_itens || 0) + deltaItens,
            })
            .eq("id", celulaId);
        }
      }
    }

    toast.success("Recebimento atualizado.");
    setTodoHistorico((prev) =>
      prev.map((r) =>
        r.id === editandoRegistro.id
          ? {
              ...r,
              quantidade: quantidadeNova,
              quantidade_itens: itensNovos,
              observacoes: formEdicao.observacoes || null,
              data_chegada: formEdicao.data_chegada,
            }
          : r
      )
    );
    setEditandoRegistro(null);
    setSalvandoEdicao(false);
  };

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

      {/* filtros principais */}
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

      {/* consulta por célula */}
      <div className="toolbar-surface relative z-10">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="pill">
            <Search className="h-3.5 w-3.5" />
            Consulta por célula
          </span>
          <span className="text-sm text-slate-500">
            Verifique se uma célula registrou entrega no período selecionado.
          </span>
        </div>

        <div ref={searchRef} className="relative max-w-sm">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar célula pelo nome..."
              value={buscaCelula}
              style={{ paddingLeft: "2.25rem", paddingRight: buscaCelula ? "2.25rem" : undefined }}
              onChange={(e) => {
                setBuscaCelula(e.target.value);
                setCelulaSelecionada(null);
                setMostrarSugestoes(true);
              }}
              onFocus={() => {
                if (buscaCelula && !celulaSelecionada) setMostrarSugestoes(true);
              }}
            />
            {buscaCelula && (
              <button
                type="button"
                onClick={limparBusca}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {mostrarSugestoes && sugestoesCelulas.length > 0 && (
            <ul className="absolute z-[200] mt-1 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
              {sugestoesCelulas.map((celula) => (
                <li
                  key={celula.id}
                  onMouseDown={() => selecionarCelula(celula)}
                  className="flex cursor-pointer flex-col gap-0.5 px-4 py-2.5 hover:bg-slate-50"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2.5 w-2.5 shrink-0 rounded-full border"
                      style={{
                        backgroundColor: getNetworkColor(celula.redes?.cor),
                        borderColor: (celula.redes?.cor || "").toUpperCase().includes("BRANC") ? "#cbd5e1" : "transparent",
                      }}
                    />
                    <span className="text-sm font-medium text-slate-800">{celula.nome}</span>
                  </div>
                  <span className="pl-[18px] text-xs text-slate-500">
                    {celula.lider && <>{celula.lider} · </>}Sup: {celula.supervisores}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {celulaSelecionada && (
          <div className="mt-4">
            {registrosDaCelulaSelecionada.length === 0 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <div className="flex items-center gap-3">
                  <XCircle className="h-4 w-4 shrink-0 text-amber-500" />
                  <strong>{celulaSelecionada.nome}</strong>
                  <span className="text-amber-700">não registrou entrega no período selecionado.</span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-3 pl-7 text-xs text-amber-700">
                  {celulaSelecionada.lider && <span>Líderes: <strong>{celulaSelecionada.lider}</strong></span>}
                  {celulaSelecionada.redes?.cor && (
                    <span className="flex items-center gap-1">
                      Rede:
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full border"
                        style={{
                          backgroundColor: getNetworkColor(celulaSelecionada.redes.cor),
                          borderColor: celulaSelecionada.redes.cor.toUpperCase().includes("BRANC") ? "#cbd5e1" : "transparent",
                        }}
                      />
                      <strong>{celulaSelecionada.redes.cor.toUpperCase()}</strong>
                    </span>
                  )}
                  {celulaSelecionada.supervisores && <span>Sup: <strong>{celulaSelecionada.supervisores}</strong></span>}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                    <CheckCircle className="h-4 w-4 shrink-0" />
                    <span>{celulaSelecionada.nome} — {registrosDaCelulaSelecionada.length} entrega(s) no período</span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                    {celulaSelecionada.lider && <span>Líderes: <strong className="text-slate-700">{celulaSelecionada.lider}</strong></span>}
                    {celulaSelecionada.redes?.cor && (
                      <span className="flex items-center gap-1">
                        Rede:
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full border"
                          style={{
                            backgroundColor: getNetworkColor(celulaSelecionada.redes.cor),
                            borderColor: celulaSelecionada.redes.cor.toUpperCase().includes("BRANC") ? "#cbd5e1" : "transparent",
                          }}
                        />
                        <strong className="text-slate-700">{celulaSelecionada.redes.cor.toUpperCase()}</strong>
                      </span>
                    )}
                    {celulaSelecionada.supervisores && <span>Sup: <strong className="text-slate-700">{celulaSelecionada.supervisores}</strong></span>}
                  </div>
                </div>
                {registrosDaCelulaSelecionada.map((registro) => (
                  <div
                    key={registro.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3"
                  >
                    <div className="flex flex-wrap gap-4 text-sm text-slate-700">
                      <span>
                        <span className="text-slate-500">Data:</span>{" "}
                        {registro.data_chegada}
                      </span>
                      <span>
                        <span className="text-slate-500">Peso:</span>{" "}
                        <strong>{formatPt(registro.quantidade)} kg</strong>
                      </span>
                      <span>
                        <span className="text-slate-500">Itens:</span>{" "}
                        <strong>{formatInt(registro.quantidade_itens || 0)}</strong>
                      </span>
                      {registro.observacoes && (
                        <span>
                          <span className="text-slate-500">Obs:</span> {registro.observacoes}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => abrirEdicao(registro)}
                      className="flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* stat cards */}
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

      {/* modal de edição */}
      {editandoRegistro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-[28px] border bg-white p-6 shadow-2xl" style={{ borderColor: "var(--line)" }}>
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Editar recebimento</h2>
                <p className="mt-0.5 text-sm text-slate-500">{editandoRegistro.celulas?.nome}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditandoRegistro(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700">Quantidade (kg)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={formEdicao.quantidade}
                    onChange={(e) => setFormEdicao((prev) => ({ ...prev, quantidade: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700">Itens</label>
                  <input
                    type="number"
                    min="0"
                    value={formEdicao.quantidade_itens}
                    onChange={(e) => setFormEdicao((prev) => ({ ...prev, quantidade_itens: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700">Data</label>
                <input
                  type="date"
                  value={formEdicao.data_chegada}
                  onChange={(e) => setFormEdicao((prev) => ({ ...prev, data_chegada: e.target.value }))}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700">Observações</label>
                <textarea
                  value={formEdicao.observacoes}
                  onChange={(e) => setFormEdicao((prev) => ({ ...prev, observacoes: e.target.value }))}
                  placeholder="Observações opcionais"
                  style={{ minHeight: "80px" }}
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setEditandoRegistro(null)}
                  className="button-base button-secondary flex-1"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={salvarEdicao}
                  disabled={salvandoEdicao}
                  className="button-base button-primary flex-1"
                >
                  {salvandoEdicao ? "Salvando..." : "Salvar alterações"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
