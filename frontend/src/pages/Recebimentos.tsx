import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Package, Edit, Trash2, Eye, Save, X, Camera, Scan, 
  AlertTriangle, CheckCircle, ShoppingCart, FileText, BarChart3,
  Calendar, User, Search, ChevronDown, ChevronUp, Download
} from 'lucide-react';

// Mock expandido com categorias
const MOCK_CATEGORIAS = [
  { id: 1, nome: 'GRÃOS E CEREAIS', cor: '#8B4513' },
  { id: 2, nome: 'CARNES E PROTEÍNAS', cor: '#B22222' },
  { id: 3, nome: 'LATICÍNIOS', cor: '#4169E1' },
  { id: 4, nome: 'FRUTAS E VERDURAS', cor: '#32CD32' },
  { id: 5, nome: 'DOCES E BEBIDAS', cor: '#FF6347' },
  { id: 6, nome: 'HIGIENE E LIMPEZA', cor: '#9370DB' },
  { id: 7, nome: 'OUTROS', cor: '#708090' }
];

const MOCK_PRODUTOS = [
  { id: 1, nome: 'Arroz 5kg', categoria_id: 1, categoria: 'GRÃOS E CEREAIS', codigo_barras: '7891234567890' },
  { id: 2, nome: 'Feijão Preto 1kg', categoria_id: 1, categoria: 'GRÃOS E CEREAIS', codigo_barras: '7891234567891' },
  { id: 3, nome: 'Açúcar Cristal 1kg', categoria_id: 5, categoria: 'DOCES E BEBIDAS', codigo_barras: '7891234567892' },
  { id: 4, nome: 'Óleo de Soja 900ml', categoria_id: 7, categoria: 'OUTROS', codigo_barras: '7891234567893' },
  { id: 5, nome: 'Frango Inteiro', categoria_id: 2, categoria: 'CARNES E PROTEÍNAS' },
  { id: 6, nome: 'Leite Integral 1L', categoria_id: 3, categoria: 'LATICÍNIOS' },
  { id: 7, nome: 'Banana Prata', categoria_id: 4, categoria: 'FRUTAS E VERDURAS' },
  { id: 8, nome: 'Sabão em Pó 1kg', categoria_id: 6, categoria: 'HIGIENE E LIMPEZA' }
];

const MOCK_RECEBIMENTOS = [
  {
    id: 1,
    data: '2025-09-08',
    origem: 'Célula Centro',
    itens: [
      { produto: 'Arroz 5kg', quantidade: 10, unidade: 'kg', validade: '2025-12-15', prioridade: 'normal' },
      { produto: 'Feijão Preto 1kg', quantidade: 5, unidade: 'kg', validade: '2025-11-20', prioridade: 'imediato' }
    ],
    status: 'concluído',
    observacoes: 'Recebimento da campanha de setembro'
  },
  {
    id: 2,
    data: '2025-09-07',
    origem: 'Célula Norte',
    itens: [
      { produto: 'Açúcar Cristal 1kg', quantidade: 8, unidade: 'kg', validade: '2026-01-10', prioridade: 'normal' }
    ],
    status: 'concluído',
    observacoes: ''
  }
];

// Interfaces
interface Categoria {
  id: number;
  nome: string;
  cor: string;
}

interface Produto {
  id: number;
  nome: string;
  categoria_id: number;
  unidade?: string;
  categoria?: string;
  codigo_barras?: string;
}

interface ReceiptItem {
  id?: number;
  produto_id: number;
  produto_nome?: string;
  quantity: number;
  unit: string;
  expires_at: string;
  priority: 'normal' | 'imediato';
  barcode?: string;
}

interface Receipt {
  id?: number;
  origin: string;
  notes: string;
  status: 'draft' | 'posted' | 'void';
  created_at: string;
  created_by: string;
  items: ReceiptItem[];
}

export default function RecebimentosPage() {
  const [recebimentos, setRecebimentos] = useState<Receipt[]>([]);
  const [produtos, setProdutos] = useState(MOCK_PRODUTOS);
  const [categorias] = useState(MOCK_CATEGORIAS);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'manual' | 'scanner'>('manual');

  // Estados do formulário
  const [formData, setFormData] = useState({
    origin: '',
    notes: ''
  });

  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [currentItem, setCurrentItem] = useState<ReceiptItem>({
    produto_id: 0,
    quantity: 0,
    unit: 'kg',
    expires_at: '',
    priority: 'normal'
  });

  // Estados para organização por categoria
  const [categoriaExpandida, setCategoriaExpandida] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNovoProdutoForm, setShowNovoProdutoForm] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showDetalhes, setShowDetalhes] = useState<number | null>(null);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

  // Estados do scanner
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedCode, setScannedCode] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

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

  const carregarDados = async () => {
    try {
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setLoading(false);
    }
  };

  // Filtrar produtos por categoria e busca
  const produtosFiltrados = produtos.filter(produto => {
    const matchBusca = produto.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategoria = categoriaExpandida ? produto.categoria_id === categoriaExpandida : true;
    return matchBusca && matchCategoria;
  });

  const produtosPorCategoria = categorias.map(categoria => ({
    ...categoria,
    produtos: produtos.filter(p => p.categoria_id === categoria.id)
      .filter(p => p.nome.toLowerCase().includes(searchTerm.toLowerCase()))
  }));

  // Funções do scanner
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
      setIsScannerOpen(true);
    } catch (error) {
      console.error('Erro ao acessar câmera:', error);
      alert('Não foi possível acessar a câmera');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScannerOpen(false);
  };

  const simulateBarcodeScan = (code: string) => {
    setScannedCode(code);
    handleBarcodeRead(code);
    stopCamera();
  };

  const handleBarcodeRead = (barcode: string) => {
    const produto = produtos.find(p => p.codigo_barras === barcode);
    
    if (produto) {
      const novoItem: ReceiptItem = {
        produto_id: produto.id,
        produto_nome: produto.nome,
        quantity: 1,
        unit: 'kg',
        expires_at: '',
        priority: 'normal',
        barcode: barcode
      };
      
      setItems(prev => [...prev, novoItem]);
      alert(`Produto "${produto.nome}" adicionado automaticamente!`);
    } else {
      setActiveTab('manual');
      setCurrentItem(prev => ({ ...prev, barcode }));
      alert('Código não encontrado. Complete os dados manualmente e associe o código.');
    }
  };

  // Cadastrar novo produto
  const cadastrarNovoProduto = async () => {
    if (!novoProduto.nome || novoProduto.categoria_id === 0) {
      alert('Preencha nome e categoria do produto');
      return;
    }

    const novoId = Math.max(...produtos.map(p => p.id)) + 1;
    const categoria = categorias.find(c => c.id === novoProduto.categoria_id);
    
    const produtoParaAdicionar: Produto = {
      id: novoId,
      nome: novoProduto.nome,
      categoria_id: novoProduto.categoria_id,
      categoria: categoria?.nome,
      codigo_barras: novoProduto.codigo_barras || undefined
    };

    setProdutos(prev => [...prev, produtoParaAdicionar]);
    
    // Adicionar automaticamente ao recebimento se solicitado
    setCurrentItem(prev => ({
      ...prev,
      produto_id: novoId,
      produto_nome: novoProduto.nome
    }));

    // Reset do formulário
    setNovoProduto({
      nome: '',
      categoria_id: 0,
      unidade: 'kg',
      codigo_barras: ''
    });
    setShowNovoProdutoForm(false);
    
    alert('Produto cadastrado com sucesso!');
  };

  // Adicionar item na lista
  const adicionarItem = () => {
    if (currentItem.produto_id === 0 || currentItem.quantity <= 0) {
      alert('Preencha produto e quantidade');
      return;
    }

    const produto = produtos.find(p => p.id === currentItem.produto_id);
    const novoItem: ReceiptItem = {
      ...currentItem,
      produto_nome: produto?.nome
    };

    if (editingItemIndex !== null) {
      // Editando item existente
      setItems(prev => prev.map((item, index) => 
        index === editingItemIndex ? novoItem : item
      ));
      setEditingItemIndex(null);
    } else {
      // Adicionando novo item
      setItems(prev => [...prev, novoItem]);
    }
    
    // Reset do formulário
    setCurrentItem({
      produto_id: 0,
      quantity: 0,
      unit: 'kg',
      expires_at: '',
      priority: 'normal'
    });

    if (currentItem.barcode) {
      salvarAssociacaoCodigoBarras(currentItem.barcode, currentItem.produto_id);
    }
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
        produto_id: 0,
        quantity: 0,
        unit: 'kg',
        expires_at: '',
        priority: 'normal'
      });
    }
  };

  const salvarAssociacaoCodigoBarras = async (barcode: string, produtoId: number) => {
    try {
      console.log(`Associação salva: ${barcode} -> Produto ${produtoId}`);
    } catch (error) {
      console.error('Erro ao salvar associação:', error);
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
    setCurrentItem(prev => ({
      ...prev,
      produto_id: produto.id,
      produto_nome: produto.nome
    }));
    setSearchTerm(produto.nome);
    setShowSuggestions(false);
  };

  // Gerar relatório do dia
  const gerarRelatorio = () => {
    const hoje = new Date().toISOString().split('T')[0];
    const recebimentosHoje = recebimentos.filter(r => 
      r.created_at.split('T')[0] === hoje
    );

    if (recebimentosHoje.length === 0) {
      alert('Nenhum recebimento encontrado para hoje');
      return;
    }

    const totalItens = recebimentosHoje.reduce((total, r) => total + r.items.length, 0);
    const totalRecebimentos = recebimentosHoje.length;

    const relatorio = `RELATÓRIO DE RECEBIMENTOS - ${new Date().toLocaleDateString('pt-BR')}
    
RESUMO:
- Total de Recebimentos: ${totalRecebimentos}
- Total de Itens: ${totalItens}

DETALHES:
${recebimentosHoje.map(r => `
Origem: ${r.origin}
Horário: ${new Date(r.created_at).toLocaleTimeString('pt-BR')}
Itens: ${r.items.length}
${r.items.map(item => `  - ${item.produto_nome}: ${item.quantity} ${item.unit}`).join('\n')}
${r.notes ? `Observações: ${r.notes}` : ''}
---`).join('\n')}

Relatório gerado em: ${new Date().toLocaleString('pt-BR')}`;

    const blob = new Blob([relatorio], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-recebimentos-${hoje}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    alert('Relatório gerado e baixado com sucesso!');
  };

  const salvarRecebimento = async () => {
    if (items.length === 0) {
      alert('Adicione pelo menos um item');
      return;
    }

    try {
      const novoRecebimento: Receipt = {
        id: Date.now(),
        origin: formData.origin || 'Recebimento Padrão',
        notes: formData.notes,
        status: 'posted',
        created_at: new Date().toISOString(),
        created_by: 'Usuário Atual',
        items: items
      };

      // Adicionar ao histórico real
      setRecebimentos(prev => [novoRecebimento, ...prev]);

      console.log('Recebimento salvo:', novoRecebimento);
      
      setFormData({ origin: '', notes: '' });
      setItems([]);
      setIsModalOpen(false);
      setEditingItemIndex(null);
      
      alert('Recebimento salvo com sucesso!');
      
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar recebimento');
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
              <p className="text-xl lg:text-2xl font-bold text-slate-800">
                {recebimentos.reduce((total, r) => total + r.items.length, 0)}
              </p>
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
              <p className="text-xl lg:text-2xl font-bold text-slate-800">
                {recebimentos.filter(r => 
                  r.created_at.split('T')[0] === new Date().toISOString().split('T')[0]
                ).length}
              </p>
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
                    <h4 className="font-medium text-slate-800 text-sm lg:text-base">{recebimento.origin}</h4>
                    <p className="text-xs lg:text-sm text-slate-500">
                      {new Date(recebimento.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                      {recebimento.status === 'posted' ? 'concluído' : recebimento.status}
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
                  <strong>{recebimento.items.length}</strong> itens recebidos
                  {recebimento.notes && (
                    <span className="ml-2 text-slate-500">• {recebimento.notes}</span>
                  )}
                </div>

                {/* Detalhes expandidos */}
                {showDetalhes === recebimento.id && (
                  <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                    <h5 className="font-medium text-slate-800 mb-2 text-sm">Itens do Recebimento:</h5>
                    <div className="space-y-1">
                      {recebimento.items.map((item, index) => (
                        <div key={index} className="flex justify-between items-center text-xs text-slate-600">
                          <span>{item.produto_nome}</span>
                          <span className="font-medium">{item.quantity} {item.unit}</span>
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
          <div className="bg-white rounded-xl w-full max-w-5xl max-h-[95vh] overflow-y-auto">
            {/* Header do Modal */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 sticky top-0 bg-white rounded-t-xl">
              <h3 className="text-lg font-semibold text-slate-800">Novo Recebimento</h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingItemIndex(null);
                  setSearchTerm('');
                  setCurrentItem({
                    produto_id: 0,
                    quantity: 0,
                    unit: 'kg',
                    expires_at: '',
                    priority: 'normal'
                  });
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-4 lg:space-y-6">
              {/* Abas Manual/Scanner */}
              <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => setActiveTab('manual')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 lg:px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'manual'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span className="hidden sm:inline">Manual</span>
                </button>
                <button
                  onClick={() => setActiveTab('scanner')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 lg:px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'scanner'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-800'
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

                      {/* Sugestões de produtos */}
                      {showSuggestions && produtosSugeridos.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {produtosSugeridos.map(produto => (
                            <button
                              key={produto.id}
                              onClick={() => selecionarProduto(produto)}
                              className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                            >
                              <div className="font-medium text-sm">{produto.nome}</div>
                              <div className="text-xs text-slate-500">{produto.categoria}</div>
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

                  {/* Seleção por Categorias */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-slate-800 text-sm">
                      {editingItemIndex !== null ? 'Editando Item:' : 'Selecionar Produto:'}
                    </h4>
                    
                    {/* Mobile: Lista compacta */}
                    <div className="block lg:hidden space-y-2">
                      {searchTerm ? (
                        // Busca ativa - mostrar resultados diretos
                        <div className="space-y-1">
                          {produtosFiltrados.map(produto => (
                            <button
                              key={produto.id}
                              onClick={() => setCurrentItem(prev => ({ 
                                ...prev, 
                                produto_id: produto.id,
                                produto_nome: produto.nome 
                              }))}
                              className={`w-full text-left p-3 rounded-lg border transition-colors text-sm ${
                                currentItem.produto_id === produto.id
                                  ? 'border-blue-500 bg-blue-50 text-blue-800'
                                  : 'border-slate-200 hover:border-slate-300 bg-white'
                              }`}
                            >
                              <div className="font-medium">{produto.nome}</div>
                              <div className="text-xs text-slate-500">{produto.categoria}</div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        // Navegação por categorias
                        produtosPorCategoria.map(categoria => (
                          <div key={categoria.id} className="border border-slate-200 rounded-lg">
                            <button
                              onClick={() => setCategoriaExpandida(
                                categoriaExpandida === categoria.id ? null : categoria.id
                              )}
                              className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-50 rounded-lg transition-colors"
                              style={{ borderLeft: `4px solid ${categoria.cor}` }}
                            >
                              <div>
                                <div className="font-medium text-sm">{categoria.nome}</div>
                                <div className="text-xs text-slate-500">
                                  {categoria.produtos.length} produtos
                                </div>
                              </div>
                              {categoriaExpandida === categoria.id ? 
                                <ChevronUp className="h-4 w-4 text-slate-400" /> : 
                                <ChevronDown className="h-4 w-4 text-slate-400" />
                              }
                            </button>
                            
                            {categoriaExpandida === categoria.id && (
                              <div className="border-t border-slate-200 p-2 space-y-1">
                                {categoria.produtos.map(produto => (
                                  <button
                                    key={produto.id}
                                    onClick={() => setCurrentItem(prev => ({ 
                                      ...prev, 
                                      produto_id: produto.id,
                                      produto_nome: produto.nome 
                                    }))}
                                    className={`w-full text-left p-2 rounded text-sm transition-colors ${
                                      currentItem.produto_id === produto.id
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'hover:bg-slate-100'
                                    }`}
                                  >
                                    {produto.nome}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    {/* Desktop: Select tradicional */}
                    <div className="hidden lg:block">
                      <select
                        value={currentItem.produto_id}
                        onChange={(e) => {
                          const produtoId = Number(e.target.value);
                          const produto = produtos.find(p => p.id === produtoId);
                          setCurrentItem(prev => ({ 
                            ...prev, 
                            produto_id: produtoId,
                            produto_nome: produto?.nome 
                          }));
                        }}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value={0}>Selecione um produto</option>
                        {categorias.map(categoria => (
                          <optgroup key={categoria.id} label={categoria.nome}>
                            {produtos
                              .filter(p => p.categoria_id === categoria.id)
                              .filter(p => p.nome.toLowerCase().includes(searchTerm.toLowerCase()))
                              .map(produto => (
                                <option key={produto.id} value={produto.id}>
                                  {produto.nome}
                                </option>
                              ))
                            }
                          </optgroup>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Campos do Item */}
                  {currentItem.produto_id > 0 && (
                    <div className="space-y-4 bg-slate-50 p-4 rounded-lg">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Quantidade *
                          </label>
                          <input
                            type="number"
                            value={currentItem.quantity}
                            onChange={(e) => setCurrentItem(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            placeholder="0"
                            min="0"
                            step="0.1"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Unidade
                          </label>
                          <select
                            value={currentItem.unit}
                            onChange={(e) => setCurrentItem(prev => ({ ...prev, unit: e.target.value }))}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          >
                            <option value="kg">kg</option>
                            <option value="litros">litros</option>
                            <option value="unidades">unidades</option>
                            <option value="pacotes">pacotes</option>
                            <option value="caixas">caixas</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Validade
                          </label>
                          <input
                            type="date"
                            value={currentItem.expires_at}
                            onChange={(e) => setCurrentItem(prev => ({ ...prev, expires_at: e.target.value }))}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Prioridade
                          </label>
                          <select
                            value={currentItem.priority}
                            onChange={(e) => setCurrentItem(prev => ({ ...prev, priority: e.target.value as 'normal' | 'imediato' }))}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          >
                            <option value="normal">Normal</option>
                            <option value="imediato">Imediato</option>
                          </select>
                        </div>
                      </div>

                      <button
                        onClick={adicionarItem}
                        className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 rounded-lg transition-colors text-sm font-medium"
                      >
                        {editingItemIndex !== null ? (
                          <>
                            <Save className="h-4 w-4" />
                            Salvar Alterações
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4" />
                            Adicionar Item
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'scanner' && (
                <div className="space-y-4">
                  {!isScannerOpen ? (
                    <div className="text-center py-6 lg:py-8">
                      <Camera className="h-12 w-12 lg:h-16 lg:w-16 text-slate-400 mx-auto mb-4" />
                      <h3 className="text-base lg:text-lg font-medium text-slate-800 mb-2">Scanner de Código de Barras</h3>
                      <p className="text-sm lg:text-base text-slate-600 mb-6">
                        Aponte a câmera para o código de barras do produto
                      </p>
                      <button
                        onClick={startCamera}
                        className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg transition-colors text-sm font-medium"
                      >
                        Iniciar Scanner
                      </button>
                      
                      {/* Botões de simulação para desenvolvimento */}
                      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-sm text-amber-800 mb-3">Simulação (desenvolvimento):</p>
                        <div className="flex gap-2 justify-center flex-wrap">
                          <button
                            onClick={() => simulateBarcodeScan('7891234567890')}
                            className="text-xs bg-amber-100 hover:bg-amber-200 text-amber-800 px-3 py-1 rounded"
                          >
                            Arroz 5kg
                          </button>
                          <button
                            onClick={() => simulateBarcodeScan('7891234567891')}
                            className="text-xs bg-amber-100 hover:bg-amber-200 text-amber-800 px-3 py-1 rounded"
                          >
                            Feijão 1kg
                          </button>
                          <button
                            onClick={() => simulateBarcodeScan('9999999999999')}
                            className="text-xs bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded"
                          >
                            Código Inexistente
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full h-48 lg:h-64 bg-black rounded-lg"
                      />
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={stopCamera}
                          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                        >
                          Parar Scanner
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Lista de Itens Adicionados */}
              {items.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-slate-800 text-sm lg:text-base">
                    Itens do Recebimento ({items.length})
                  </h4>
                  
                  {/* Mobile: Cards */}
                  <div className="block lg:hidden space-y-2">
                    {items.map((item, index) => (
                      <div key={index} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="font-medium text-slate-800 text-sm">{item.produto_nome}</div>
                            {item.barcode && (
                              <div className="text-xs text-slate-500">Código: {item.barcode}</div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            <button
                              onClick={() => editarItem(index)}
                              className="text-blue-500 hover:text-blue-700 p-1"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => removerItem(index)}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                          <div>Quantidade: <span className="font-medium">{item.quantity} {item.unit}</span></div>
                          <div>
                            Prioridade: 
                            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-medium ${
                              item.priority === 'imediato' 
                                ? 'bg-red-100 text-red-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {item.priority}
                            </span>
                          </div>
                          {item.expires_at && (
                            <div className="col-span-2">Validade: <span className="font-medium">{item.expires_at}</span></div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop: Tabela */}
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
                          {item.barcode && (
                            <div className="text-xs text-slate-500">Código: {item.barcode}</div>
                          )}
                          {item.expires_at && (
                            <div className="text-xs text-slate-500">Validade: {item.expires_at}</div>
                          )}
                        </div>
                        <div>{item.quantity} {item.unit}</div>
                        <div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            item.priority === 'imediato' 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {item.priority}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => editarItem(index)}
                            className="text-blue-500 hover:text-blue-700"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => removerItem(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Campo de Observações */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Observações
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="Observações sobre o recebimento..."
                />
              </div>

              {/* Botões de Ação */}
              <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4 border-t border-slate-200 sticky bottom-0 bg-white">
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingItemIndex(null);
                    setCurrentItem({
                      produto_id: 0,
                      quantity: 0,
                      unit: 'kg',
                      expires_at: '',
                      priority: 'normal'
                    });
                  }}
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
        </div>
      )}
    </div>
  );
}