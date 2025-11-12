// frontend/src/pages/Estoque.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Package, Search, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';

// Interfaces
interface Categoria {
  id: number;
  nome: string;
  cor: string;
}

interface EstoqueItem {
  id: number; // ID da linha de estoque
  quantidade_atual: number;
  localizacao: string | null;
  produtos: { // Dados do produto via join
    id: number;
    nome: string;
    unidade: string;
    categoria_id: number;
    categorias: {
      nome: string;
      cor: string;
    } | null;
  } | null;
}

export default function EstoquePage() {
  const [itensEstoque, setItensEstoque] = useState<EstoqueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategoria, setExpandedCategoria] = useState<number | null>(null);

  // Carrega os dados do estoque
  useEffect(() => {
    async function carregarEstoque() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('estoque')
          .select(`
            id,
            quantidade_atual,
            localizacao,
            produtos (
              id,
              nome,
              unidade,
              categoria_id,
              categorias (
                nome,
                cor
              )
            )
          `)
          .gt('quantidade_atual', 0) // Puxa apenas itens que têm estoque
          .order('nome', { referencedTable: 'produtos', ascending: true });
        
        if (error) throw error;
        setItensEstoque(data as EstoqueItem[] || []);
      } catch (error: any) {
        console.error('Erro ao carregar estoque:', error);
        toast.error('Erro ao carregar estoque: ' + error.message);
      } finally {
        setLoading(false);
      }
    }
    carregarEstoque();
  }, []);

  // Agrupa os itens por categoria
  const itensPorCategoria = useMemo(() => {
    const agrupado: { [key: string]: { categoria: Categoria, itens: EstoqueItem[] } } = {};

    const itensFiltrados = itensEstoque.filter(item => 
      item.produtos?.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );

    itensFiltrados.forEach(item => {
      const categoria = item.produtos?.categorias;
      const catNome = categoria?.nome || 'Sem Categoria';
      
      if (!agrupado[catNome]) {
        agrupado[catNome] = {
          categoria: {
            id: categoria?.id || 0,
            nome: catNome,
            cor: categoria?.cor || '#6B7280'
          },
          itens: []
        };
      }
      agrupado[catNome].itens.push(item);
    });
    
    // Converte o objeto em array e ordena
    return Object.values(agrupado).sort((a, b) => a.categoria.nome.localeCompare(b.categoria.nome));

  }, [itensEstoque, searchTerm]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-600">Carregando estoque...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6 p-4 lg:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 text-xl lg:text-2xl font-bold text-slate-800">
          <Package className="h-5 w-5 lg:h-6 lg:w-6" />
          Consulta de Estoque
        </h2>
        {/* Futuramente, botão de "Nova Retirada" virá aqui */}
      </div>

      {/* Barra de Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar produto no estoque..."
          className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        />
      </div>

      {/* Lista de Itens em Estoque */}
      <div className="space-y-3">
        {itensPorCategoria.length === 0 ? (
           <div className="p-8 text-center text-slate-500">
             <Package className="h-12 w-12 mx-auto mb-4 text-slate-300" />
             <p className="text-lg font-medium mb-2">Estoque vazio</p>
             <p className="text-sm">Nenhum produto encontrado no estoque.</p>
           </div>
        ) : (
          itensPorCategoria.map(({ categoria, itens }) => (
            <div key={categoria.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {/* Header da Categoria */}
              <button
                onClick={() => setExpandedCategoria(prev => (prev === categoria.id ? null : categoria.id))}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
                style={{ borderLeft: `4px solid ${categoria.cor}` }}
              >
                <div>
                  <h3 className="font-medium text-slate-800">{categoria.nome}</h3>
                  <p className="text-xs text-slate-500">{itens.length} {itens.length === 1 ? 'item' : 'itens'} nesta categoria</p>
                </div>
                {expandedCategoria === categoria.id ? 
                  <ChevronUp className="h-5 w-5 text-slate-400" /> : 
                  <ChevronDown className="h-5 w-5 text-slate-400" />
                }
              </button>

              {/* Itens da Categoria */}
              {expandedCategoria === categoria.id && (
                <div className="divide-y divide-slate-200 border-t border-slate-200">
                  {itens.map(item => (
                    <div key={item.id} className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
                      <div className="col-span-2 md:col-span-2">
                        <p className="font-medium text-slate-800">{item.produtos?.nome}</p>
                        <p className="text-xs text-slate-500">Local: {item.localizacao || 'N/D'}</p>
                      </div>
                      <div className="text-right md:text-left">
                        <p className="text-lg font-bold text-slate-800">
                          {item.quantidade_atual}
                          <span className="text-sm font-normal text-slate-500 ml-1">{item.produtos?.unidade}</span>
                        </p>
                      </div>
                      <div className="text-right md:text-left">
                        {/* Espaço reservado para botões de "Retirar" ou "Ajustar" no futuro */}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}