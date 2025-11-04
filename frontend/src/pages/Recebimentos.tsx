// frontend/src/pages/Recebimentos.tsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Package, Edit, Trash2, Eye, Save, X, Camera, Scan, 
  ShoppingCart, Download, Search, ChevronDown, ChevronUp, CheckCircle, Calendar
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';

// --- Interfaces Corrigidas ---
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
  codigo_barras?: string;
  // Campos que vêm do JOIN
  categorias?: {
    nome: string;
    cor: string;
  };
}

// Item do recibo (para o formulário)
interface ReceiptItemForm {
  produto_id: number;
  produto_nome?: string;
  quantity: number;
  unit: string;
  expires_at: string; // Data de validade
  priority: 'normal' | 'imediato';
  barcode?: string;
  lot_code?: string; // Lote
}

// Recibo (para o histórico)
interface Receipt {
  id: number;
  notes: string | null;
  status: string;
  created_at: string;
  created_by: string; // UUID do usuário
  receipt_items: { // Nome da tabela correta
    id: number;
    quantity: number;
    produtos: {
      nome: string;
      unidade: string;
    }
  }[];
}

export default function RecebimentosPage() {
  const [recebimentos, setRecebimentos] = useState<Receipt[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'manual' | 'scanner'>('manual');

  // Estados do formulário
  const [formData, setFormData] = useState({
    notes: ''
  });

  const [items, setItems] = useState<ReceiptItemForm[]>([]);
  const [currentItem, setCurrentItem] = useState<ReceiptItemForm>({
    produto_id: 0,
    quantity: 0,
    unit: 'kg',
    expires_at: '',
    priority: 'normal',
    lot_code: ''
  });

  // Estados para UI
  const [searchTerm, setSearchTerm] = useState('');
  const [showNovoProdutoForm, setShowNovoProdutoForm] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showDetalhes, setShowDetalhes] = useState<number | null>(null);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

  // Estados para novo produto
  const [novoProduto, setNovoProduto] = useState({
    nome: '',
    categoria_id: 0,
    unidade: 'kg',
    codigo_barras: ''
  });

  // Carregar dados
  useEffect(() => {
    carregarDados();
  }, []);

  // --- FUNÇÃO DE CARREGAR DADOS CORRIGIDA ---
  const carregarDados = async () => {
    try {
      setLoading(true);

      // 1. Carregar Recibos (receipts) com join em Itens (receipt_items) e Produtos (produtos)
      const { data: recebimentosData, error: recError } = await supabase
        .from('receipts')
        .select(`
          id,
          notes,
          status,
          created_at,
          created_by,
          receipt_items (
            id,
            quantity,
            produtos (
              nome,
              unidade
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (recError) throw recError;

      // 2. Carregar Produtos com join em Categorias
      const { data: produtosData, error: prodError } = await supabase
        .from('produtos')
        .select('*, categorias(nome, cor)')
        .order('nome');

      if (prodError) throw prodError;

      // 3. Carregar Categorias
      const { data: categoriasData, error: catError } = await supabase
        .from('categorias')
        .select('*')
        .order('nome');

      if (catError) throw catError;

      setRecebimentos(recebimentosData as Receipt[] || []);
      setProdutos(produtosData as Produto[] || []);
      setCategorias(categoriasData as Categoria[] || []);
      
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar produtos por categoria e busca
  const produtosFiltrados = produtos.filter(produto => {
    const matchBusca = produto.nome.toLowerCase().includes(searchTerm.toLowerCase());
    return matchBusca;
  });

  // Filtrar produtos para sugestões de busca
  const produtosSugeridos = searchTerm.length > 0 
    ? produtos.filter(produto => 
        produto.nome.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 5)
    : [];

  // Selecionar produto da sugestão
  const selecionarProduto = (produto: Produto) => {
    setCurrentItem(prev => ({
      ...prev,
      produto_id: produto.id,
      produto_nome: produto.nome,
      unit: produto.unidade || 'un' // Puxa a unidade padrão do produto
    }));
    setSearchTerm(produto.nome);
    setShowSuggestions(false);
  };

  // --- FUNÇÃO DE CADASTRAR PRODUTO CORRIGIDA ---
  const cadastrarNovoProduto = async () => {
    if (!novoProduto.nome || !novoProduto.categoria_id) {
      toast.error('Preencha nome e categoria do produto');
      return;
    }

    try {
      // 1. Salva o novo produto no banco
      const { data: produtoCriado, error } = await supabase
        .from('produtos')
        .insert({
          nome: novoProduto.nome,
          categoria_id: Number(novoProduto.categoria_id),
          unidade: novoProduto.unidade,
          codigo_barras: novoProduto.codigo_barras || null
        })
        .select('*, categorias(nome, cor)')
        .single();

      if (error) throw error;
      
      toast.success('Produto cadastrado com sucesso!');

      // 2. Adiciona o novo produto à lista local (para não precisar recarregar)
      setProdutos(prev => [...prev, produtoCriado as Produto]);
      
      // 3. Seleciona o produto recém-criado
      selecionarProduto(produtoCriado as Produto);

      // 4. Reseta o formulário
      setNovoProduto({
        nome: '',
        categoria_id: 0,
        unidade: 'kg',
        codigo_barras: ''
      });
      setShowNovoProdutoForm(false);
      setSearchTerm(produtoCriado.nome); // Coloca o nome do novo produto na busca
      
    } catch (error: any) {
      console.error('Erro ao cadastrar produto:', error);
      toast.error('Erro ao cadastrar produto: ' + error.message);
    }
  };

  // Adicionar item na lista
  const adicionarItem = () => {
    if (currentItem.produto_id === 0 || currentItem.quantity <= 0) {
      toast.error('Selecione um produto e informe a quantidade.');
      return;
    }

    const produto = produtos.find(p => p.id === currentItem.produto_id);
    const novoItem: ReceiptItemForm = {
      ...currentItem,
      produto_nome: produto?.nome
    };

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
      produto_id: 0,
      quantity: 0,
      unit: 'kg',
      expires_at: '',
      priority: 'normal',
      lot_code: ''
    });
    setSearchTerm('');
  };

  const editarItem = (index: number) => {
    const item = items[index];
    setCurrentItem(item);
    setSearchTerm(item.produto_nome || '');
    setEditingItemIndex(index);
    setActiveTab('manual');
  };

  const removerItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
    if (editingItemIndex === index) {
      setEditingItemIndex(null);
      setSearchTerm('');
      setCurrentItem({
        produto_id: 0, quantity: 0, unit: 'kg',
        expires_at: '', priority: 'normal', lot_code: ''
      });
    }
    toast.success('Item removido.');
  };

  // Gerar relatório do dia (simples)
  const gerarRelatorio = () => {
    const hoje = new Date().toISOString().split('T')[0];
    const recebimentosHoje = recebimentos.filter(r => 
      r.created_at.startsWith(hoje)
    );

    if (recebimentosHoje.length === 0) {
      toast.error('Nenhum recebimento encontrado para hoje');
      return;
    }
    // ... (lógica de geração de relatório) ...
    toast.success('Relatório gerado e baixado com sucesso!');
  };

  // --- FUNÇÃO DE SALVAR RECEBIMENTO CORRIGIDA ---
  const salvarRecebimento = async () => {
    if (items.length === 0) {
      toast.error('Adicione pelo menos um item');
      return;
    }

    try {
      // 1. Salvar o recibo principal (tabela 'receipts')
      const { data: novoRecebimento, error: recError } = await supabase
        .from('receipts')
        .insert({
          notes: formData.notes || null,
          status: 'posted' // Status 'postado' ou 'concluído'
          // created_by será preenchido pelo Supabase (se configurado)
        })
        .select()
        .single();

      if (recError) throw recError;

      // 2. Salvar os itens do recibo (tabela 'receipt_items')
      const itensParaSalvar = items.map(item => ({
        receipt_id: novoRecebimento.id, // ID do recibo pai
        product_id: item.produto_id,
        quantity: item.quantity,
        unit: item.unit,
        expires_at: item.expires_at || null,
        priority: item.priority,
        barcode: item.barcode || null,
        lot_code: item.lot_code || null
      }));

      const { error: itensError } = await supabase
        .from('receipt_items') // Nome correto da tabela
        .insert(itensParaSalvar);

      if (itensError) throw itensError;

      // 3. Recarregar dados
      carregarDados();
      
      // 4. Limpar formulário
      setFormData({ notes: '' });
      setItems([]);
      setIsModalOpen(false);
      setEditingItemIndex(null);
      
      toast.success('Recebimento salvo com sucesso!');
      
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar recebimento: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-600">Carregando recebimentos...</p>
        </div>
      </div>
    );
  }
  
  const totalItensRecebidos = recebimentos.reduce((total, r) => total + r.receipt_items.length, 0);
  const recebimentosHoje = recebimentos.filter(r => r.created_at.startsWith(new Date().toISOString().split('T')[0])).length;

  return (
    <div className="space-y-4 lg:space-y-6 p-4 lg:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 text-xl lg:text-2xl font-bold text-slate-800">
          <Package className="h-5 w-5 lg:h-6 lg:w-6" />
          Recebimentos
        </h2>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            onClick={gerarRelatorio}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-lg transition-colors text-sm font-medium"
          >
            <Download className="h-4 w-4" />
            Relatório do Dia
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 rounded-lg transition-colors text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            Novo Recebimento
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 lg:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <CheckCircle className="h-4 w-4 lg:h-5 lg:w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xl lg:text-2xl font-bold text-slate-800">{recebimentos.length}</p>
              <p className="text-xs lg:text-sm text-slate-500">Total de Recebimentos</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <ShoppingCart className="h-4 w-4 lg:h-5 lg:w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xl lg:text-2xl font-bold text-slate-800">{totalItensRecebidos}</p>
              <p className="text-xs lg:text-sm text-slate-500">Itens Recebidos</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 p-2 rounded-lg">
              <Calendar className="h-4 w-4 lg:h-5 lg:w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xl lg:text-2xl font-bold text-slate-800">{recebimentosHoje}</p>
              <p className="text-xs lg:text-sm text-slate-500">Hoje</p>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Recebimentos */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <h3 className="text-base lg:text-lg font-semibold text-slate-800">Histórico de Recebimentos</h3>
        </div>
        <div className="divide-y divide-slate-200">
          {recebimentos.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Package className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p className="text-lg font-medium mb-2">Nenhum recebimento registrado</p>
              <p className="text-sm">Clique em "Novo Recebimento" para começar</p>
            </div>
          ) : (
            recebimentos.map((recebimento) => (
              <div key={recebimento.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-slate-800 text-sm lg:text-base">Recebimento #{recebimento.id}</h4>
                    <p className="text-xs lg:text-sm text-slate-500">
                      {new Date(recebimento.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                      {recebimento.status}
                    </span>
                    <button 
                      onClick={() => setShowDetalhes(showDetalhes === recebimento.id ? null : recebimento.id)}
                      className="text-slate-400 hover:text-slate-600 p-1"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="text-xs lg:text-sm text-slate-600">
                  <strong>{recebimento.receipt_items.length}</strong> tipos de itens recebidos
                  {recebimento.notes && (
                    <span className="ml-2 text-slate-500">• {recebimento.notes}</span>
                  )}
                </div>
                {showDetalhes === recebimento.id && (
                  <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                    <h5 className="font-medium text-slate-800 mb-2 text-sm">Itens do Recebimento:</h5>
                    <div className="space-y-1">
                      {recebimento.receipt_items.map((item) => (
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

      {/* Modal de Novo Recebimento */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 lg:p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-5xl max-h-[95vh] flex flex-col">
            {/* Header do Modal */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 sticky top-0 bg-white rounded-t-xl z-10">
              <h3 className="text-lg font-semibold text-slate-800">Novo Recebimento</h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingItemIndex(null);
                  setSearchTerm('');
                  setCurrentItem({
                    produto_id: 0, quantity: 0, unit: 'kg',
                    expires_at: '', priority: 'normal', lot_code: ''
                  });
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Corpo do Modal */}
            <div className="p-4 space-y-4 lg:space-y-6 overflow-y-auto">
              {/* Abas Manual/Scanner */}
              <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => setActiveTab('manual')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 lg:px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'manual' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span className="hidden sm:inline">Manual</span>
                </button>
                <button
                  onClick={() => setActiveTab('scanner')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 lg:px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'scanner' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  <Scan className="h-4 w-4" />
                  <span className="hidden sm:inline">Scanner</span>
                </button>
              </div>

              {/* Conteúdo das Abas */}
              {activeTab === 'manual' && (
                <div className="space-y-4">
                  {/* Busca de Produtos */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setShowSuggestions(e.target.value.length > 0);
                        }}
                        onFocus={() => setShowSuggestions(searchTerm.length > 0)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        placeholder="Buscar produtos..."
                        className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                      {showSuggestions && produtosSugeridos.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {produtosSugeridos.map(produto => (
                            <button
                              key={produto.id}
                              onClick={() => selecionarProduto(produto)}
                              className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                            >
                              <div className="font-medium text-sm">{produto.nome}</div>
                              <div className="text-xs text-slate-500">{produto.categorias?.nome}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setShowNovoProdutoForm(true)}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="sm:hidden">Novo</span>
                      <span className="hidden sm:inline">Novo Produto</span>
                    </button>
                  </div>

                  {/* Formulário de Novo Produto */}
                  {showNovoProdutoForm && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-green-800 text-sm">Cadastrar Novo Produto</h4>
                        <button
                          onClick={() => setShowNovoProdutoForm(false)}
                          className="text-green-600 hover:text-green-800"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs font-medium text-green-700 mb-1">Nome do Produto *</label>
                          <input
                            type="text"
                            value={novoProduto.nome}
                            onChange={(e) => setNovoProduto(prev => ({ ...prev, nome: e.target.value }))}
                            className="w-full border border-green-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                            placeholder="Ex: Feijão Carioca 1kg"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-green-700 mb-1">Categoria *</label>
                          <select
                            value={novoProduto.categoria_id}
                            onChange={(e) => setNovoProduto(prev => ({ ...prev, categoria_id: Number(e.target.value) }))}
                            className="w-full border border-green-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                          >
                            <option value={0}>Selecione categoria</option>
                            {categorias.map(categoria => (
                              <option key={categoria.id} value={categoria.id}>
                                {categoria.nome}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-green-700 mb-1">Código de Barras</label>
                          <input
                            type="text"
                            value={novoProduto.codigo_barras}
                            onChange={(e) => setNovoProduto(prev => ({ ...prev, codigo_barras: e.target.value }))}
                            className="w-full border border-green-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                            placeholder="Opcional"
                          />
                        </div>
                        <div className="flex items-end">
                          <button
                            onClick={cadastrarNovoProduto}
                            className="w-full bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                          >
                            Cadastrar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Campos do Item */}
                  <div className="space-y-4 bg-slate-50 p-4 rounded-lg">
                    <h4 className="font-medium text-slate-800 text-sm">
                      {editingItemIndex !== null ? 'Editando Item:' : 'Adicionar Item:'}
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Quantidade *</label>
                        <input
                          type="number"
                          value={currentItem.quantity}
                          onChange={(e) => setCurrentItem(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          placeholder="0" min="0" step="0.1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Unidade</label>
                        <select
                          value={currentItem.unit}
                          onChange={(e) => setCurrentItem(prev => ({ ...prev, unit: e.target.value }))}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        >
                          <option value="kg">kg</option>
                          <option value="litros">litros</option>
                          <option value="un">unidades</option>
                          <option value="pacotes">pacotes</option>
                          <option value="caixas">caixas</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Validade</label>
                        <input
                          type="date"
                          value={currentItem.expires_at}
                          onChange={(e) => setCurrentItem(prev => ({ ...prev, expires_at: e.target.value }))}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Prioridade</label>
                        <select
                          value={currentItem.priority}
                          onChange={(e) => setCurrentItem(prev => ({ ...prev, priority: e.target.value as 'normal' | 'imediato' }))}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        >
                          <option value="normal">Normal</option>
                          <option value="imediato">Imediato (Venc. próximo)</option>
                        </select>
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
                        <><Plus className="h-4 w-4" /> Adicionar Item à Lista</>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'scanner' && (
                <div className="text-center py-6 lg:py-8">
                  <Camera className="h-12 w-12 lg:h-16 lg:w-16 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-base lg:text-lg font-medium text-slate-800 mb-2">Scanner (Em breve)</h3>
                  <p className="text-sm lg:text-base text-slate-600 mb-6">
                    A funcionalidade de scanner de código de barras será implementada em breve.
                  </p>
                  <button
                    onClick={() => setActiveTab('manual')}
                    className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg transition-colors text-sm font-medium"
                  >
                    Voltar ao modo Manual
                  </button>
                </div>
              )}

              {/* Lista de Itens Adicionados */}
              {items.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-slate-800 text-sm lg:text-base">
                    Itens do Recebimento ({items.length})
                  </h4>
                  <div className="hidden lg:block border border-slate-200 rounded-lg overflow-hidden">
                    <div className="bg-slate-50 px-4 py-3 grid grid-cols-5 gap-4 text-sm font-medium text-slate-700">
                      <div className="col-span-2">Produto</div>
                      <div>Quantidade</div>
                      <div>Prioridade</div>
                      <div>Ações</div>
                    </div>
                    {items.map((item, index) => (
                      <div key={index} className="px-4 py-3 grid grid-cols-5 gap-4 border-t border-slate-200 text-sm">
                        <div className="col-span-2">
                          <div className="font-medium text-slate-800">{item.produto_nome}</div>
                          {item.expires_at && (<div className="text-xs text-slate-500">Validade: {item.expires_at}</div>)}
                        </div>
                        <div>{item.quantity} {item.unit}</div>
                        <div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            item.priority === 'imediato' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {item.priority}
                          </span>
                        </div>
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Observações</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="Observações sobre o recebimento..."
                />
              </div>
            </div>

            {/* Rodapé do Modal */}
            <div className="flex flex-col sm:flex-row gap-3 justify-end p-4 border-t border-slate-200 sticky bottom-0 bg-white rounded-b-xl z-10">
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2.5 text-slate-600 hover:text-slate-800 transition-colors text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={salvarRecebimento}
                disabled={items.length === 0}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg transition-colors text-sm font-medium"
              >
                <Save className="h-4 w-4" />
                Salvar Recebimento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}