import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Edit2,
  EyeOff,
  Filter,
  Palette,
  Plus,
  Save,
  Search,
  Trash2,
  UserCheck,
  Users,
  Weight,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import {
  fetchKgStructure,
  type KgCelulaDisplay,
  type KgRede,
  type KgSupervisao,
} from "../lib/kgStructure";
import { formatLocalDate, toUtcISOStringFromLocalDate } from "../utils/date";
import { PageHeader, StatCard } from "../components/ui";

function Toast({
  message,
  onClose,
  isError = false,
}: {
  message: string;
  onClose: () => void;
  isError?: boolean;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed right-5 top-5 z-[100] rounded-lg px-6 py-3 text-white shadow-lg ${
        isError ? "bg-red-600" : "bg-green-600"
      }`}
    >
      {message}
    </div>
  );
}

type FormData = {
  nome: string;
  lideres: string;
  supervisao_id: string;
  telefone: string;
  endereco: string;
  quantidade_kg: number;
  quantidade_itens: number;
};

const EMPTY_FORM: FormData = {
  nome: "",
  lideres: "",
  supervisao_id: "",
  telefone: "",
  endereco: "",
  quantidade_kg: 0,
  quantidade_itens: 0,
};

export default function CelulasPage() {
  const [celulas, setCelulas] = useState<KgCelulaDisplay[]>([]);
  const [redes, setRedes] = useState<KgRede[]>([]);
  const [supervisoes, setSupervisoes] = useState<KgSupervisao[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterRede, setFilterRede] = useState("Todas");
  const [filterSupervisor, setFilterSupervisor] = useState("Todos");
  const [ocultarZeradas, setOcultarZeradas] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRecebimentoModalOpen, setIsRecebimentoModalOpen] = useState(false);
  const [editingCelula, setEditingCelula] = useState<KgCelulaDisplay | null>(null);
  const [selectedCelulaRecebimento, setSelectedCelulaRecebimento] = useState<KgCelulaDisplay | null>(null);

  const [recebimentoKG, setRecebimentoKG] = useState("0");
  const [recebimentoItens, setRecebimentoItens] = useState("1");
  const [dataChegada, setDataChegada] = useState(formatLocalDate());
  const [observacao, setObservacao] = useState("");

  const [toastMessage, setToastMessage] = useState("");
  const [isToastError, setIsToastError] = useState(false);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);

  const showToast = (message: string, isError = false) => {
    setToastMessage(message);
    setIsToastError(isError);
  };

  const supervisaoMap = useMemo(
    () => new Map(supervisoes.map((supervisao) => [supervisao.id, supervisao])),
    [supervisoes]
  );

  const supervisoesOrdenadas = useMemo(() => {
    return [...supervisoes].sort((a, b) => {
      const redeA = redes.find((rede) => rede.id === a.rede_id)?.cor || "";
      const redeB = redes.find((rede) => rede.id === b.rede_id)?.cor || "";
      return `${redeA} ${a.nome}`.localeCompare(`${redeB} ${b.nome}`, "pt-BR");
    });
  }, [redes, supervisoes]);

  useEffect(() => {
    void carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const estrutura = await fetchKgStructure();
      setRedes(estrutura.redes);
      setSupervisoes(estrutura.supervisoes);
      setCelulas(estrutura.celulas);
    } catch (error: any) {
      console.error("Erro ao carregar dados:", error);
      showToast("Erro ao carregar dados: " + error.message, true);
    } finally {
      setLoading(false);
    }
  };

  const uniqueSupervisors = useMemo(() => {
    const supervisors = new Set<string>();
    celulas.forEach((celula) => supervisors.add(celula.supervisores.toUpperCase()));
    return ["Todos", ...Array.from(supervisors).sort()];
  }, [celulas]);

  const uniqueRedes = useMemo(() => {
    const redesSet = new Set<string>();
    redes.forEach((rede) => redesSet.add(rede.cor.toUpperCase()));
    celulas.forEach((celula) => {
      if (celula.redes?.cor) redesSet.add(celula.redes.cor.toUpperCase());
    });
    return ["Todas", ...Array.from(redesSet).sort()];
  }, [celulas, redes]);

  const celulasVisiveis = useMemo(() => {
    return celulas.filter((celula) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        celula.nome.toLowerCase().includes(searchLower) ||
        celula.lideres.toLowerCase().includes(searchLower);

      const matchesRede =
        filterRede === "Todas" || celula.redes?.cor?.toUpperCase() === filterRede;

      const matchesSupervisor =
        filterSupervisor === "Todos" ||
        celula.supervisores.toUpperCase() === filterSupervisor;

      const matchesZeradas =
        !ocultarZeradas ||
        celula.quantidade_kg > 0 ||
        celula.quantidade_itens > 0;

      return matchesSearch && matchesRede && matchesSupervisor && matchesZeradas;
    });
  }, [celulas, filterRede, filterSupervisor, ocultarZeradas, searchTerm]);

  const totalKG = useMemo(
    () => celulas.reduce((total, celula) => total + Number(celula.quantidade_kg || 0), 0),
    [celulas]
  );

  const totalItens = useMemo(
    () => celulas.reduce((total, celula) => total + Number(celula.quantidade_itens || 0), 0),
    [celulas]
  );

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "quantidade_kg"
          ? parseFloat(value) || 0
          : name === "quantidade_itens"
            ? parseInt(value, 10) || 0
            : value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.supervisao_id) {
      showToast("Selecione uma supervisão.", true);
      return;
    }

    try {
      const dadosParaSalvar = {
        nome: formData.nome,
        lideres: formData.lideres,
        supervisao_id: formData.supervisao_id,
        telefone: formData.telefone || null,
        endereco: formData.endereco || null,
        quantidade_kg: formData.quantidade_kg,
        quantidade_itens: formData.quantidade_itens,
        ativo: true,
      };

      if (editingCelula) {
        const kgMudou =
          Number(editingCelula.quantidade_kg).toFixed(2) !==
          Number(formData.quantidade_kg).toFixed(2);
        const itensMudou =
          Number(editingCelula.quantidade_itens) !== Number(formData.quantidade_itens);

        if (kgMudou || itensMudou) {
          const { error: deleteError } = await supabase
            .from("historico_kg")
            .delete()
            .eq("celula_id", editingCelula.id);
          if (deleteError) throw new Error("Falha ao limpar histórico: " + deleteError.message);

          const { error: insertError } = await supabase.from("historico_kg").insert([
            {
              celula_id: editingCelula.id,
              quantidade: formData.quantidade_kg,
              quantidade_itens: formData.quantidade_itens,
              data_chegada: new Date().toISOString(),
              observacoes: `Ajuste manual de saldo: ${formData.quantidade_kg} kg e ${formData.quantidade_itens} itens.`,
            },
          ]);
          if (insertError) {
            throw new Error("Falha ao inserir novo histórico: " + insertError.message);
          }

          const { error: updateError } = await supabase
            .from("kg_celulas")
            .update(dadosParaSalvar)
            .eq("id", editingCelula.id);
          if (updateError) throw updateError;

          showToast("Saldo ajustado e histórico atualizado!");
        } else {
          const { error } = await supabase
            .from("kg_celulas")
            .update({
              nome: formData.nome,
              lideres: formData.lideres,
              supervisao_id: formData.supervisao_id,
              telefone: formData.telefone || null,
              endereco: formData.endereco || null,
            })
            .eq("id", editingCelula.id);

          if (error) throw error;
          showToast("Dados cadastrais atualizados!");
        }
      } else {
        const { error } = await supabase.from("kg_celulas").insert([dadosParaSalvar]);
        if (error) throw error;
        showToast("Célula criada com sucesso!");
      }

      await carregarDados();
      handleCloseModal();
    } catch (error: any) {
      console.error("Erro ao salvar célula:", error);
      showToast("Erro ao salvar célula: " + error.message, true);
    }
  };

  const handleEdit = (celula: KgCelulaDisplay) => {
    setFormData({
      nome: celula.nome,
      lideres: celula.lideres,
      supervisao_id: celula.supervisao_id,
      telefone: celula.telefone || "",
      endereco: celula.endereco || "",
      quantidade_kg: celula.quantidade_kg,
      quantidade_itens: celula.quantidade_itens,
    });
    setEditingCelula(celula);
    setIsModalOpen(true);
  };

  const handleDelete = async (celulaId: string) => {
    if (!window.confirm("Tem certeza que deseja excluir esta célula?")) return;

    try {
      await supabase.from("historico_kg").delete().eq("celula_id", celulaId);
      const { error } = await supabase.from("kg_celulas").update({ ativo: false }).eq("id", celulaId);
      if (error) throw error;

      await carregarDados();
      showToast("Célula excluída com sucesso!");
    } catch (error: any) {
      console.error("Erro ao excluir célula:", error);
      showToast("Erro ao excluir célula: " + error.message, true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCelula(null);
    setFormData(EMPTY_FORM);
  };

  const handleRecebimentoSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedCelulaRecebimento) {
      showToast("Selecione uma célula!", true);
      return;
    }

    const kgRecebido = Number(recebimentoKG || 0);
    const itensRecebidos = Number(recebimentoItens || 0);

    if (kgRecebido <= 0 && itensRecebidos <= 0) {
      showToast("Informe valores positivos.", true);
      return;
    }

    try {
      const novaQuantidadeKG =
        Number(selectedCelulaRecebimento.quantidade_kg) + kgRecebido;
      const novaQuantidadeItens =
        Number(selectedCelulaRecebimento.quantidade_itens) + itensRecebidos;

      const { error: historicoError } = await supabase.from("historico_kg").insert([
        {
          celula_id: selectedCelulaRecebimento.id,
          quantidade: kgRecebido,
          quantidade_itens: itensRecebidos,
          data_chegada:
            toUtcISOStringFromLocalDate(dataChegada) || new Date().toISOString(),
          observacoes: observacao || null,
        },
      ]);
      if (historicoError) throw historicoError;

      const { error: celulaError } = await supabase
        .from("kg_celulas")
        .update({
          quantidade_kg: novaQuantidadeKG,
          quantidade_itens: novaQuantidadeItens,
        })
        .eq("id", selectedCelulaRecebimento.id);
      if (celulaError) {
        throw new Error("Erro ao atualizar saldo: " + celulaError.message);
      }

      await carregarDados();
      showToast("Recebimento registrado com sucesso!");
      handleCloseRecebimentoModal();
    } catch (error: any) {
      console.error("Erro ao registrar recebimento:", error);
      showToast("Erro ao salvar: " + error.message, true);
    }
  };

  const handleCloseRecebimentoModal = () => {
    setIsRecebimentoModalOpen(false);
    setSelectedCelulaRecebimento(null);
    setRecebimentoKG("0");
    setRecebimentoItens("1");
    setDataChegada(formatLocalDate());
    setObservacao("");
  };

  const handleRequestEdit = (celula: KgCelulaDisplay) => {
    handleCloseRecebimentoModal();
    handleEdit(celula);
  };

  const getRedeInfo = (celula: KgCelulaDisplay) =>
    celula.redes || { id: "", cor: "Indefinida", hex: "#6B7280", ativo: true };

  const getSupervisaoLabel = (supervisao: KgSupervisao) => {
    const rede = redes.find((item) => item.id === supervisao.rede_id);
    return rede ? `${supervisao.nome} • ${rede.cor}` : supervisao.nome;
  };

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="app-surface flex min-w-[280px] flex-col items-center gap-4 px-8 py-10 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-slate-200 border-t-slate-900" />
          <div>
            <div className="text-base font-semibold text-slate-900">Carregando células</div>
            <div className="mt-1 text-sm text-slate-500">Lendo a estrutura compartilhada do 360.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toastMessage && (
        <Toast
          message={toastMessage}
          onClose={() => setToastMessage("")}
          isError={isToastError}
        />
      )}

      <PageHeader
        eyebrow="Gestao de celulas"
        title="Celulas e recebimentos"
        description="Centralize o acompanhamento das celulas, filtros de busca e registros de recebimento em uma leitura mais objetiva em qualquer tela."
        actions={
          <>
            <button
              type="button"
              onClick={() => {
                setDataChegada(formatLocalDate());
                setIsRecebimentoModalOpen(true);
              }}
              className="button-base button-success"
            >
              <Plus size={18} />
              Adicionar Recebimento
            </button>
            <button type="button" onClick={() => setIsModalOpen(true)} className="button-base button-primary">
              <Plus size={18} />
              Nova Celula
            </button>
          </>
        }
      />

      <div className="toolbar-surface flex flex-wrap items-center gap-3">
        <div className="mr-2 flex items-center gap-2 font-medium text-slate-500">
          <Filter size={20} />
          Filtros:
        </div>

        <div className="relative max-w-md flex-grow">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 transform text-slate-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Buscar Célula ou Líder..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          className="min-w-[150px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          value={filterRede}
          onChange={(event) => setFilterRede(event.target.value)}
        >
          {uniqueRedes.map((rede) => (
            <option key={rede} value={rede}>
              {rede === "Todas" ? "Todas as Redes" : rede}
            </option>
          ))}
        </select>

        <select
          className="min-w-[150px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          value={filterSupervisor}
          onChange={(event) => setFilterSupervisor(event.target.value)}
        >
          {uniqueSupervisors.map((supervisor) => (
            <option key={supervisor} value={supervisor}>
              {supervisor === "Todos" ? "Todas as Supervisões" : supervisor}
            </option>
          ))}
        </select>
      </div>

      <div className="stats-grid">
        <StatCard label="Total de celulas" value={celulasVisiveis.length} icon={<Users className="h-5 w-5" />} tone="blue" />
        <StatCard label="Total de KG" value={`${totalKG.toFixed(1)} kg`} icon={<Weight className="h-5 w-5" />} tone="green" />
        <StatCard label="Total de itens" value={totalItens} icon={<Box className="h-5 w-5" />} tone="violet" />
        <StatCard
          label="Media por celula"
          value={`${celulas.length > 0 ? (totalKG / celulas.length).toFixed(1) : "0.0"} kg`}
          icon={<Weight className="h-5 w-5" />}
          tone="amber"
        />
      </div>

      <div className="mb-4 flex justify-end">
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-gray-600 shadow-sm hover:bg-slate-50">
          <input
            type="checkbox"
            checked={ocultarZeradas}
            onChange={(event) => setOcultarZeradas(event.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          Ocultar Células Zeradas
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {celulasVisiveis.map((celula) => {
          const redeInfo = getRedeInfo(celula);
          return (
            <div
              key={celula.id}
              className="rounded-lg border-t-4 bg-white p-6 shadow-md transition-shadow hover:shadow-lg"
              style={{ borderTopColor: redeInfo.hex || "#6B7280" }}
            >
              <div className="mb-4 flex items-start justify-between">
                <h3 className="truncate pr-2 text-xl font-semibold text-gray-900">{celula.nome}</h3>
                <div className="flex flex-shrink-0 gap-1">
                  <button
                    onClick={() => handleEdit(celula)}
                    className="rounded p-1 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(celula.id)}
                    className="rounded p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
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
                    <p className="text-gray-600">{celula.lideres}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="text-gray-500" size={16} />
                  <div>
                    <span className="font-medium text-gray-700">Supervisão:</span>
                    <p className="text-gray-600">{celula.supervisores}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Palette className="text-gray-500" size={16} />
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-700">Rede:</span>
                    <div className="flex items-center gap-1">
                      <div
                        className="h-3 w-3 rounded-full border border-gray-300"
                        style={{ backgroundColor: redeInfo.hex || "#6B7280" }}
                      />
                      <span className="text-gray-600">{redeInfo.cor}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-4 border-t border-slate-100 pt-2">
                  <div className="flex items-center gap-2">
                    <Weight className="text-orange-500" size={18} />
                    <div>
                      <span className="block text-xs text-gray-500">Total KG</span>
                      <span className="text-base font-bold text-gray-800">{celula.quantidade_kg} kg</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Box className="text-purple-500" size={18} />
                    <div>
                      <span className="block text-xs text-gray-500">Total Itens</span>
                      <span className="text-base font-bold text-gray-800">{celula.quantidade_itens}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {celulasVisiveis.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center">
            <EyeOff className="mx-auto mb-4 text-gray-400" size={48} />
            <h3 className="mb-2 text-lg font-medium text-gray-900">Nenhuma célula encontrada</h3>
            <p className="text-gray-500">Tente ajustar os filtros ou a busca.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingCelula ? "Editar Célula" : "Nova Célula"}
              </h2>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Nome da Célula *</label>
                <input
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={handleInputChange}
                  required
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Célula Central"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Nome dos Líderes *</label>
                <input
                  type="text"
                  name="lideres"
                  value={formData.lideres}
                  onChange={handleInputChange}
                  required
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Supervisão *</label>
                <select
                  name="supervisao_id"
                  value={formData.supervisao_id}
                  onChange={handleInputChange}
                  required
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione a supervisão</option>
                  {supervisoesOrdenadas.map((supervisao) => (
                    <option key={supervisao.id} value={supervisao.id}>
                      {getSupervisaoLabel(supervisao)}
                    </option>
                  ))}
                </select>
                {formData.supervisao_id && (
                  <p className="mt-1 text-xs text-slate-500">
                    Rede vinculada:{" "}
                    {redes.find(
                      (rede) =>
                        rede.id === supervisaoMap.get(formData.supervisao_id)?.rede_id
                    )?.cor || "N/D"}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Telefone</label>
                <input
                  type="tel"
                  name="telefone"
                  value={formData.telefone}
                  onChange={handleInputChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="(41) 99999-9999"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Endereço</label>
                <textarea
                  name="endereco"
                  value={formData.endereco}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Rua, número, bairro"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Quantidade de KG *</label>
                  <input
                    type="number"
                    name="quantidade_kg"
                    value={formData.quantidade_kg}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    required
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Quantidade de Itens *</label>
                  <input
                    type="number"
                    name="quantidade_itens"
                    value={formData.quantidade_itens}
                    onChange={handleInputChange}
                    min="0"
                    required
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex flex-1 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
                >
                  <Save size={16} />
                  {editingCelula ? "Atualizar" : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isRecebimentoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
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
                <label className="mb-1 block text-sm font-medium text-gray-700">Selecionar Célula *</label>
                <select
                  value={selectedCelulaRecebimento?.id || ""}
                  onChange={(event) => {
                    const celula = celulas.find((item) => item.id === event.target.value);
                    setSelectedCelulaRecebimento(celula || null);
                  }}
                  required
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Selecione uma célula</option>
                  {celulas.map((celula) => (
                    <option key={celula.id} value={celula.id}>
                      {celula.nome}
                    </option>
                  ))}
                </select>
              </div>

              {selectedCelulaRecebimento && (
                <div className="relative space-y-2 rounded-lg bg-gray-50 p-4">
                  <button
                    type="button"
                    onClick={() => handleRequestEdit(selectedCelulaRecebimento)}
                    className="absolute right-3 top-3 text-gray-400 transition-colors hover:text-blue-600"
                    title="Editar esta Célula"
                  >
                    <Edit2 size={18} />
                  </button>
                  <h3 className="font-medium text-gray-900">Informações da Célula:</h3>
                  <div className="text-sm">
                    <span className="font-medium text-gray-700">Líderes:</span>
                    <span className="ml-1 text-gray-600">{selectedCelulaRecebimento.lideres}</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium text-gray-700">Supervisão:</span>
                    <span className="ml-1 text-gray-600">{selectedCelulaRecebimento.supervisores}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-gray-700">Rede:</span>
                    <div className="flex items-center gap-1">
                      <div
                        className="h-3 w-3 rounded-full border border-gray-300"
                        style={{ backgroundColor: getRedeInfo(selectedCelulaRecebimento).hex }}
                      />
                      <span className="text-gray-600">{getRedeInfo(selectedCelulaRecebimento).cor}</span>
                    </div>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium text-gray-700">KG Atual:</span>
                    <span className="ml-1 font-bold text-orange-600">
                      {selectedCelulaRecebimento.quantidade_kg} kg
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Quantidade de KG a Receber *</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={recebimentoKG}
                  onChange={(event) => {
                    const valor = event.target.value;
                    if (valor === "" || /^[0-9]*\.?[0-9]*$/.test(valor)) {
                      setRecebimentoKG(valor);
                    }
                  }}
                  min="0"
                  step="0.1"
                  required
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="0.0"
                  onFocus={(event) => event.target.value === "0" && setRecebimentoKG("")}
                  onBlur={(event) => event.target.value === "" && setRecebimentoKG("0")}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Quantidade de ITENS a Receber *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={recebimentoItens}
                  onChange={(event) => {
                    const valor = event.target.value;
                    if (valor === "" || /^[0-9]*\.?[0-9]*$/.test(valor)) {
                      setRecebimentoItens(valor);
                    }
                  }}
                  min="0"
                  required
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="1"
                  onFocus={(event) => event.target.value === "1" && setRecebimentoItens("")}
                  onBlur={(event) => event.target.value === "" && setRecebimentoItens("0")}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Data do Recebimento *</label>
                <input
                  type="date"
                  value={dataChegada}
                  onChange={(event) => setDataChegada(event.target.value)}
                  required
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Observações</label>
                <textarea
                  value={observacao}
                  onChange={(event) => setObservacao(event.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Ex: Produtos vencidos, pacote rasgado, etc."
                />
              </div>

              {selectedCelulaRecebimento && (
                <div className="space-y-1 rounded-lg bg-green-50 p-3">
                  <div className="text-sm">
                    <span className="font-medium text-green-800">Novo Total (KG na Célula):</span>
                    <span className="ml-1 font-bold text-green-700">
                      {(Number(selectedCelulaRecebimento.quantidade_kg) + Number(recebimentoKG || 0)).toFixed(1)} kg
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium text-green-800">Novo Total (Itens na Célula):</span>
                    <span className="ml-1 font-bold text-green-700">
                      {Number(selectedCelulaRecebimento.quantidade_itens) + Number(recebimentoItens || 0)}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseRecebimentoModal}
                  className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex flex-1 items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700"
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
