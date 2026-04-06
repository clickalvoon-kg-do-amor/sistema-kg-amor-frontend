import React, { useState, useEffect } from "react";
import { Edit2, Palette, Plus, Save, Tag, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "../lib/supabaseClient";
import { EmptyState, ModalFrame, PageHeader, Surface } from "../components/ui";

interface Categoria {
  id: number;
  nome: string;
  cor: string;
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
    nome: "",
    cor: "#6B7280",
  });

  useEffect(() => {
    carregarCategorias();
  }, []);

  const carregarCategorias = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from("categorias").select("*").order("nome", { ascending: true });
      if (error) throw error;
      setCategorias(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar categorias:", error);
      toast.error("Falha ao carregar categorias: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCategoria(null);
    setFormData({ nome: "", cor: "#6B7280" });
  };

  const handleEdit = (categoria: Categoria) => {
    setFormData({ nome: categoria.nome, cor: categoria.cor || "#6B7280" });
    setEditingCategoria(categoria);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome) {
      toast.error("O nome da categoria e obrigatorio.");
      return;
    }

    try {
      if (editingCategoria) {
        const { error } = await supabase
          .from("categorias")
          .update({ nome: formData.nome, cor: formData.cor })
          .eq("id", editingCategoria.id);
        if (error) throw error;
        toast.success("Categoria atualizada!");
      } else {
        const { error } = await supabase.from("categorias").insert({ nome: formData.nome, cor: formData.cor });
        if (error) throw error;
        toast.success("Categoria criada com sucesso!");
      }

      await carregarCategorias();
      handleCloseModal();
    } catch (error: any) {
      console.error("Erro ao salvar categoria:", error);
      toast.error("Erro ao salvar: " + error.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Tem certeza? Excluir uma categoria pode falhar se houver produtos ligados a ela.")) {
      try {
        const { error } = await supabase.from("categorias").delete().eq("id", id);
        if (error) throw error;
        toast.success("Categoria excluida!");
        await carregarCategorias();
      } catch (error: any) {
        console.error("Erro ao deletar:", error);
        toast.error("Erro ao deletar: " + error.message);
      }
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Catalogo visual"
        title="Gerenciar categorias"
        description="Padronize a organizacao dos produtos com etiquetas de cor e uma interface mais limpa para criacao e manutencao."
        actions={
          <button type="button" onClick={() => setIsModalOpen(true)} className="button-base button-primary">
            <Plus className="h-4 w-4" />
            Nova Categoria
          </button>
        }
      />

      <Surface title="Lista de categorias" subtitle="Categorias disponiveis para classificar produtos no sistema.">
        {loading ? (
          <div className="grid min-h-[220px] place-items-center">
            <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-slate-200 border-t-slate-900" />
          </div>
        ) : categorias.length === 0 ? (
          <EmptyState
            icon={<Tag className="h-7 w-7" />}
            title="Nenhuma categoria cadastrada"
            description="Crie a primeira categoria para organizar melhor o estoque e os recebimentos."
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {categorias.map((cat) => (
              <article key={cat.id} className="rounded-[24px] border border-slate-100 bg-slate-50/85 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-3 flex items-center gap-3">
                      <div
                        className="h-5 w-5 rounded-full border border-slate-300 shadow-sm"
                        style={{ backgroundColor: cat.cor }}
                      />
                      <span className="truncate text-base font-semibold text-slate-900">{cat.nome}</span>
                    </div>
                    <div className="pill">
                      <Palette className="h-3.5 w-3.5" />
                      {cat.cor}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => handleEdit(cat)} className="icon-button text-sky-600 hover:text-sky-700">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => handleDelete(cat.id)} className="icon-button text-rose-600 hover:text-rose-700">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </Surface>

      {isModalOpen ? (
        <ModalFrame
          title={editingCategoria ? "Editar categoria" : "Nova categoria"}
          subtitle="Defina o nome da categoria e a cor que sera usada como referencia visual."
          onClose={handleCloseModal}
          maxWidthClass="max-w-lg"
          footer={
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={handleCloseModal} className="button-base button-secondary">
                Cancelar
              </button>
              <button type="submit" form="categoria-form" className="button-base button-primary">
                <Save className="h-4 w-4" />
                Salvar
              </button>
            </div>
          }
        >
          <form id="categoria-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Nome da categoria *</label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData((prev) => ({ ...prev, nome: e.target.value }))}
                placeholder="Ex: Graos e cereais"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Cor da etiqueta</label>
              <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
                <input
                  type="color"
                  value={formData.cor}
                  onChange={(e) => setFormData((prev) => ({ ...prev, cor: e.target.value }))}
                />
                <input
                  type="text"
                  value={formData.cor}
                  onChange={(e) => setFormData((prev) => ({ ...prev, cor: e.target.value }))}
                  placeholder="#6B7280"
                />
              </div>
            </div>
          </form>
        </ModalFrame>
      ) : null}
    </div>
  );
}
