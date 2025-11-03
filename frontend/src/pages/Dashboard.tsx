// frontend/src/pages/Dashboard.tsx
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import * as XLSX from 'xlsx'; // Importa a biblioteca de Excel
import { Download } from 'lucide-react'; // Ícone para o botão

// LÓGICA DE DADOS (LENDO DO NOVO 'historico_kg')
type HistoricoComCelula = {
  quantidade: number;
  data_chegada: string;
  celulas: { // Dados da célula que fez o recebimento
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
  dataIni: string; // Agora é string, pode ser ""
  dataFim: string; // Agora é string, pode ser ""
};

type RankingBoxProps = {
  title: string;
  data: [string, number][];
};

// Formato com 1 casa decimal (para KGs)
const formatPt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n);

function RankingBox({ title, data }: RankingBoxProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-2 text-lg font-semibold text-slate-800">{title}</h3>
      <ol className="text-sm text-slate-600 space-y-1">
        {data.map(([nome, total], i) => (
          <li key={i} className="flex justify-between items-center">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="font-bold text-slate-800 flex-shrink-0">{i + 1}.</span>
              <span className="truncate">{nome}</span>
            </div>
            <span className="font-semibold text-right ml-2 flex-shrink-0">{formatPt(total)} kg</span>
          </li>
        ))}
        {data.length === 0 && (
          <div className="text-sm text-slate-400">
            Nenhum dado encontrado para os filtros selecionados.
          </div>
        )}
      </ol>
    </div>
  );
}

export default function Dashboard() {
  const [todoHistorico, setTodoHistorico] = useState<HistoricoComCelula[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros (datas começam vazias)
  const [filtros, setFiltros] = useState<Filtros>({
    rede: 'Todas',
    supervisao: 'Todos',
    dataIni: '',
    dataFim: '',
  });

  // Opções dos selects (derivadas do histórico)
  const opcoesRede = useMemo(() => {
    const set = new Set<string>();
    todoHistorico.forEach((r) => set.add((r.celulas?.redes?.cor || 'Sem rede').toUpperCase()));
    return ['Todas', ...Array.from(set).sort()];
  }, [todoHistorico]);

  const opcoesSupervisao = useMemo(() => {
    const set = new Set<string>();
    todoHistorico.forEach((r) => set.add((r.celulas?.supervisores || 'N/D').toUpperCase()));
    return ['Todos', ...Array.from(set).sort()];
  }, [todoHistorico]);

  // Carregamento inicial (lendo de 'historico_kg')
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('historico_kg') // <--- LENDO DA TABELA CORRETA
        .select(`
          quantidade,
          data_chegada,
          celulas (
            id,
            nome,
            lider,
            supervisores,
            redes (cor)
          )
        `);

      if (error) {
        console.error('Erro ao buscar histórico:', error);
        setTodoHistorico([]);
      } else {
        setTodoHistorico((data || []) as HistoricoComCelula[]);
      }
      setLoading(false);
    })();
  }, []);

  // Aplica filtros (COM A LÓGICA DE DATA CORRIGIDA)
  const filtradas = useMemo(() => {
    let arr = [...todoHistorico];

    if (filtros.rede !== 'Todas') {
      const alvo = filtros.rede.toUpperCase();
      arr = arr.filter((r) => (r.celulas?.redes?.cor || 'Sem rede').toUpperCase() === alvo);
    }

    if (filtros.supervisao !== 'Todos') {
      const alvo = filtros.supervisao.toUpperCase();
      arr = arr.filter((r) => (r.celulas?.supervisores || '').toUpperCase() === alvo);
    }

    // AJUSTE: SÓ FILTRA POR DATA SE A DATA ESTIVER PREENCHIDA
    if (filtros.dataIni) {
      const dataIni = new Date(filtros.dataIni);
      dataIni.setUTCHours(0, 0, 0, 0); // Início do dia
      arr = arr.filter((r) => new Date(r.data_chegada) >= dataIni);
    }
    if (filtros.dataFim) {
      const dataFim = new Date(filtros.dataFim);
      dataFim.setUTCHours(23, 59, 59, 999); // Fim do dia
      arr = arr.filter((r) => new Date(r.data_chegada) <= dataFim);
    }

    return arr;
  }, [todoHistorico, filtros]);

  // ---- Métricas (baseadas no histórico filtrado)
  const celulasUnicas = useMemo(() => {
    const set = new Set<number>();
    filtradas.forEach((r) => {
      if (r.celulas?.id) set.add(r.celulas.id);
    });
    return set;
  }, [filtradas]);

  const totalCelulas = celulasUnicas.size;
  const totalKg = useMemo(
    () => filtradas.reduce((s, r) => s + (Number(r.quantidade) || 0), 0),
    [filtradas]
  );
  const mediaKg = totalCelulas > 0 ? totalKg / totalCelulas : 0;
  const alertas = 0;

  // ---- Rankings (baseados no histórico filtrado)
  const topSupervisao = useMemo(() => {
    const mapa = new Map<string, number>();
    filtradas.forEach((r) => {
      if (!r.celulas) return;
      const chave = (r.celulas.supervisores || 'N/D').toUpperCase();
      const qtd = Number(r.quantidade) || 0;
      mapa.set(chave, (mapa.get(chave) || 0) + qtd);
    });
    return Array.from(mapa.entries()).sort((a, b) => b[1] - a[1]).slice(0, 15);
  }, [filtradas]);

  const topCelulas = useMemo(() => {
    const mapa = new Map<string, number>();
    filtradas.forEach((r) => {
      if (!r.celulas) return;
      const chave = r.celulas.nome;
      const qtd = Number(r.quantidade) || 0;
      mapa.set(chave, (mapa.get(chave) || 0) + qtd);
    });
    return Array.from(mapa.entries()).sort((a, b) => b[1] - a[1]).slice(0, 15);
  }, [filtradas]);

  const rankingRedes = useMemo(() => {
    const mapa = new Map<string, number>();
    filtradas.forEach((r) => {
      if (!r.celulas?.redes) return;
      const cor = (r.celulas.redes.cor || 'Sem rede').toUpperCase();
      const qtd = Number(r.quantidade) || 0;
      mapa.set(cor, (mapa.get(cor) || 0) + qtd);
    });
    return Array.from(mapa.entries()).sort((a, b) => b[1] - a[1]);
  }, [filtradas]);

  // --- NOVA FUNÇÃO DE EXPORTAR PARA EXCEL ---
  const handleExportExcel = () => {
    const dataSupervisao = topSupervisao.map(([Supervisao, KG]) => ({ Supervisao, KG }));
    const dataCelulas = topCelulas.map(([Celula, KG]) => ({ Celula, KG }));
    const dataRedes = rankingRedes.map(([Rede, KG]) => ({ Rede, KG }));
    
    // Planilha extra com todos os lançamentos filtrados
    const dataDetalhada = filtradas.map(r => ({
      Data: new Date(r.data_chegada).toLocaleDateString('pt-BR'),
      Celula: r.celulas?.nome || 'N/D',
      Supervisores: r.celulas?.supervisores || 'N/D',
      Rede: r.celulas?.redes?.cor || 'N/D',
      Quantidade_KG: r.quantidade
    }));

    const wsSupervisao = XLSX.utils.json_to_sheet(dataSupervisao);
    const wsCelulas = XLSX.utils.json_to_sheet(dataCelulas);
    const wsRedes = XLSX.utils.json_to_sheet(dataRedes);
    const wsDetalhada = XLSX.utils.json_to_sheet(dataDetalhada);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsDetalhada, "Lançamentos Filtrados");
    XLSX.utils.book_append_sheet(wb, wsSupervisao, "Top Supervisão");
    XLSX.utils.book_append_sheet(wb, wsCelulas, "Top Células");
    XLSX.utils.book_append_sheet(wb, wsRedes, "Ranking Redes");

    const dataHoje = new Date().toISOString().split('T')[0];
    const nomeArquivo = `Relatorio_KG_do_Amor_${dataHoje}.xlsx`;
    XLSX.writeFile(wb, nomeArquivo);
  };

  // ---- UI (COM DESIGN ORIGINAL RESTAURADO)
  return (
    <div className="space-y-6 p-6">
      {/* Título e Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-4 flex items-center gap-2 text-2xl font-bold text-slate-800">
          <span>📊</span> Dashboard
        </h2>
        
        {/* Filtros */}
        <select
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          value={filtros.rede}
          onChange={(e) => setFiltros((f) => ({ ...f, rede: e.target.value }))}
        >
          {opcoesRede.map((r) => (<option key={r} value={r}>{r === 'Todas' ? 'COR DA REDE' : r}</option>))}
        </select>
        <select
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          value={filtros.supervisao}
          onChange={(e) => setFiltros((f) => ({ ...f, supervisao: e.target.value }))}
        >
          {opcoesSupervisao.map((s) => (<option key={s} value={s}>{s === 'Todos' ? 'SUPERVISÃO' : s}</option>))}
        </select>
        <input
          type="date"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          value={filtros.dataIni}
          onChange={(e) => setFiltros((f) => ({ ...f, dataIni: e.target.value }))}
          placeholder="dd/mm/aaaa"
        />
        <input
          type="date"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          value={filtros.dataFim}
          onChange={(e) => setFiltros((f) => ({ ...f, dataFim: e.target.value }))}
          placeholder="dd/mm/aaaa"
        />

        {/* --- BOTÃO DE EXPORTAR --- */}
        <button
          onClick={handleExportExcel}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
          title="Exportar para Excel"
        >
          <Download size={16} />
          Exportar
        </button>
      </div>

      {/* Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Células com Doações', value: totalCelulas.toString(), color: 'from-indigo-500 to-blue-500' },
          { label: 'Total de KG no Período', value: `${formatPt(totalKg)} kg`, color: 'from-emerald-500 to-teal-500' },
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

      {/* Rankings */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <RankingBox title="TOP 15 - SUPERVISÃO" data={topSupervisao} />
        </div>
        <div className="lg:col-span-5">
          <RankingBox title="TOP 15 CÉLULAS" data={topCelulas} />
        </div>
        <div className="lg:col-span-3">
          <RankingBox title="RANKING DE REDE" data={rankingRedes} />
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-5">
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-2 text-lg font-semibold text-slate-800">Distribuição por Redes</h3>
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <svg width="140" height="140" viewBox="0 0 140 140" className="transform -rotate-90">
                {rankingRedes.length > 0 ? (() => {
                  const total = rankingRedes.reduce((sum, [, kg]) => sum + kg, 0);
                  if (total === 0) return <circle cx="70" cy="70" r="55" fill="#e2e8f0" />;
                  let currentAngle = 0;
                  const coresRede: { [key: string]: string } = {
                    'BRANCA': '#E2E8F0', 'BRANCO': '#E2E8F0', 'AMARELA': '#FFEB3B', 'AMARELO': '#FFEB3B',
                    'VERMELHA': '#F44336', 'VERMELHO': '#F44336', 'VERDE': '#4CAF50', 'AZUL': '#2196F3',
                    'MARROM': '#8D6E63', 'ROXA': '#9C27B0', 'ROXO': '#9C27B0'
                  };
                  return rankingRedes.map(([cor, kg]) => {
                    if (kg === 0) return null;
                    const angle = (kg / total) * 360;
                    const startAngle = currentAngle; const endAngle = currentAngle + angle;
                    const startAngleRad = (startAngle * Math.PI) / 180; const endAngleRad = (endAngle * Math.PI) / 180;
                    const largeArcFlag = angle > 180 ? 1 : 0;
                    const x1 = 70 + 55 * Math.cos(startAngleRad); const y1 = 70 + 55 * Math.sin(startAngleRad);
                    const x2 = 70 + 55 * Math.cos(endAngleRad); const y2 = 70 + 55 * Math.sin(endAngleRad);
                    const pathData = [ `M 70 70`, `L ${x1} ${y1}`, `A 55 55 0 ${largeArcFlag} 1 ${x2} ${y2}`, 'Z' ].join(' ');
                    currentAngle += angle;
                    const corFinal = coresRede[cor.toUpperCase()] || '#64748b';
                    return (
                      <g key={cor}>
                        <path d={pathData} fill={corFinal}
                          stroke={cor.toUpperCase() === 'BRANCA' || cor.toUpperCase() === 'BRANCO' ? '#cbd5e1' : 'white'}
                          strokeWidth="2" />
                      </g>
                    );
                  });
                })() : ( <circle cx="70" cy="70" r="55" fill="#e2e8f0" /> )}
              </svg>
            </div>
            <div className="flex-1 space-y-1">
              {rankingRedes.map(([cor, kg]) => {
                const coresRede: { [key: string]: string } = {
                  'BRANCA': '#E2E8F0', 'BRANCO': '#E2E8F0', 'AMARELA': '#FFEB3B', 'AMARELO': '#FFEB3B',
                  'VERMELHA': '#F44336', 'VERMELHO': '#F44336', 'VERDE': '#4CAF50', 'AZUL': '#2196F3',
                  'MARROM': '#8D6E63', 'ROXA': '#9C27B0', 'ROXO': '#9C27B0'
                };
                const total = rankingRedes.reduce((sum, [, weight]) => sum + weight, 0);
                const percentage = total > 0 ? ((kg / total) * 100).toFixed(1) : '0';
                const corFinal = coresRede[cor.toUpperCase()] || '#64748b';
                if (kg === 0) return null;
                return (
                  <div key={cor} className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full border"
                      style={{ 
                        backgroundColor: corFinal,
                        borderColor: cor.toUpperCase() === 'BRANCA' || cor.toUpperCase() === 'BRANCO' ? '#cbd5e1' : 'transparent'
                      }}
                    ></div>
                    <span className="flex-1 font-medium">{cor}</span>
                    <span className="font-semibold">{percentage}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="lg:col-span-3 rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-2 text-lg font-semibold text-slate-800">Top 15 Supervisões</h3>
          <div className="h-52 flex items-end justify-between gap-1 px-1">
            {topSupervisao.slice(0, 15).map(([nome, kg], index) => {
              const maxKg = Math.max(...topSupervisao.slice(0, 15).map(([, weight]) => weight));
              const height = maxKg > 0 ? (kg / maxKg) * 180 : 0;
              const primeiroRecebimento = filtradas.find(r => r.celulas?.supervisores.toUpperCase() === nome.toUpperCase());
              const corRede = primeiroRecebimento?.celulas?.redes?.cor;
              const coresRede: { [key: string]: string } = {
                'BRANCA': '#E2E8F0', 'BRANCO': '#E2E8F0', 'AMARELA': '#FFEB3B', 'AMARELO': '#FFEB3B',
                'VERMELHA': '#F44336', 'VERMELHO': '#F44336', 'VERDE': '#4CAF50', 'AZUL': '#2196F3',
                'MARROM': '#8D6E63', 'ROXA': '#9C27B0', 'ROXO': '#9C27B0'
              };
              const corFinal = corRede ? (coresRede[corRede.toUpperCase()] || '#64748b') : '#64748b';
              if (kg === 0) return null;
              return (
                <div key={nome} className="flex flex-col items-center group relative">
                  <div
                    className="w-6 transition-all duration-200 group-hover:opacity-80 rounded-t border-b-2"
                    style={{ 
                      height: `${height}px`, 
                      backgroundColor: corFinal,
                      borderColor: corRede?.toUpperCase() === 'BRANCA' || corRede?.toUpperCase() === 'BRANCO' ? '#cbd5e1' : 'transparent'
                    }}
                  ></div>
                  <div className="mt-1 text-xs font-bold text-slate-700">{index + 1}º</div>
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-8 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    <div className="font-medium">{nome}</div>
                    <div>{formatPt(kg)} kg</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 text-xs text-slate-500 text-center">
            Passe o mouse sobre as barras para ver detalhes
          </div>
        </div>
      </div>
    </div>
  );
}