// frontend/src/pages/PainelGerenciador.tsx
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Users, TrendingUp, TrendingDown, Download } from 'lucide-react';
import toast from 'react-hot-toast'; 
import * as XLSX from 'xlsx'; 

// --- Interfaces Atualizadas ---
interface Celula {
  id: number;
  nome: string;
  lider: string;
  supervisores: string;
  quantidade_kg: number;
  quantidade_itens: number;
  redes: { 
    id: number;
    cor: string;
    hex: string;
  } | null;
}

interface Historico {
  celula_id: number;
  data_chegada: string;
}

// Interface para dados de estoque
interface ItemEstoque {
  quantity: number;
  unit: string;
  produtos: {
    nome: string;
  } | null;
}
// --- Fim das Interfaces ---

// --- Componente RankingBox ATUALIZADO ---
// Formata número (inteiro ou com 1 decimal)
const formatNum = (n: number) => {
  if (n % 1 === 0) {
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
  }
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n);
}

function RankingBox({ title, data }: { title: string, data: [string, number][] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-2 text-lg font-semibold text-slate-800">{title}</h3>
      <ol className="text-sm text-slate-600 space-y-1">
        {data.map(([nome, total], i) => (
          <li key={nome + i} className="flex justify-between items-center">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="font-bold text-slate-800 flex-shrink-0">{i + 1}.</span>
              <span className="truncate">{nome}</span>
            </div>
            {/* Remove o "kg" fixo, pois a unidade já está no nome */}
            <span className="font-semibold text-right ml-2 flex-shrink-0">{formatNum(total)}</span>
          </li>
        ))}
        {data.length === 0 && (
          <div className="text-sm text-slate-400">
            Nenhum dado encontrado.
          </div>
        )}
      </ol>
    </div>
  );
}
// --- Fim do Componente RankingBox ---

// Componente PieChart
function PieChart({ data }: { data: { name: string, value: number, color: string }[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-40">
        <svg width="140" height="140" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r="55" fill="#e2e8f0" />
        </svg>
      </div>
    );
  }

  let currentAngle = 0;
  return (
    <svg width="140" height="140" viewBox="0 0 140 140" className="transform -rotate-90">
      {data.map((item) => {
        if (item.value === 0) return null;
        const angle = (item.value / total) * 360;
        const startAngle = currentAngle;
        const endAngle = currentAngle + angle;
        const startAngleRad = (startAngle * Math.PI) / 180;
        const endAngleRad = (endAngle * Math.PI) / 180;
        const largeArcFlag = angle > 180 ? 1 : 0;
        const x1 = 70 + 55 * Math.cos(startAngleRad);
        const y1 = 70 + 55 * Math.sin(startAngleRad);
        const x2 = 70 + 55 * Math.cos(endAngleRad);
        const y2 = 70 + 55 * Math.sin(endAngleRad);
        const pathData = [`M 70 70`, `L ${x1} ${y1}`, `A 55 55 0 ${largeArcFlag} 1 ${x2} ${y2}`, 'Z'].join(' ');
        currentAngle += angle;
        return <path key={item.name} d={pathData} fill={item.color} stroke="white" strokeWidth="2" />;
      })}
    </svg>
  );
}

// Componente Gráfico de Barras de Atividade por Rede
interface RedeStats {
  nome: string;
  ativas: number;
  inativas: number;
  total: number;
  cor: string;
}
function AtividadeRedesChart({ data, onRedeClick }: { data: RedeStats[], onRedeClick: (rede: string) => void }) {
  
  return (
    <div className="space-y-4">
      {data.sort((a,b) => b.total - a.total).map(rede => {
        const percAtivas = rede.total > 0 ? (rede.ativas / rede.total) * 100 : 0;
        const percInativas = rede.total > 0 ? (rede.inativas / rede.total) * 100 : 0;
        
        const isWhiteNetwork = rede.nome.toUpperCase() === 'BRANCA' || rede.nome.toUpperCase() === 'BRANCO';
        const textColor = isWhiteNetwork ? '#333' : rede.cor; 
        
        return (
          <div 
            key={rede.nome}
            onClick={() => onRedeClick(rede.nome)}
            className="cursor-pointer select-none"
            title="Ver celulas que nao entregaram"
          >
            <div className="flex justify-between items-center mb-1 text-sm">
              <span 
                className="font-medium"
                style={{ color: textColor }} 
              >
                {rede.nome}
              </span>
              <span className="text-slate-500">{rede.ativas} Entregues / {rede.inativas} Não Entregues ({rede.total} Total)</span>
            </div>
            <div className="flex h-6 w-full bg-slate-200 rounded overflow-hidden">
              <div 
                className="bg-green-500"
                style={{ width: `${percAtivas}%` }}
                title={`Entregues: ${rede.ativas}`}
              ></div>
              <div 
                className="bg-red-500"
                style={{ width: `${percInativas}%` }}
                title={`Não Entregues: ${rede.inativas}`}
              ></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}


export default function PainelGerenciador() {
  const [loading, setLoading] = useState(true);
  const [celulas, setCelulas] = useState<Celula[]>([]);
  const [historico, setHistorico] = useState<Historico[]>([]);
  const [itensEntrada, setItensEntrada] = useState<ItemEstoque[]>([]); // <-- NOVO
  const [itensSaida, setItensSaida] = useState<ItemEstoque[]>([]); // <-- NOVO
  const [redeSelecionada, setRedeSelecionada] = useState<string | null>(null);
  const [celulasNaoEntregues, setCelulasNaoEntregues] = useState<Celula[]>([]);

  // Filtros de data
  const [dataIni, setDataIni] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [dataFim, setDataFim] = useState(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]);


  // Carrega todos os dados
  useEffect(() => {
    async function carregarDadosMacro() {
      try {
        setLoading(true);
        const inicio = new Date(`${dataIni}T00:00:00Z`).toISOString();
        const fim = new Date(`${dataFim}T23:59:59Z`).toISOString();
        // Pega todas as células ativas (para a base geral)
        const { data: celulasData, error: celulasError } = await supabase
          .from('celulas')
          .select('id, nome, lider, supervisores, quantidade_kg, quantidade_itens, redes(id, cor, hex)') 
          .eq('ativo', true);
        if (celulasError) throw celulasError;
        setCelulas(celulasData as Celula[] || []);

        // Pega todo o histórico (para ver quem entregou)
        const { data: historicoData, error: historicoError } = await supabase
          .from('historico_kg')
          .select('celula_id, data_chegada')
          .gte('data_chegada', inicio)
          .lte('data_chegada', fim);
        if (historicoError) throw historicoError;
        setHistorico(historicoData || []);

        // --- NOVOS FETCHES ---
        // Pega todos os itens de entrada
        const { data: entradaData, error: entradaError } = await supabase
          .from('receipt_items')
          .select('quantity, unit, produtos(nome)');
        if (entradaError) throw entradaError;
        setItensEntrada(entradaData as ItemEstoque[] || []);

        // Pega todos os itens de saida
        const { data: saidaData, error: saidaError } = await supabase
          .from('retirada_itens')
          .select('quantity, unit, produtos(nome)');
        if (saidaError) throw saidaError;
        setItensSaida(saidaData as ItemEstoque[] || []);
        // --- FIM DOS NOVOS FETCHES ---

      } catch (error: any) {
        console.error('Erro ao carregar dados do painel:', error);
        toast.error("Erro ao carregar dados: " + error.message);
      } finally {
        setLoading(false);
      }
    }
    carregarDadosMacro();
  }, [dataIni, dataFim]);

  // Lógica de atividade
  const celulasAtivasIds = useMemo(() => {
    if (!dataIni || !dataFim) return new Set<number>();

    const inicioDoPeriodo = new Date(dataIni);
    inicioDoPeriodo.setUTCHours(0, 0, 0, 0);
    const fimDoPeriodo = new Date(dataFim);
    fimDoPeriodo.setUTCHours(23, 59, 59, 999);

    const ids = new Set<number>();
    historico.forEach(h => {
      const dataEntrega = new Date(h.data_chegada);
      if (dataEntrega >= inicioDoPeriodo && dataEntrega <= fimDoPeriodo) {
        ids.add(h.celula_id);
      }
    });
    return ids;
  }, [historico, dataIni, dataFim]); 

  // Calcula Stats e Rankings
  const { stats, rankings, pieData, redeStats } = useMemo(() => {
    // --- LÓGICA DE ATIVIDADE (Existente) ---
    const totalCelulas = celulas.length;
    const celulasAtivas = celulasAtivasIds.size;
    const celulasInativas = totalCelulas - celulasAtivas;
    
    // Stats por Rede
    const mapRedes = new Map<string, { nome: string, ativas: number, inativas: number, total: number, cor: string }>();

    celulas.forEach(c => {
      // Lógica do gráfico de redes
      const redeNome = c.redes?.cor || 'Sem Rede';
      const redeCor = c.redes?.hex || '#6B7280';
      
      if (!mapRedes.has(redeNome)) {
        mapRedes.set(redeNome, { nome: redeNome, ativas: 0, inativas: 0, total: 0, cor: redeCor });
      }
      
      const statsRede = mapRedes.get(redeNome)!;
      statsRede.total++;
      
      if (celulasAtivasIds.has(c.id)) { 
        statsRede.ativas++;
      } else {
        statsRede.inativas++;
      }
    });
    const redeStatsArray = Array.from(mapRedes.values());
    
    // --- LÓGICA DE RANKING ATUALIZADA (Request 1 e 2) ---
    const mapEntradas = new Map<string, number>();
    itensEntrada.forEach(item => {
      if (!item.produtos) return;
      const key = `${item.produtos.nome} (${item.unit || 'un'})`;
      const qtd = Number(item.quantity) || 0;
      mapEntradas.set(key, (mapEntradas.get(key) || 0) + qtd);
    });
    const rankingEntradas = Array.from(mapEntradas.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);

    const mapSaidas = new Map<string, number>();
    itensSaida.forEach(item => {
      if (!item.produtos) return;
      const key = `${item.produtos.nome} (${item.unit || 'un'})`;
      const qtd = Number(item.quantity) || 0;
      mapSaidas.set(key, (mapSaidas.get(key) || 0) + qtd);
    });
    const rankingSaidas = Array.from(mapSaidas.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);
    // --- FIM DA LÓGICA ATUALIZADA ---

    return {
      stats: {
        totalCelulas,
        celulasAtivas,
        celulasInativas
      },
      rankings: {
        rankingEntradas, // <-- NOVO
        rankingSaidas    // <-- NOVO
      },
      pieData: [
        { name: 'Entregues', value: celulasAtivas, color: '#4CAF50' },
        { name: 'Não Entregues', value: celulasInativas, color: '#F44336' },
      ],
      redeStats: redeStatsArray
    };
  }, [celulas, celulasAtivasIds, itensEntrada, itensSaida]); // <-- Dependências atualizadas

  // --- FUNÇÃO DE EXPORTAR ATUALIZADA ---
  const handleExportExcel = () => {
    try {
      const dadosParaExportar = celulas.map(c => {
        const status = celulasAtivasIds.has(c.id) ? 'Entregue' : 'Não Entregue';
        return {
          'Célula': c.nome,
          'Líderes': c.lider,
          'Supervisores': c.supervisores,
          'Rede': c.redes?.cor || 'N/D',
          'Status no Período': status, 
          'Total KG': c.quantidade_kg,
          'Total Itens': c.quantidade_itens
        };
      });

      const ws = XLSX.utils.json_to_sheet(dadosParaExportar);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Base Geral Células");

      const dataHoje = new Date().toISOString().split('T')[0];
      const nomeArquivo = `Relatorio_Geral_Celulas_${dataHoje}.xlsx`;
      XLSX.writeFile(wb, nomeArquivo);
      toast.success('Relatório exportado!');

    } catch (error: any) {
      console.error("Erro ao exportar Excel:", error);
      toast.error("Falha ao exportar Excel: " + error.message);
    }
  };

  const handleRedeClick = (redeNome: string) => {
    const nome = redeNome || 'Sem Rede';
    const lista = celulas.filter(c => (c.redes?.cor || 'Sem Rede') === nome && !celulasAtivasIds.has(c.id));
    setCelulasNaoEntregues(lista);
    setRedeSelecionada(nome);
  };

  const fecharModalRede = () => {
    setRedeSelecionada(null);
    setCelulasNaoEntregues([]);
  };


  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-600">Calculando análises...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="mr-4 flex items-center gap-2 text-2xl font-bold text-slate-800">
          Painel Gerenciador
        </h2>
        
        {/* Filtros de Data */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            value={dataIni}
            onChange={(e) => setDataIni(e.target.value)}
          />
          <input
            type="date"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
          />
          <button
            onClick={handleExportExcel}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
            title="Exportar base de células para Excel"
          >
            <Download size={16} />
            Exportar Base
          </button>
        </div>
      </div>
      
      {/* Cards de Resumo */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className={`rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 p-[1px] shadow`}>
          <div className="rounded-xl bg-white p-4 flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-slate-800">{stats.totalCelulas}</div>
              <div className="text-sm text-slate-500">Total de Células</div>
            </div>
            <Users className="text-blue-500" size={24} />
          </div>
        </div>
        <div className={`rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 p-[1px] shadow`}>
          <div className="rounded-xl bg-white p-4 flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-slate-800">{stats.celulasAtivas}</div>
              <div className="text-sm text-slate-500">Células Entregues</div>
            </div>
            <TrendingUp className="text-green-500" size={24} />
          </div>
        </div>
        <div className={`rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 p-[1px] shadow`}>
          <div className="rounded-xl bg-white p-4 flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-slate-800">{stats.celulasInativas}</div>
              <div className="text-sm text-slate-500">Células Não Entregues</div>
            </div>
            <TrendingDown className="text-pink-500" size={24} />
          </div>
        </div>
      </div>

      {/* --- RANKINGS ATUALIZADOS --- */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <RankingBox title="Top 15 Produtos (Entradas)" data={rankings.rankingEntradas} />
        <RankingBox title="Top 15 Produtos (Saídas)" data={rankings.rankingSaidas} />
      </div>

      {/* Gráficos de Atividade */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-1 rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-2 text-lg font-semibold text-slate-800">Status de Entrega no Período</h3>
          <div className="flex flex-col items-center gap-4">
            <div className="flex-shrink-0">
              <PieChart data={pieData} />
            </div>
            <div className="w-full space-y-2">
              {pieData.map((item) => (
                <div key={item.name} className="flex items-center gap-3 text-sm">
                  <div className="w-4 h-4 rounded-full border border-gray-300" style={{ backgroundColor: item.color }}></div>
                  <span className="flex-1 font-medium">{item.name}</span>
                  <span className="font-semibold">{item.value}</span>
                  <span className="text-slate-500 w-12 text-right">
                    ({(stats.totalCelulas > 0 ? (item.value / stats.totalCelulas) * 100 : 0).toFixed(1)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-4 text-lg font-semibold text-slate-800">Status por Rede no Período</h3>
          <AtividadeRedesChart data={redeStats} onRedeClick={handleRedeClick} />
        </div>
      </div>

      {redeSelecionada && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-4 w-full max-w-md max-h-[80vh] overflow-y-auto shadow-lg">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-slate-800">Células que não entregaram - {redeSelecionada}</h3>
              <button
                onClick={fecharModalRede}
                className="text-slate-500 hover:text-slate-700 text-lg leading-none"
                aria-label="Fechar"
              >
                X
              </button>
            </div>
            {celulasNaoEntregues.length === 0 ? (
              <p className="text-sm text-slate-500">Todas as células desta rede entregaram no período.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {celulasNaoEntregues.map(c => (
                  <li key={c.id} className="rounded border border-slate-200 p-3">
                    <div className="font-medium text-slate-800">{c.nome}</div>
                    <div className="text-slate-600">Líder: {c.lider}</div>
                    <div className="text-slate-600">Supervisores: {c.supervisores}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
