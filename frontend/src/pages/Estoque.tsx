import React, { useState, useEffect, useMemo } from "react";
import { Boxes, ChevronDown, ChevronUp, Package, Search } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "../lib/supabaseClient";
import { EmptyState, PageHeader, Surface, StatCard } from "../components/ui";

interface Categoria {
  id: number;
  nome: string;
  cor: string;
}

interface EstoqueItem {
  id: number;
  quantidade_atual: number;
  localizacao: string | null;
  produtos: {
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
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCategoria, setExpandedCategoria] = useState<number | null>(null);

  useEffect(() => {
    async function carregarEstoque() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("estoque")
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
          .gt("quantidade_atual", 0)
          .order("nome", { referencedTable: "produtos", ascending: true });

        if (error) throw error;
        setItensEstoque((data as EstoqueItem[]) || []);
      } catch (error: any) {
        console.error("Erro ao carregar estoque:", error);
        toast.error("Erro ao carregar estoque: " + error.message);
      } finally {
        setLoading(false);
      }
    }

    carregarEstoque();
  }, []);

  const itensPorCategoria = useMemo(() => {
    const agrupado: Record<string, { categoria: Categoria; itens: EstoqueItem[] }> = {};

    const itensFiltrados = itensEstoque.filter((item) =>
      item.produtos?.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );

    itensFiltrados.forEach((item) => {
      const categoria = item.produtos?.categorias;
      const catNome = categoria?.nome || "Sem Categoria";

      if (!agrupado[catNome]) {
        agrupado[catNome] = {
          categoria: {
            id: item.produtos?.categoria_id || 0,
            nome: catNome,
            cor: categoria?.cor || "#6B7280",
          },
          itens: [],
        };
      }

      agrupado[catNome].itens.push(item);
    });

    return Object.values(agrupado).sort((a, b) => a.categoria.nome.localeCompare(b.categoria.nome));
  }, [itensEstoque, searchTerm]);

  const totalCategorias = itensPorCategoria.length;
  const totalProdutos = itensEstoque.length;
  const totalQuantidade = useMemo(
    () => itensEstoque.reduce((total, item) => total + (Number(item.quantidade_atual) || 0), 0),
    [itensEstoque]
  );

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="app-surface flex min-w-[280px] flex-col items-center gap-4 px-8 py-10 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-slate-200 border-t-slate-900" />
          <div>
            <div className="text-base font-semibold text-slate-900">Carregando estoque</div>
            <div className="mt-1 text-sm text-slate-500">Preparando a consulta dos itens disponiveis.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Consulta de estoque"
        title="Visao atual do estoque"
        description="Encontre rapidamente produtos disponiveis, distribuidos por categoria, com foco em leitura clara no desktop e no mobile."
      />

      <div className="stats-grid xl:grid-cols-3">
        <StatCard label="Categorias com itens" value={totalCategorias} icon={<Boxes className="h-5 w-5" />} tone="blue" />
        <StatCard label="Produtos ativos" value={totalProdutos} icon={<Package className="h-5 w-5" />} tone="green" />
        <StatCard label="Quantidade total" value={totalQuantidade} icon={<Search className="h-5 w-5" />} tone="amber" />
      </div>

      <div className="toolbar-surface">
        <div className="relative max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar produto no estoque..."
            className="pl-10"
          />
        </div>
      </div>

      <div className="space-y-4">
        {itensPorCategoria.length === 0 ? (
          <EmptyState
            icon={<Package className="h-7 w-7" />}
            title="Estoque vazio"
            description="Nenhum produto foi encontrado com os filtros atuais."
          />
        ) : (
          itensPorCategoria.map(({ categoria, itens }) => (
            <Surface key={`${categoria.id}-${categoria.nome}`} className="overflow-hidden" bodyClassName="p-0">
              <button
                type="button"
                onClick={() => setExpandedCategoria((prev) => (prev === categoria.id ? null : categoria.id))}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-slate-50/90"
                style={{ borderLeft: `4px solid ${categoria.cor}` }}
              >
                <div>
                  <h3 className="text-base font-semibold text-slate-900">{categoria.nome}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {itens.length} {itens.length === 1 ? "item" : "itens"} nesta categoria
                  </p>
                </div>
                {expandedCategoria === categoria.id ? (
                  <ChevronUp className="h-5 w-5 text-slate-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-slate-400" />
                )}
              </button>

              {expandedCategoria === categoria.id ? (
                <div className="divide-y divide-slate-200/80 border-t border-slate-200/70 bg-white/70">
                  {itens.map((item) => (
                    <div key={item.id} className="grid gap-4 px-5 py-4 md:grid-cols-[1.5fr_0.8fr_0.8fr] md:items-center">
                      <div>
                        <p className="font-medium text-slate-900">{item.produtos?.nome}</p>
                        <p className="mt-1 text-sm text-slate-500">Local: {item.localizacao || "N/D"}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-500">
                        Quantidade
                        <div className="mt-1 text-lg font-semibold text-slate-900">
                          {item.quantidade_atual}
                          <span className="ml-1 text-sm font-normal text-slate-500">{item.produtos?.unidade}</span>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-500">
                        Categoria
                        <div className="mt-1 font-semibold text-slate-900">{categoria.nome}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </Surface>
          ))
        )}
      </div>
    </div>
  );
}
