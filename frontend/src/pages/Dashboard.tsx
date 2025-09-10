// src/pages/Dashboard.tsx
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

type Celula = {
  id: number;
  nome: string;
  lider?: string | null;
  supervisores: string;
  quantidade_kg: number | null;
  // relação para pegar a cor da rede (FK -> redes)
  redes?: {
    cor: string | null;
  } | null;
  // se um dia você juntar com recebimentos/itens, pode usar estas datas
  // data_recebimento?: string | null;
};

type Filtros = {
  rede: string;         // "Todas" | "Branca" | "Vermelha" | ...
  supervisao: string;   // "Todos" | "FULANO E FULANA" | ...
  dataIni?: string;     // 'YYYY-MM-DD'
  dataFim?: string;     // 'YYYY-MM-DD'
};

const formatPt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export default function Dashboard() {
  // base vinda do banco (não filtrada)
  const [todas, setTodas] = useState<Celula[]>([]);
  const [loading, setLoading] = useState(true);

  // filtros
  const [filtros, setFiltros] = useState<Filtros>({
    rede: 'Todas',
    supervisao: 'Todos',
    dataIni: '',
    dataFim: '',
  });

  // opções dos selects (derivadas do banco)
  const opcoesRede = useMemo(() => {
    const set = new Set<string>();
    todas.forEach((c) => set.add((c.redes?.cor || 'Sem rede').toUpperCase()));
    return ['Todas', ...Array.from(set).sort()];
  }, [todas]);

  const opcoesSupervisao = useMemo(() => {
    const set = new Set<string>();
    todas.forEach((c) => set.add((c.supervisores || 'N/D').toUpperCase()));
    return ['Todos', ...Array.from(set).sort()];
  }, [todas]);

  // ---- carregamento inicial
  useEffect(() => {
    (async () => {
      setLoading(true);
      // puxa tudo 1x; depois filtramos em memória (rápido e simples)
      const { data, error } = await supabase
        .from('celulas')
        .select('id, nome, lider, supervisores, quantidade_kg, redes(cor)');

      if (error) {
        console.error('Erro ao buscar células:', error);
        setTodas([]);
      } else {
        setTodas((data || []) as Celula[]);
      }

      setLoading(false);
    })();
  }, []);

  // ---- aplica filtros em memória
  const filtradas = useMemo(() => {
    let arr = [...todas];

    if (filtros.rede !== 'Todas') {
      const alvo = filtros.rede.toUpperCase();
      arr = arr.filter((c) => (c.redes?.cor || 'Sem rede').toUpperCase() === alvo);
    }

    if (filtros.supervisao !== 'Todos') {
      const alvo = filtros.supervisao.toUpperCase();
      arr = arr.filter((c) => (c.supervisores || '').toUpperCase() === alvo);
    }

    // Datas: só funcionará quando houver coluna de data para filtrar (ex.: data_recebimento)
    // if (filtros.dataIni) { arr = arr.filter(...); }
    // if (filtros.dataFim) { arr = arr.filter(...); }

    return arr;
  }, [todas, filtros]);

  // ---- métricas (AGORA reagem também à cor da rede)
  const totalCelulas = filtradas.length;
  const totalKg = useMemo(
    () => filtradas.reduce((s, c) => s + (Number(c.quantidade_kg) || 0), 0),
    [filtradas]
  );
  const mediaKg = totalCelulas ? totalKg / totalCelulas : 0;

  // ainda não temos regra de alerta — mantive 0
  const alertas = 0;

  // ---- rankings (usando conjunto filtrado)
  const topSupervisao = useMemo(() => {
    const mapa = new Map<string, number>();
    filtradas.forEach((c) => {
      const chave = (c.supervisores || 'N/D').toUpperCase();
      const qtd = Number(c.quantidade_kg) || 0;
      mapa.set(chave, (mapa.get(chave) || 0) + qtd);
    });
    return Array.from(mapa.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);
  }, [filtradas]);

  const topCelulas = useMemo(() => {
    return filtradas
      .map((c) => [c.nome, Number(c.quantidade_kg) || 0] as [string, number])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);
  }, [filtradas]);

  const rankingRedes = useMemo(() => {
    const mapa = new Map<string, number>();
    filtradas.forEach((c) => {
      const cor = (c.redes?.cor || 'Sem rede').toUpperCase();
      mapa.set(cor, (mapa.get(cor) || 0) + (Number(c.quantidade_kg) || 0));
    });
    return Array.from(mapa.entries()).sort((a, b) => b[1] - a[1]);
  }, [filtradas]);

  // ---- UI
  return (
    <div className="space-y-6">
      {/* título e filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-4 flex items-center gap-2 text-2xl font-bold text-slate-800">
          <span>📊</span> Dashboard
        </h2>

        {/* COR DA REDE */}
        <select
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          value={filtros.rede}
          onChange={(e) => setFiltros((f) => ({ ...f, rede: e.target.value }))}
        >
          {opcoesRede.map((r) => (
            <option key={r} value={r}>
              {r === 'Todas' ? 'COR DA REDE' : r}
            </option>
          ))}
        </select>

        {/* SUPERVISÃO */}
        <select
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          value={filtros.supervisao}
          onChange={(e) => setFiltros((f) => ({ ...f, supervisao: e.target.value }))}
        >
          {opcoesSupervisao.map((s) => (
            <option key={s} value={s}>
              {s === 'Todos' ? 'SUPERVISÃO' : s}
            </option>
          ))}
        </select>

        {/* Datas (opcional — só farão efeito quando houver coluna para filtrar) */}
        <input
          type="date"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          value={filtros.dataIni || ''}
          onChange={(e) => setFiltros((f) => ({ ...f, dataIni: e.target.value }))}
        />
        <input
          type="date"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          value={filtros.dataFim || ''}
          onChange={(e) => setFiltros((f) => ({ ...f, dataFim: e.target.value }))}
        />
      </div>

      {/* cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total de Células', value: totalCelulas.toString(), color: 'from-indigo-500 to-blue-500' },
          { label: 'Total de KG', value: `${formatPt(totalKg)} kg`, color: 'from-emerald-500 to-teal-500' },
          { label: 'Média por Célula', value: `${formatPt(mediaKg)} kg`, color: 'from-amber-500 to-orange-500' },
          { label: 'Alertas', value: alertas.toString(), color: 'from-rose-500 to-pink-500' },
        ].map((c, i) => (
          <div key={i} className={`rounded-xl bg-gradient-to-br ${c.color} p-[1px] shadow`}>
            <div className="rounded-xl bg-white p-4">
              <div className="text-3xl font-bold text-slate-800">{c.value}</div>
              <div className="text-sm text-slate-500">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* listas / rankings */}
      <div className="grid gap-6 lg:grid-cols-10">
        <div className="lg:col-span-3">
          <RankingBox title="TOP 15 - SUPERVISÃO" data={topSupervisao} />
        </div>
        <div className="lg:col-span-4">
          <RankingBox title="TOP 15 CÉLULAS" data={topCelulas} />
        </div>
        <div className="lg:col-span-3">
          <RankingBox title="RANKING DE REDE" data={rankingRedes} />
        </div>
      </div>

      {/* aqui ficam seus gráficos (Apex/Recharts) usando 'filtradas' como base */}
      {/* ... */}
      {loading && (
        <div className="text-sm text-slate-500">
          Carregando…
        </div>
      )}
    </div>
  );
}

type RankingBoxProps = {
  title: string;
  data: [string, number][];
};

function RankingBox({ title, data }: RankingBoxProps) {
  // se quiser manter um formatador único, use esse helper:
  const fmtKg = (v: number) =>
    `${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-lg font-semibold text-slate-800">{title}</h3>

      <ol className="space-y-1">
        {data.map(([nome, total], i) => (
          <li key={i} className="flex items-baseline justify-between gap-3">
            {/* bloco do nome (com índice e ellipsis) */}
            <div className="min-w-0 flex-1">
              <span className="font-bold text-slate-800">{i + 1}.</span>{' '}
              <span
                className="truncate align-baseline text-slate-700"
                title={nome}
              >
                {nome}
              </span>
            </div>

            {/* bloco do valor (sempre numa linha, à direita) */}
            <span className="whitespace-nowrap font-semibold text-indigo-600">
              {fmtKg(total)}
            </span>
          </li>
        ))}

        {/* estado vazio (opcional) */}
        {data.length === 0 && (
          <li className="text-sm text-slate-500">Sem dados para exibir.</li>
        )}
      </ol>
    </div>
  );
}

