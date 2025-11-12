// frontend/src/pages/Retiradas.tsx
import React, { useState, useEffect, useMemo, KeyboardEvent } from 'react';
import { 
  Plus, Package, Edit, Trash2, Eye, Save, X, Search, 
  ChevronDown, ChevronUp, CheckCircle, Calendar, Truck
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import toast, { Toaster } from 'react-hot-toast';

// --- Interfaces ---
interface Categoria {
  id: number;
  nome: string;
  cor: string;
}

interface Produto {
  id: number;
  nome: string;
  categoria_id: number;
  unidade: string;
  // Join
  categorias?: {
    nome: string;
    cor: string;
  };
}

interface EstoqueItem {
  id: number;
  produto_id: number;
  quantidade_atual: number;
}

// Item do formulário de retirada
interface RetiradaItemForm {
  produto_id: number;
  produto_nome: string;
  quantity: number | string; // <-- ATUALIZADO
  unit: string;
  estoque_disponivel: number; // Para validação
}

// Retirada (para o histórico)
interface Retirada {
  id: number;
  responsavel: string;
  setor: string | null;
  observacoes: string | null;
  created_at: string;
  retirada_itens: {
    id: number;
    quantity: number;
    produtos: {
      nome: string;
      unidade: string;
    }
  }[];
}

export default function RetiradasPage() {
  const [retiradas, setRetiradas] = useState<Retirada[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [estoque, setEstoque] = useState<EstoqueItem[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Estados do formulário
  const [formData, setFormData] = useState({
    responsavel: '',
    setor: '',
    observacoes: ''
  });

  const [items, setItems] = useState<RetiradaItemForm[]>([]);
  const [currentItem, setCurrentItem] = useState<RetiradaItemForm>({
    produto_id: 0,
    produto_nome: '',
    quantity: 0, // <-- ATUALIZADO
    unit: 'un',
    estoque_disponivel: 0
  });

  // Estados para UI
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showDetalhes, setShowDetalhes] = useState<number | null>(null);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1); // <-- NOVO (Request 2)

  // Carregar dados
  useEffect(() => {
    carregarDadosIniciais();
  }, []);

  const carregarDadosIniciais = async () => {
    try {
      setLoading(true);
      
      // 1. Carregar Histórico de Retiradas
      const { data: retiradasData, error: retError } = await supabase
        .from('retiradas')
        .select(`
          id, responsavel, setor, observacoes, created_at,
          retirada_itens (
            id, quantity,
            produtos ( nome, unidade )
          )
        `)
        .order('created_at', { ascending: false });
      if (retError) throw retError;
      setRetiradas(retiradasData as Retirada[] || []);

      // 2. Carregar Produtos com join em Categorias
      const { data: produtosData, error: prodError } = await supabase
        .from('produtos')
        .select('*, categorias(nome, cor)')
        .order('nome');
      if (prodError) throw prodError;
      setProdutos(produtosData as Produto[] || []);

      // 3. Carregar Categorias
      const { data: categoriasData, error: catError } = await supabase
        .from('categorias')
        .select('*')
        .order('nome');
      if (catError) throw catError;
      setCategorias(categoriasData as Categoria[] || []);

      // 4. Carregar Saldos de Estoque
      const { data: estoqueData, error: estError } = await supabase
        .from('estoque')
        .select('id, produto_id, quantidade_atual');
      if (estError) throw estError;
      setEstoque(estoqueData as EstoqueItem[] || []);

    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar produtos para sugestões de busca
  const produtosSugeridos = searchTerm.length > 0 
    ? produtos.filter(produto => 
        produto.nome.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 5)
    : [];

  // Selecionar produto da sugestão
  const selecionarProduto = (produto: Produto) => {
    const itemEmEstoque = estoque.find(e => e.produto_id === produto.id);
    const estoqueDisponivel = itemEmEstoque?.quantidade_atual || 0;

    setCurrentItem(prev => ({
      ...prev,
      produto_id: produto.id,
      produto_nome: produto.nome,
      unit: produto.unidade || 'un',
      estoque_disponivel: estoqueDisponivel
    }));
    setSearchTerm(produto.nome);
    setShowSuggestions(false);
    setActiveIndex(-1);
  };

  // Adicionar item na lista
  const adicionarItem = () => {
    const quantidadeNum = Number(currentItem.quantity);
    if (currentItem.produto_id === 0 || quantidadeNum <= 0) {
      toast.error('Selecione um produto e informe a quantidade.');
      return;
    }
    
    // Validação de Estoque
    if (quantidadeNum > currentItem.estoque_disponivel) {
      toast.error(`Estoque insuficiente! Disponível: ${currentItem.estoque_disponivel} ${currentItem.unit}`);
      return;
    }

    const novoItem: RetiradaItemForm = { ...currentItem, quantity: quantidadeNum };

    if (editingItemIndex !== null) {
      setItems(prev => prev.map((item, index) => 
        index === editingItemIndex ? novoItem : item
      ));
      toast.success('Item atualizado!');
      setEditingItemIndex(null);
    } else {
      setItems(prev => [...prev, novoItem]);
      toast.success('Item adicionado!');
    }
    
    // Reset do formulário
    setCurrentItem({
      produto_id: 0, produto_nome: '', quantity: 0,
      unit: 'un', estoque_disponivel: 0
    });
    setSearchTerm('');
    setActiveIndex(-1);
  };

  const editarItem = (index: number) => {
    const item = items[index];
    setCurrentItem(item);
    setSearchTerm(item.produto_nome || '');
    setEditingItemIndex(index);
  };

  const removerItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
    if (editingItemIndex === index) {
      setEditingItemIndex(null);
      setSearchTerm('');
      setCurrentItem({
        produto_id: 0, produto_nome: '', quantity: 0,
        unit: 'un', estoque_disponivel: 0
      });
    }
    toast.success('Item removido.');
  };

  const limparFormulario = () => {
    setFormData({ responsavel: '', setor: '', observacoes: '' });
    setItems([]);
    setEditingItemIndex(null);
    setSearchTerm('');
    setCurrentItem({
      produto_id: 0, produto_nome: '', quantity: 0,
      unit: 'un', estoque_disponivel: 0
    });
    setIsModalOpen(false);
    setActiveIndex(-1);
  };

  // --- FUNÇÃO DE SALVAR RETIRADA (COM LÓGICA DE ESTOQUE) ---
  const salvarRetirada = async () => {
    if (items.length === 0) {
      toast.error('Adicione pelo menos um item à retirada.');
      return;
    }
    if (!formData.responsavel || !formData.setor) {
      toast.error('Preencha "Responsável" e "Setor".');
      return;
    }

    try {
      // 1. Salvar a retirada principal (tabela 'retiradas')
      const { data: novaRetirada, error: retError } = await supabase
        .from('retiradas')
        .insert({
          responsavel: formData.responsavel,
          setor: formData.setor,
          observacoes: formData.observacoes || null
        })
        .select()
        .single();

      if (retError) throw retError;

      // 2. Salvar os itens da retirada (tabela 'retirada_itens')
      const itensParaSalvar = items.map(item => ({
        retirada_id: novaRetirada.id,
        product_id: item.produto_id,
        quantity: Number(item.quantity),
        unit: item.unit,
      }));

      const { error: itensError } = await supabase
        .from('retirada_itens')
        .insert(itensParaSalvar);

      if (itensError) throw itensError;

      // 3. --- LÓGICA: ATUALIZAR (SUBTRAIR) DO ESTOQUE ---
      for (const item of items) {
        const itemEmEstoque = estoque.find(e => e.produto_id === item.produto_id);
        const saldoAnterior = itemEmEstoque?.quantidade_atual || 0;
        
        if (Number(item.quantity) > saldoAnterior) {
          throw new Error(`Conflito de estoque para ${item.produto_nome}. Abortando.`);
        }

        const novoSaldo = saldoAnterior - Number(item.quantity);

        const { error: updateError } = await supabase
          .from('estoque')
          .update({ 
            quantidade_atual: novoSaldo,
            atualizado_em: new Date().toISOString() // <-- Atualiza data
          }) 
          .eq('produto_id', item.produto_id);

        if (updateError) {
          throw new Error(`Falha ao atualizar estoque para ${item.produto_nome}: ${updateError.message}`);
        }

        // 4. (Opcional) Salvar na tabela de movimentos
        await supabase.from('stock_movements').insert({
          product_id: item.produto_id,
          quantity: -Number(item.quantity), // Quantidade NEGATIVA = SAÍDA
          type: 'OUT',
          retirada_id: novaRetirada.id // Vincula à retirada
        });
      }
      // --- FIM DA LÓGICA DE ESTOQUE ---

      // 5. Recarregar dados e limpar formulário
      carregarDadosIniciais();
      limparFormulario();
      
      toast.success('Retirada salva e estoque atualizado!');
      
    } catch (error: any) {
      console.error('Erro ao salvar retirada:', error);
      toast.error('Erro ao salvar retirada: ' + error.message);
    }
  };

  // --- FUNÇÃO ADICIONADA: NAVEGAÇÃO POR TECLADO ---
  const handleSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (produtosSugeridos.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev >= produtosSugeridos.length - 1 ? 0 : prev + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev <= 0 ? produtosSugeridos.length - 1 : prev - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex > -1 && produtosSugeridos[activeIndex]) {
        selecionarProduto(produtosSugeridos[activeIndex]);
        setActiveIndex(-1); // Reseta o índice
      }
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-600">Carregando retiradas...</p>
        </div>
      </div>
    );
  }
  
  const retiradasHoje = retiradas.filter(r => r.created_at.startsWith(new Date().toISOString().split('T')[0])).length;

  return (
    <div className="space-y-4 lg:space-y-6 p-4 lg:p-0">
      <Toaster />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 text-xl lg:text-2xl font-bold text-slate-800">
          <Truck className="h-5 w-5 lg:h-6 lg:w-6" />
          Retiradas de Estoque
        </h2>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 rounded-lg transition-colors text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            Nova Retirada
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 lg:gap-4 grid-cols-1 sm:grid-cols-2">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Truck className="h-4 w-4 lg:h-5 lg:w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xl lg:text-2xl font-bold text-slate-800">{retiradas.length}</p>
              <p className="text-xs lg:text-sm text-slate-500">Total de Retiradas</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 p-2 rounded-lg">
              <Calendar className="h-4 w-4 lg:h-5 lg:w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xl lg:text-2xl font-bold text-slate-800">{retiradasHoje}</p>
              <p className="text-xs lg:text-sm text-slate-500">Retiradas Hoje</p>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Retiradas */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <h3 className="text-base lg:text-lg font-semibold text-slate-800">Histórico de Retiradas</h3>
        </div>
        <div className="divide-y divide-slate-200">
          {retiradas.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Truck className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p className="text-lg font-medium mb-2">Nenhuma retirada registrada</p>
              <p className="text-sm">Clique em "Nova Retirada" para começar</p>
            </div>
          ) : (
            retiradas.map((retirada) => (
              <div key={retirada.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-slate-800 text-sm lg:text-base">
                      {retirada.setor || `Retirada #${retirada.id}`}
                    </h4>
                    <p className="text-xs lg:text-sm text-slate-500">
                      Responsável: {retirada.responsavel} | {new Date(retirada.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                      {retirada.status}
                    </span>
                    <button 
                      onClick={() => setShowDetalhes(showDetalhes === retirada.id ? null : retirada.id)}
                      className="text-slate-400 hover:text-slate-600 p-1"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="text-xs lg:text-sm text-slate-600">
                  <strong>{retirada.retirada_itens.length}</strong> tipos de itens retirados
                  {retirada.observacoes && (
                    <span className="ml-2 text-slate-500">• {retirada.observacoes}</span>
                  )}
                </div>
                {showDetalhes === retirada.id && (
                  <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                    <h5 className="font-medium text-slate-800 mb-2 text-sm">Itens Retirados:</h5>
                    <div className="space-y-1">
                      {retirada.retirada_itens.map((item) => (
                        <div key={item.id} className="flex justify-between items-center text-xs text-slate-600">
                          <span>{item.produtos?.nome || 'Produto não encontrado'}</span>
                          <span className="font-medium">{item.quantity} {item.produtos?.unidade || 'un'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal de Nova Retirada */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 lg:p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-5xl max-h-[95vh] flex flex-col">
            {/* Header do Modal */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 sticky top-0 bg-white rounded-t-xl z-10">
              <h3 className="text-lg font-semibold text-slate-800">Registrar Nova Retirada</h3>
              <button onClick={limparFormulario} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Corpo do Modal */}
            <div className="p-4 space-y-4 lg:space-y-6 overflow-y-auto">
              {/* Infos da Retirada */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Responsável pela Retirada *</label>
                  <input
                    type="text"
                    value={formData.responsavel}
                    onChange={(e) => setFormData(prev => ({ ...prev, responsavel: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="Nome de quem está retirando"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Setor / Evento *</label>
                  <input
                    type="text"
                    value={formData.setor}
                    onChange={(e) => setFormData(prev => ({ ...prev, setor: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="Ex: Cozinha, Lualvo, Cesta Básica"
                  />
                </div>
              </div>

              {/* Busca de Produtos */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowSuggestions(e.target.value.length > 0);
                    setActiveIndex(-1);
                  }}
                  onFocus={() => setShowSuggestions(searchTerm.length > 0)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  onKeyDown={handleSearchKeyDown} // <-- NAVEGAÇÃO POR TECLADO
                  placeholder="Buscar produtos no estoque..."
                  className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
                {showSuggestions && produtosSugeridos.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {produtosSugeridos.map((produto, index) => (
                      <button
                        key={produto.id}
                        onClick={() => selecionarProduto(produto)}
                        className={`w-full text-left px-3 py-2 border-b border-slate-100 last:border-b-0 ${
                          index === activeIndex ? 'bg-slate-100' : 'hover:bg-slate-50'
                        }`}
                        onMouseEnter={() => setActiveIndex(index)}
                      >
                        <div className="font-medium text-sm">{produto.nome}</div>
                        <div className="text-xs text-slate-500">{produto.categorias?.nome}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Campos do Item */}
              <div className="space-y-4 bg-slate-50 p-4 rounded-lg">
                <h4 className="font-medium text-slate-800 text-sm">
                  {editingItemIndex !== null ? 'Editando Item:' : 'Adicionar Item à Retirada:'}
                </h4>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Produto</label>
                    <input
                      type="text"
                      disabled
                      value={currentItem.produto_nome || "Selecione um produto acima"}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-slate-100 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Em Estoque</label>
                    <input
                      type="text"
                      disabled
                      value={`${currentItem.estoque_disponivel} ${currentItem.unit}`}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-slate-100 text-sm font-bold"
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Quantidade a Retirar *</label>
                    {/* --- CORREÇÃO DO "0" --- */}
                    <input
                      type="text"
                      inputMode="decimal"
                      value={currentItem.quantity}
                      onChange={(e) => {
                        const valor = e.target.value;
                        if (valor === '' || /^[0-9]*\.?[0-9]*$/.test(valor)) {
                          setCurrentItem(prev => ({ ...prev, quantity: valor }));
                        }
                      }}
                      onFocus={(e) => e.target.value === '0' && setCurrentItem(prev => ({ ...prev, quantity: '' }))}
                      onBlur={(e) => e.target.value === '' && setCurrentItem(prev => ({ ...prev, quantity: 0 }))}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="0" min="0" step="0.1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Unidade</label>
                    <input
                      type="text"
                      disabled
                      value={currentItem.unit}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-slate-100 text-sm"
                    />
                  </div>
                </div>
                <button
                  onClick={adicionarItem}
                  disabled={currentItem.produto_id === 0}
                  className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 rounded-lg transition-colors text-sm font-medium disabled:bg-gray-300"
                >
                  {editingItemIndex !== null ? (
                    <><Save className="h-4 w-4" /> Salvar Alterações</>
                  ) : (
                    <><Plus className="h-4 w-4" /> Adicionar Item</>
                  )}
                </button>
              </div>

              {/* Lista de Itens Adicionados */}
              {items.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-slate-800 text-sm lg:text-base">
                    Itens da Retirada ({items.length})
                  </h4>
                  <div className="hidden lg:block border border-slate-200 rounded-lg overflow-hidden">
                    <div className="bg-slate-50 px-4 py-3 grid grid-cols-4 gap-4 text-sm font-medium text-slate-700">
                      <div className="col-span-2">Produto</div>
                      <div>Quantidade</div>
                      <div>Ações</div>
                    </div>
                    {items.map((item, index) => (
                      <div key={index} className="px-4 py-3 grid grid-cols-4 gap-4 border-t border-slate-200 text-sm">
                        <div className="col-span-2">
                          <div className="font-medium text-slate-800">{item.produto_nome}</div>
                        </div>
                        <div>{item.quantity} {item.unit}</div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => editarItem(index)} className="text-blue-500 hover:text-blue-700"><Edit className="h-4 w-4" /></button>
                          <button onClick={() => removerItem(index)} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Campo de Observações */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Observações da Retirada</label>
                <textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                  rows={3}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="Ex: Retirada para o Lualvo, montagem de 10 Cestas Básicas, etc."
                />
              </div>
            </div>

            {/* Rodapé do Modal */}
            <div className="flex flex-col sm:flex-row gap-3 justify-end p-4 border-t border-slate-200 sticky bottom-0 bg-white rounded-b-xl z-10">
              <button
                onClick={limparFormulario}
                className="w-full sm:w-auto px-4 py-2.5 text-slate-600 hover:text-slate-800 transition-colors text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={salvarRetirada}
                disabled={items.length === 0}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg transition-colors text-sm font-medium"
              >
                <Save className="h-4 w-4" />
                Confirmar Retirada
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}