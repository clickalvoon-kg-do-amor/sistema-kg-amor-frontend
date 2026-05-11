import { supabase } from "./supabaseClient";

export interface KgRede {
  id: string;
  cor: string;
  descricao?: string | null;
  ativo: boolean;
  hex: string;
}

export interface KgSupervisao {
  id: string;
  nome: string;
  rede_id: string;
  ativo: boolean;
}

export interface KgCelulaRow {
  id: string;
  nome: string;
  rede_id: string;
  supervisao_id: string;
  lideres: string | null;
  endereco?: string | null;
  telefone?: string | null;
  observacoes?: string | null;
  ativo: boolean;
  quantidade_kg: number | null;
  quantidade_itens: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface KgCelulaDisplay {
  id: string;
  nome: string;
  lider: string;
  lideres: string;
  supervisores: string;
  rede_id: string;
  supervisao_id: string;
  telefone?: string | null;
  endereco?: string | null;
  observacoes?: string | null;
  quantidade_kg: number;
  quantidade_itens: number;
  ativo: boolean;
  criado_em?: string;
  created_at?: string;
  updated_at?: string;
  redes: KgRede | null;
}

const NETWORK_HEX_MAP: Record<string, string> = {
  "ALVO SJP": "#2563eb",
  AMARELA: "#facc15",
  AMARELO: "#facc15",
  AZUL: "#2563eb",
  BRANCA: "#e2e8f0",
  BRANCO: "#e2e8f0",
  MARROM: "#8b5e3c",
  ROXA: "#9333ea",
  ROXO: "#9333ea",
  VERDE: "#16a34a",
  VERMELHA: "#dc2626",
  VERMELHO: "#dc2626",
};

export function resolveNetworkHex(name?: string | null) {
  return NETWORK_HEX_MAP[(name || "").toUpperCase()] || "#64748b";
}

export function normalizeLeaderName(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed || "Sem liderança definida";
}

export function normalizeSupervisionName(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed || "Sem supervisão";
}

type RawRede = {
  id: string;
  cor: string;
  descricao?: string | null;
  ativo: boolean;
};

type RawSupervisao = {
  id: string;
  nome: string;
  rede_id: string;
  ativo: boolean;
};

type RawCelula = {
  id: string;
  nome: string;
  rede_id: string;
  supervisao_id: string;
  lideres: string | null;
  endereco?: string | null;
  telefone?: string | null;
  observacoes?: string | null;
  ativo: boolean;
  quantidade_kg: number | null;
  quantidade_itens: number | null;
  created_at?: string;
  updated_at?: string;
};

export function buildKgStructure(
  redesData: RawRede[],
  supervisoesData: RawSupervisao[],
  celulasData: RawCelula[]
) {
  const redes = redesData.map((rede) => ({
    ...rede,
    hex: resolveNetworkHex(rede.cor),
  }));

  const redeMap = new Map(redes.map((rede) => [rede.id, rede]));
  const supervisaoMap = new Map(supervisoesData.map((supervisao) => [supervisao.id, supervisao]));

  const celulas = celulasData.map((celula) => {
    const supervisao = supervisaoMap.get(celula.supervisao_id);
    const rede =
      redeMap.get(celula.rede_id) ||
      (supervisao ? redeMap.get(supervisao.rede_id) || null : null);
    const lideres = normalizeLeaderName(celula.lideres);

    return {
      id: celula.id,
      nome: celula.nome,
      lider: lideres,
      lideres,
      supervisores: normalizeSupervisionName(supervisao?.nome),
      rede_id: rede?.id || celula.rede_id,
      supervisao_id: celula.supervisao_id,
      telefone: celula.telefone ?? null,
      endereco: celula.endereco ?? null,
      observacoes: celula.observacoes ?? null,
      quantidade_kg: Number(celula.quantidade_kg || 0),
      quantidade_itens: Number(celula.quantidade_itens || 0),
      ativo: celula.ativo,
      criado_em: celula.created_at,
      created_at: celula.created_at,
      updated_at: celula.updated_at,
      redes: rede || null,
    } satisfies KgCelulaDisplay;
  });

  const celulaMap = new Map(celulas.map((celula) => [celula.id, celula]));

  return {
    redes,
    supervisoes: supervisoesData,
    celulas,
    redeMap,
    supervisaoMap,
    celulaMap,
  };
}

export async function fetchKgStructure() {
  const [redesRes, supervisoesRes, celulasRes] = await Promise.all([
    supabase.from("redes").select("id, cor, descricao, ativo").eq("ativo", true).order("cor"),
    supabase.from("kg_supervisoes").select("id, nome, rede_id, ativo").eq("ativo", true).order("nome"),
    supabase
      .from("kg_celulas")
      .select(
        "id, nome, rede_id, supervisao_id, lideres, endereco, telefone, observacoes, ativo, quantidade_kg, quantidade_itens, created_at, updated_at"
      )
      .eq("ativo", true)
      .order("nome"),
  ]);

  if (redesRes.error) throw redesRes.error;
  if (supervisoesRes.error) throw supervisoesRes.error;
  if (celulasRes.error) throw celulasRes.error;

  return buildKgStructure(redesRes.data || [], supervisoesRes.data || [], celulasRes.data || []);
}
