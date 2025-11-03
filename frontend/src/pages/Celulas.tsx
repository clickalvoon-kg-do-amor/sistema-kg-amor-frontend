// frontend/src/pages/Celulas.tsx
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Save, X, Users, UserCheck, Palette, Weight, Trash2, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

// --- COMPONENTE DE TOAST ---
function Toast({ message, onClose, isError = false }: { message: string, onClose: () => void, isError?: boolean }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000); // 4 segundos
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = isError ? 'bg-red-600' : 'bg-green-600';
  return (
    <div className={`fixed top-5 right-5 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-[100]`}>
      {message}
    </div>
  );
}
// --- FIM DO TOAST ---

interface Rede {
  id: number;
  cor: string;
  hex: string;
  descricao?: string;
  ativo: boolean;
}
interface Celula {
  id: number;
  nome: string;
  lider: string;
  supervisores: string;
  rede_id: number;
  telefone?: string;
  endereco?: string;
  quantidade_kg: number;
  ativo: boolean;
  criado_em?: string;
  redes?: Rede;
}
interface FormData {
  nome: string;
  lider: string;
  supervisores: string;
  rede_id: string;
  telefone: string;
  endereco: string;
  quantidade_kg: number;
}

export default function CelulasPage() {
  const [celulas, setCelulas] = useState<Celula[]>([]);
  const [redes, setRedes] = useState<Rede[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRecebimentoModalOpen, setIsRecebimentoModalOpen] = useState(false);
  const [editingCelula, setEditingCelula] = useState<Celula | null>(null);
  const [selectedCelulaRecebimento, setSelectedCelulaRecebimento] = useState<Celula | null>(null);
  const [recebimentoKG, setRecebimentoKG] = useState<string>('0');
  
  // Campo de data continua aqui, pois é salvo no histórico
  const [dataChegada, setDataChegada] = useState(new Date().toISOString().split('T')[0]);
  
  const [toastMessage, setToastMessage] = useState('');
  const [isToastError, setIsToastError] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    nome: '',
    lider: '',
    supervisores: '',
    rede_id: '',
    telefone: '',
    endereco: '',
    quantidade_kg: 0
  });

  // Função para mostrar toast
  const showToast = (message: string, isError: boolean = false) => {
    setToastMessage(message);
    setIsToastError(isError);
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const { data: redesData, error: redesError } = await supabase
        .from('redes').select('*').eq('ativo', true).order('cor');
      if (redesError) throw redesError;
      setRedes(redesData || []);
      
      const { data: celulasData, error: celulasError } = await supabase
        .from('celulas')
        .select(`*, redes (id, cor, hex)`)
        .eq('ativo', true)
        .order('nome');
      if (celulasError) throw celulasError;
      setCelulas(celulasData || []);
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      showToast('Erro ao carregar dados: ' + error.message, true);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantidade_kg' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dadosParaSalvar = {
        nome: formData.nome,
        lider: formData.lider,
        supervisores: formData.supervisores,
        rede_id: parseInt(formData.rede_id),
        telefone: formData.telefone || null,
        endereco: formData.endereco || null,
        quantidade_kg: formData.quantidade_kg,
        ativo: true
      };

      if (editingCelula) {
        const { error } = await supabase
          .from('celulas').update(dadosParaSalvar).eq('id', editingCelula.id);
        if (error) throw error;
        showToast('Célula atualizada com sucesso!');
      } else {
        const { error } = await supabase
          .from('celulas').insert([dadosParaSalvar]);
        if (error) throw error;
        showToast('Célula criada com sucesso!');
      }
      await carregarDados();
      handleCloseModal();
    } catch (error: any) {
      console.error('Erro ao salvar célula:', error);
      showToast('Erro ao salvar célula: ' + error.message, true);
    }
  };

  const handleEdit = (celula: Celula) => {
    setFormData({
      nome: celula.nome,
      lider: celula.lider,
      supervisores: celula.supervisores,
      rede_id: celula.rede_id.toString(),
      telefone: celula.telefone || '',
      endereco: celula.endereco || '',
      quantidade_kg: celula.quantidade_kg
    });
    setEditingCelula(celula);
    setIsModalOpen(true);
  };

  const handleDelete = async (celulaId: number) => {
    if (window.confirm('Tem certeza que deseja excluir esta célula?')) {
      try {
        // Você pode querer adicionar lógica para deletar o histórico_kg também
        const { error } = await supabase
          .from('celulas').update({ ativo: false }).eq('id', celulaId);
        if (error) throw error;
        await carregarDados();
        showToast('Célula excluída com sucesso!');
      } catch (error: any) {
        console.error('Erro ao excluir célula:', error);
        showToast('Erro ao excluir célula: ' + error.message, true);
      }
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCelula(null);
    setFormData({
      nome: '', lider: '', supervisores: '', rede_id: '',
      telefone: '', endereco: '', quantidade_kg: 0
    });
  };

  // --- FUNÇÃO DE RECEBIMENTO CORRIGIDA ---
  // Agora salva o histórico na nova tabela 'historico_kg'
  const handleRecebimentoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCelulaRecebimento) return showToast('Selecione uma célula!', true);
    
    const kgRecebido = Number(recebimentoKG || 0);
    if (kgRecebido <= 0) return showToast('A quantidade deve ser maior que zero.', true);

    try {
      const novaQuantidade = Number(selectedCelulaRecebimento.quantidade_kg) + kgRecebido;
      
      // 1. Inserir o histórico na sua nova tabela
      const { error: historicoError } = await supabase
        .from('historico_kg') // <--- SALVANDO NA TABELA CERTA
        .insert([{
          celula_id: selectedCelulaRecebimento.id,
          quantidade: kgRecebido,
          data_chegada: new Date(dataChegada).toISOString()
        }]);

      if (historicoError) {
        // Se falhar aqui, não continuamos
        throw historicoError;
      }
      
      // 2. Se o histórico funcionou, ATUALIZAR o saldo total da célula
      const { error: celulaError } = await supabase
        .from('celulas')
        .update({ quantidade_kg: novaQuantidade })
        .eq('id', selectedCelulaRecebimento.id);
      
      if (celulaError) {
        // Isso é ruim (histórico foi salvo mas saldo não), mas vamos avisar
        throw new Error("Histórico salvo, mas falha ao atualizar saldo da célula: " + celulaError.message);
      }

      await carregarDados();
      showToast(`Recebimento de ${kgRecebido} kg registrado!`);
      handleCloseRecebimentoModal();
      
    } catch (error: any) {
      console.error('Erro ao registrar recebimento:', error);
      showToast('Erro ao salvar: ' + error.message, true);
    }
  };

  const handleCloseRecebimentoModal = () => {
    setIsRecebimentoModalOpen(false);
    setSelectedCelulaRecebimento(null);
    setRecebimentoKG('0');
    setDataChegada(new Date().toISOString().split('T')[0]);
  };

  const handleRequestEdit = (celula: Celula) => {
    if (celula) {
      handleCloseRecebimentoModal(); 
      handleEdit(celula); 
    }
  };

  const getRedeInfo = (celula: Celula) => {
    if (celula.redes) return celula.redes;
    const rede = redes.find(r => r.id === celula.rede_id);
    return rede || { cor: 'Indefinida', hex: '#6B7280' };
  };

  const totalKG = celulas.reduce((total, celula) => total + Number(celula.quantidade_kg || 0), 0);

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando células...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {toastMessage && (
        <Toast 
          message={toastMessage} 
          onClose={() => setToastMessage('')} 
          isError={isToastError} 
        />
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="text-blue-600" />
            Células
          </h1>
          <p className="text-gray-600 mt-1">Gestão completa das células e seus recebimentos</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setDataChegada(new Date().toISOString().split('T')[0]);
              setIsRecebimentoModalOpen(true);
            }}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus size={20} />
            Adicionar Recebimento
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus size={20} />
            Nova Célula
          </button>
        </div>
      </div>

      {/* Cards de Estatísticas (Lê o Saldo Total da tabela 'celulas') */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total de Células</p>
              <p className="text-2xl font-bold text-gray-900">{celulas.length}</p>
            </div>
            <Users className="text-blue-500" size={24} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total de KG</p>
              <p className="text-2xl font-bold text-gray-900">{totalKG.toFixed(1)} kg</p>
            </div>
            <Weight className="text-green-500" size={24} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Média por Célula</p>
              <p className="text-2xl font-bold text-gray-900">
                {celulas.length > 0 ? (totalKG / celulas.length).toFixed(1) : '0.0'} kg
              </p>
            </div>
            <Users className="text-purple-500" size={24} />
          </div>
        </div>
      </div>

      {/* Lista de Células (Lê o Saldo Total da tabela 'celulas') */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {celulas.map((celula) => {
          const redeInfo = getRedeInfo(celula);
          return (
            <div key={celula.id} className="bg-white rounded-lg shadow-md p-6 border-t-4" style={{ borderTopColor: redeInfo.hex || '#6B7280' }}>
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold text-gray-900">{celula.nome}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(celula)}
                    className="text-gray-400 hover:text-blue-600 transition-colors"
                    title="Editar Célula"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(celula.id)}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                    title="Excluir Célula"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <UserCheck className="text-gray-500" size={16} />
                  <div>
                    <span className="font-medium text-gray-700">Líderes:</span>
                    <p className="text-gray-600">{celula.lider}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="text-gray-500" size={16} />
                  <div>
                    <span className="font-medium text-gray-700">Supervisores:</span>
                    <p className="text-gray-600">{celula.supervisores}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Palette className="text-gray-500" size={16} />
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-700">Rede:</span>
                    <div className="flex items-center gap-1">
                      <div 
                        className="w-4 h-4 rounded-full border border-gray-300" 
                        style={{ backgroundColor: redeInfo.hex || '#6B7280' }}
                      ></div>
                      <span className="text-gray-600">{redeInfo.cor}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Weight className="text-gray-500" size={16} />
                  <div>
                    <span className="font-medium text-gray-700">Quantidade:</span>
                    <span className="text-lg font-bold text-orange-600 ml-1">{celula.quantidade_kg} kg</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {celulas.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Users className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma célula cadastrada</h3>
            <p className="text-gray-500 mb-4">Comece criando sua primeira célula</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              Criar Primeira Célula
            </button>
          </div>
        )}
      </div>

      {/* Modal de Cadastro/Edição (Sem alterações) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {editingCelula ? 'Editar Célula' : 'Nova Célula'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Célula *</label>
                <input
                  type="text" name="nome" value={formData.nome} onChange={handleInputChange} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Célula Central"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome dos Líderes *</label>
                <input
                  type="text" name="lider" value={formData.lider} onChange={handleInputChange} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: João e Maria Silva"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome dos Supervisores *</label>
                <input
                  type="text" name="supervisores" value={formData.supervisores} onChange={handleInputChange} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Pastor Pedro Santos"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cor da Rede *</label>
                <select
                  name="rede_id" value={formData.rede_id} onChange={handleInputChange} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione a rede</option>
                  {redes.map((rede) => (
                    <option key={rede.id} value={rede.id}>{rede.cor}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                <input
                  type="tel" name="telefone" value={formData.telefone} onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="(41) 99999-9999"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
                <textarea
                  name="endereco" value={formData.endereco} onChange={handleInputChange} rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Rua, número, bairro"
                />
              </div>
              <div>
                {/* LINHA 492 - CORRIGIDA */}
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade de KG *</label>
                <input
                  type="number" name="quantidade_kg" value={formData.quantidade_kg} onChange={handleInputChange}
                  min="0" step="0.1" required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.0"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button" onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Save size={16} />
                  {editingCelula ? 'Atualizar' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Recebimento (Agora salva na tabela 'historico_kg') */}
      {isRecebimentoModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Adicionar Recebimento</h2>
              <button
                onClick={handleCloseRecebimentoModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleRecebimentoSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Selecionar Célula *</label>
                <select
                  value={selectedCelulaRecebimento?.id || ''}
                  onChange={(e) => {
                    const celula = celulas.find(c => c.id === parseInt(e.target.value));
                    setSelectedCelulaRecebimento(celula || null);
                  }}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Selecione uma célula</option>
                  {celulas.map((celula) => (
                    <option key={celula.id} value={celula.id}>{celula.nome}</option>
                  ))}
                </select>
              </div>
              {selectedCelulaRecebimento && (
                <div className="bg-gray-50 p-4 rounded-lg space-y-2 relative">
                  <button
                    type="button"
                    onClick={() => handleRequestEdit(selectedCelulaRecebimento)}
                    className="absolute top-3 right-3 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Editar esta Célula"
                  >
                    <Edit2 size={18} />
                  </button>
                  <h3 className="font-medium text-gray-900">Informações da Célula:</h3>
                  <div className="text-sm">
                    <span className="font-medium text-gray-700">Líderes:</span>
                    <span className="ml-1 text-gray-600">{selectedCelulaRecebimento.lider}</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium text-gray-700">Supervisores:</span>
                    <span className="ml-1 text-gray-600">{selectedCelulaRecebimento.supervisores}</span>
                  </div>
                  <div className="text-sm flex items-center gap-2">
                    <span className="font-medium text-gray-700">Rede:</span>
                    <div className="flex items-center gap-1">
                      <div 
                        className="w-3 h-3 rounded-full border border-gray-300" 
                        style={{ backgroundColor: getRedeInfo(selectedCelulaRecebimento).hex }}
                      ></div>
                      <span className="text-gray-600">{getRedeInfo(selectedCelulaRecebimento).cor}</span>
                    </div>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium text-gray-700">KG Atual:</span>
                    <span className="ml-1 text-orange-600 font-bold">{selectedCelulaRecebimento.quantidade_kg} kg</span>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade de KG a Receber *</label>
                <input
                  type="text" inputMode="decimal"
                  value={recebimentoKG}
                  onChange={(e) => {
                    const valor = e.target.value;
                    if (valor === '' || /^[0-9]*\.?[0-9]*$/.test(valor)) {
                      setRecebimentoKG(valor);
                    }
                  }}
                  min="0" step="0.1" required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="0.0"
                  onFocus={(e) => e.target.value === '0' && setRecebimentoKG('')}
                  onBlur={(e) => e.target.value === '' && setRecebimentoKG('0')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data do Recebimento *</label>
                <input
                  type="date"
                  value={dataChegada}
                  onChange={(e) => setDataChegada(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              {selectedCelulaRecebimento && (
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-sm">
                    <span className="font-medium text-green-800">Novo Total (na Célula):</span>
                    <span className="ml-1 text-green-700 font-bold">
                      {(Number(selectedCelulaRecebimento.quantidade_kg) + Number(recebimentoKG || 0)).toFixed(1)} kg
                    </span>
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <button
                  type="button" onClick={handleCloseRecebimentoModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Save size={16} />
                  Registrar Recebimento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}