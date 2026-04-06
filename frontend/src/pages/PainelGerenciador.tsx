// frontend/src/pages/PainelGerenciador.tsx
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Users, TrendingUp, TrendingDown, Download, FileText } from 'lucide-react';
import toast from 'react-hot-toast'; 
import * as XLSX from 'xlsx'; 
import { formatLocalDate, toUtcISOStringFromLocalDate } from '../utils/date';
import { PageHeader, StatCard, Surface } from '../components/ui';

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
  quantidade: number | null;
  quantidade_itens: number | null;
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
    <Surface title={title} className="h-full" bodyClassName="space-y-2">
      <ol className="text-sm text-slate-600 space-y-2">
        {data.map(([nome, total], i) => (
          <li key={nome + i} className="flex justify-between items-center rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
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
    </Surface>
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
  const sortedData = useMemo(() => [...data].sort((a, b) => b.total - a.total), [data]);

  return (
    <div className="space-y-4">
      {sortedData.map(rede => {
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
  const [dataIni, setDataIni] = useState(() => {
    const now = new Date();
    return formatLocalDate(new Date(now.getFullYear(), now.getMonth(), 1));
  });
  const [dataFim, setDataFim] = useState(() => {
    const now = new Date();
    return formatLocalDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  });


  // Carrega todos os dados
  useEffect(() => {
    async function carregarDadosMacro() {
      try {
        setLoading(true);
        const parseISODate = (value: string, endOfDay = false) =>
          toUtcISOStringFromLocalDate(value, endOfDay);
        const inicio = parseISODate(dataIni);
        const fim = parseISODate(dataFim, true);
        // Pega todas as células ativas (para a base geral)
        const { data: celulasData, error: celulasError } = await supabase
          .from('celulas')
          .select('id, nome, lider, supervisores, quantidade_kg, quantidade_itens, redes(id, cor, hex)') 
          .eq('ativo', true);
        if (celulasError) throw celulasError;
        setCelulas(celulasData as Celula[] || []);

        // Pega todo o histórico (para ver quem entregou)
        let historicoQuery = supabase
          .from('historico_kg')
          .select('celula_id, data_chegada, quantidade, quantidade_itens');
        if (inicio) {
          historicoQuery = historicoQuery.gte('data_chegada', inicio);
        }
        if (fim) {
          historicoQuery = historicoQuery.lte('data_chegada', fim);
        }
        const { data: historicoData, error: historicoError } = await historicoQuery;
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
    const ids = new Set<number>();
    const inicioDoPeriodo = dataIni ? new Date(`${dataIni}T00:00:00`) : null;
    const fimDoPeriodo = dataFim ? new Date(`${dataFim}T23:59:59.999`) : null;

    const periodoInvalido =
      (inicioDoPeriodo && isNaN(inicioDoPeriodo.getTime())) ||
      (fimDoPeriodo && isNaN(fimDoPeriodo.getTime()));
    if (periodoInvalido) {
      historico.forEach((h) => ids.add(h.celula_id));
      return ids;
    }

    historico.forEach(h => {
      const dataEntrega = new Date(h.data_chegada);
      if (isNaN(dataEntrega.getTime())) return;
      const passouInicio = !inicioDoPeriodo || dataEntrega >= inicioDoPeriodo;
      const passouFim = !fimDoPeriodo || dataEntrega <= fimDoPeriodo;
      if (passouInicio && passouFim) {
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

      const dataHoje = formatLocalDate();
      const nomeArquivo = `Relatorio_Geral_Celulas_${dataHoje}.xlsx`;
      XLSX.writeFile(wb, nomeArquivo);
      toast.success('Relatório exportado!');

    } catch (error: any) {
      console.error("Erro ao exportar Excel:", error);
      toast.error("Falha ao exportar Excel: " + error.message);
    }
  };

  const handleGerarRelatorioEstrategico = () => {
    try {
      const periodLabel = (valor: string) => {
        if (!valor) return null;
        const data = new Date(`${valor}T00:00:00`);
        if (isNaN(data.getTime())) return null;
        return data.toLocaleDateString('pt-BR');
      };
      const inicioLabel = periodLabel(dataIni);
      const fimLabel = periodLabel(dataFim);
      const periodoTexto = inicioLabel && fimLabel
        ? `${inicioLabel} a ${fimLabel}`
        : 'Geral (todos os registros disponíveis)';

      const celulaMap = new Map(celulas.map(c => [c.id, c]));
      type ResumoEntrega = { kg: number; itens: number; entregas: number; ultimaEntrega: string | null };
      const entregasPorCelula = new Map<number, ResumoEntrega>();

      historico.forEach(h => {
        const atual = entregasPorCelula.get(h.celula_id) || { kg: 0, itens: 0, entregas: 0, ultimaEntrega: null };
        atual.kg += Number(h.quantidade) || 0;
        atual.itens += Number(h.quantidade_itens) || 0;
        atual.entregas += 1;
        if (!atual.ultimaEntrega || new Date(h.data_chegada) > new Date(atual.ultimaEntrega)) {
          atual.ultimaEntrega = h.data_chegada;
        }
        entregasPorCelula.set(h.celula_id, atual);
      });

      const totalKgPeriodo = Array.from(entregasPorCelula.values()).reduce((sum, info) => sum + info.kg, 0);
      const totalItensPeriodo = Array.from(entregasPorCelula.values()).reduce((sum, info) => sum + info.itens, 0);
      const totalEntregasPeriodo = Array.from(entregasPorCelula.values()).reduce((sum, info) => sum + info.entregas, 0);
      const formatNumeric = (value: number) => Number(value.toFixed(2));

      const criarResumoDimensao = (
        keyGetter: (celula: Celula) => { chave: string; extra?: Record<string, any> } | null,
        colunaNome: string
      ) => {
        const mapa = new Map<string, any>();
        const ensureEntry = (celula: Celula) => {
          const dimensao = keyGetter(celula);
          if (!dimensao) return null;
          const chave = (dimensao.chave || 'N/D').toUpperCase();
          if (!mapa.has(chave)) {
            mapa.set(chave, {
              [colunaNome]: chave,
              ...(dimensao.extra || {}),
              'Total de Células': 0,
              'Células Entregaram': 0,
              'Células Não Entregaram': 0,
              'KG no Período': 0,
              'Itens no Período': 0,
              'Qtde de Entregas': 0,
            });
          }
          return mapa.get(chave);
        };

        celulas.forEach(c => {
          const entry = ensureEntry(c);
          if (!entry) return;
          entry['Total de Células'] += 1;
          if (celulasAtivasIds.has(c.id)) {
            entry['Células Entregaram'] += 1;
          } else {
            entry['Células Não Entregaram'] += 1;
          }
        });

        entregasPorCelula.forEach((info, celulaId) => {
          const celula = celulaMap.get(celulaId);
          if (!celula) return;
          const entry = ensureEntry(celula);
          if (!entry) return;
          entry['KG no Período'] += info.kg;
          entry['Itens no Período'] += info.itens;
          entry['Qtde de Entregas'] += info.entregas;
        });

        return Array.from(mapa.values()).map(registro => ({
          ...registro,
          '% de Entrega': registro['Total de Células'] > 0
            ? Number(((registro['Células Entregaram'] / registro['Total de Células']) * 100).toFixed(2))
            : 0,
          'Média KG por Célula Ativa': registro['Células Entregaram'] > 0
            ? Number((registro['KG no Período'] / registro['Células Entregaram']).toFixed(2))
            : 0
        })).sort((a, b) => b['KG no Período'] - a['KG no Período']);
      };

      const redesSheet = criarResumoDimensao(
        (celula) => ({ chave: celula.redes?.cor || 'Sem Rede', extra: { 'Hex da Rede': celula.redes?.hex || '#6B7280' } }),
        'Rede'
      ).map(registro => ({
        ...registro,
        'Participação no KG (%)': totalKgPeriodo > 0 ? Number(((registro['KG no Período'] / totalKgPeriodo) * 100).toFixed(2)) : 0
      }));

      const supervisaoSheet = criarResumoDimensao(
        (celula) => ({ chave: celula.supervisores || 'Sem Supervisão' }),
        'Supervisão'
      );

      const lideresSheet = criarResumoDimensao(
        (celula) => ({ chave: celula.lider || 'Sem Líder' }),
        'Líder'
      );

      const detalhamentoCelulas = celulas.map(c => {
        const entrega = entregasPorCelula.get(c.id);
        const ultimaEntrega = entrega?.ultimaEntrega ? new Date(entrega.ultimaEntrega).toLocaleDateString('pt-BR') : 'Sem registro';
        return {
          'Célula': c.nome,
          'Rede': c.redes?.cor || 'Sem Rede',
          'Supervisão': c.supervisores,
          'Líderes': c.lider,
          'Status no Período': celulasAtivasIds.has(c.id) ? 'Entregou' : 'Não Entregou',
          'Qtde de Entregas no Período': entrega?.entregas || 0,
          'KG Registrados no Período': formatNumeric(entrega?.kg || 0),
          'Itens Registrados no Período': entrega?.itens || 0,
          'Saldo Atual KG': formatNumeric(Number(c.quantidade_kg) || 0),
          'Saldo Atual Itens': Number(c.quantidade_itens) || 0,
          'Última entrega no período': ultimaEntrega
        };
      }).sort((a, b) => b['KG Registrados no Período'] - a['KG Registrados no Período']);

      const listaNaoEntregues = detalhamentoCelulas
        .filter(item => item['Status no Período'] === 'Não Entregou')
        .map(item => ({
          ...item,
          'Motivo / Observações': 'Sem entrega registrada no período'
        }));

      const produtosEntradaSheet = rankings.rankingEntradas.map(([produto, total]) => {
        const unidade = produto.includes('(') ? produto.split('(')[1].replace(')', '') : 'un';
        const nome = produto.includes('(') ? produto.split('(')[0].trim() : produto;
        return {
          Produto: nome,
          Unidade: unidade,
          Quantidade: Number(total.toFixed(2))
        };
      });

      const produtosSaidaSheet = rankings.rankingSaidas.map(([produto, total]) => {
        const unidade = produto.includes('(') ? produto.split('(')[1].replace(')', '') : 'un';
        const nome = produto.includes('(') ? produto.split('(')[0].trim() : produto;
        return {
          Produto: nome,
          Unidade: unidade,
          Quantidade: Number(total.toFixed(2))
        };
      });

      const insights: string[] = [];
      const taxaEntrega = stats.totalCelulas > 0 ? (stats.celulasAtivas / stats.totalCelulas) * 100 : 0;
      insights.push(`Taxa geral de entrega: ${taxaEntrega.toFixed(1)}% (${stats.celulasAtivas} de ${stats.totalCelulas} células entregaram).`);
      if (redesSheet.length > 0) {
        const melhorRede = redesSheet[0];
        const piorRede = redesSheet[redesSheet.length - 1];
        insights.push(`Maior volume no período: rede ${melhorRede.Rede} com ${melhorRede['KG no Período'].toFixed(1)} kg (${melhorRede['Participação no KG (%)']}% do total).`);
        insights.push(`Menor participação: rede ${piorRede.Rede} com taxa de entrega de ${piorRede['% de Entrega']}%.`);
      }
      if (supervisaoSheet.length > 0) {
        const topSuper = supervisaoSheet[0];
        insights.push(`Supervisão em destaque: ${topSuper.Supervisão} com ${topSuper['KG no Período'].toFixed(1)} kg registrados.`);
      }
      if (listaNaoEntregues.length > 0) {
        insights.push(`Existem ${listaNaoEntregues.length} células sem entregas; priorize contato com ${listaNaoEntregues.slice(0, 5).map(c => c['Célula']).join(', ')}.`);
      }
      if (produtosEntradaSheet.length > 0) {
        const principaisProdutos = produtosEntradaSheet.slice(0, 3).map(p => `${p.Produto} (${p.Quantidade} ${p.Unidade})`).join(', ');
        insights.push(`Principais produtos recebidos no período: ${principaisProdutos}.`);
      }

      const resumoGeralSheet = [{
        'Período Analisado': periodoTexto,
        'Total de Células': stats.totalCelulas,
        'Células que Entregaram': stats.celulasAtivas,
        'Células que Não Entregaram': stats.celulasInativas,
        'Taxa de Entrega (%)': Number(taxaEntrega.toFixed(2)),
        'Total de KG Registrado': formatNumeric(totalKgPeriodo),
        'Total de Itens Registrados': Number(totalItensPeriodo.toFixed(0)),
        'Qtd. de Entregas no Período': totalEntregasPeriodo,
        'Média KG por Entrega': formatNumeric(totalEntregasPeriodo > 0 ? totalKgPeriodo / totalEntregasPeriodo : 0),
        'Média KG por Célula Ativa': formatNumeric(stats.celulasAtivas > 0 ? totalKgPeriodo / stats.celulasAtivas : 0)
      }];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(resumoGeralSheet), '01_Resumo');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(redesSheet), '02_Redes');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(supervisaoSheet), '03_Supervisões');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(lideresSheet), '04_Líderes');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(detalhamentoCelulas), '05_Células');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(listaNaoEntregues), '06_Não Entregues');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(produtosEntradaSheet), '07_Produtos Entrada');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(produtosSaidaSheet), '08_Produtos Saída');
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(insights.map((texto, index) => ({ '#': index + 1, Insight: texto }))),
        '09_Insights'
      );

      const periodoArquivo = inicioLabel && fimLabel ? `${dataIni}_${dataFim}` : 'geral';
      const nomeArquivo = `Relatorio_Estrategico_KG_${periodoArquivo}.xlsx`;
      XLSX.writeFile(workbook, nomeArquivo);
      toast.success('Relatório estratégico gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar relatório estratégico:', error);
      toast.error('Não foi possível gerar o relatório estratégico.');
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
    <div className="space-y-6">
      <PageHeader
        eyebrow="Visao gerencial"
        title="Painel gerenciador"
        description="Leitura consolidada da atividade das celulas, entradas e saidas no periodo definido, com exportacoes estrategicas para acompanhamento."
        actions={
          <>
            <input
              type="date"
              value={dataIni}
              onChange={(e) => setDataIni(e.target.value)}
              className="sm:min-w-[172px]"
            />
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="sm:min-w-[172px]"
            />
            <button
              onClick={handleGerarRelatorioEstrategico}
              className="button-base button-primary"
              title="Relatorio completo por Rede, Supervisao e Lideres"
            >
              <FileText size={16} />
              Relatorio Estrategico
            </button>
            <button
              onClick={handleExportExcel}
              className="button-base button-secondary"
              title="Exportar base de celulas para Excel"
            >
              <Download size={16} />
              Exportar Base
            </button>
          </>
        }
      />
      
      {/* Cards de Resumo */}
      <div className="stats-grid xl:grid-cols-3">
        <StatCard label="Total de celulas" value={stats.totalCelulas} icon={<Users className="h-5 w-5" />} tone="blue" />
        <StatCard label="Celulas entregues" value={stats.celulasAtivas} icon={<TrendingUp className="h-5 w-5" />} tone="green" />
        <StatCard label="Celulas nao entregues" value={stats.celulasInativas} icon={<TrendingDown className="h-5 w-5" />} tone="rose" />
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
