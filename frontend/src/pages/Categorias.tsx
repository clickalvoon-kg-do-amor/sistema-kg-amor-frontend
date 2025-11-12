// frontend/src/pages/Categorias.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Plus, Edit2, Trash2, Save, X, Tag } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

// Interface
interface Categoria {
  id: number;
  nome: string;
  cor: string; // Hex color
}

interface FormData {
  nome: string;
  cor: string;
}

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null);
  
  const [formData, setFormData] = useState<FormData>({
    nome: '',
    cor: '#6B7280' // Cor padrão (cinza)
  });

  // Carregar dados
  useEffect(() => {
    carregarCategorias();
  }, []);

  const carregarCategorias = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .order('nome', { ascending: true });
      
      if (error) throw error;
      setCategorias(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar categorias:', error);
      toast.error('Falha ao carregar categorias: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Limpar formulário e fechar modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCategoria(null);
    setFormData({ nome: '', cor: '#6B7280' });
  };

  // Abrir modal para edição
  const handleEdit = (categoria: Categoria) => {
    setFormData({
      nome: categoria.nome,
      cor: categoria.cor || '#6B7280'
    });
    setEditingCategoria(categoria);
    setIsModalOpen(true);
  };

  // Salvar (Criar ou Atualizar)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome) {
      toast.error('O nome da categoria é obrigatório.');
      return;
    }

    try {
      if (editingCategoria) {
        // Atualizar
        const { error } = await supabase
          .from('categorias')
          .update({ nome: formData.nome, cor: formData.cor })
          .eq('id', editingCategoria.id);
        
        if (error) throw error;
        toast.success('Categoria atualizada!');
      } else {
        // Criar
        const { error } = await supabase
          .from('categorias')
          .insert({ nome: formData.nome, cor: formData.cor });
        
        if (error) throw error;
        toast.success('Categoria criada com sucesso!');
      }
      
      await carregarCategorias();
      handleCloseModal();

    } catch (error: any) {
      console.error('Erro ao salvar categoria:', error);
      toast.error('Erro ao salvar: ' + error.message);
    }
  };

  // Deletar
  const handleDelete = async (id: number) => {
    if (window.confirm('Tem certeza? Excluir uma categoria pode falhar se houver produtos ligados a ela.')) {
      try {
        const { error } = await supabase
          .from('categorias')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        
        toast.success('Categoria excluída!');
        await carregarCategorias();

      } catch (error: any) {
        console.error('Erro ao deletar:', error);
        toast.error('Erro ao deletar: ' + error.message);
      }
    }
  };

  return (
    <div className="space-y-4 lg:space-y-6 p-4 lg:p-0">
      <Toaster />
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 text-xl lg:text-2xl font-bold text-slate-800">
          <Tag className="h-5 w-5 lg:h-6 lg:w-6" />
          Gerenciar Categorias
        </h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 rounded-lg transition-colors text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          Nova Categoria
        </button>
      </div>

      {/* Lista de Categorias */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="divide-y divide-slate-200">
            {categorias.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <p>Nenhuma categoria cadastrada.</p>
              </div>
            ) : (
              categorias.map((cat) => (
                <div key={cat.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-5 h-5 rounded-full border border-slate-300"
                      style={{ backgroundColor: cat.cor }}
                    ></div>
                    <span className="font-medium text-slate-800">{cat.nome}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleEdit(cat)} className="text-blue-500 hover:text-blue-700 p-1">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(cat.id)} className="text-red-500 hover:text-red-700 p-1">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal de Nova/Editar Categoria */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {editingCategoria ? 'Editar Categoria' : 'Nova Categoria'}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da Categoria *
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Grãos e Cereais"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cor da Etiqueta
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.cor}
                    onChange={(e) => setFormData(prev => ({ ...prev, cor: e.target.value }))}
                    className="w-10 h-10 p-0 border-none rounded"
                  />
                  <input
                    type="text"
                    value={formData.cor}
                    onChange={(e) => setFormData(prev => ({ ...prev, cor: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="#6B7280"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Save size={16} />
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}