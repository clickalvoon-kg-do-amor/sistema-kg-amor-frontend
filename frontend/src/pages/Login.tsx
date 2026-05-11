import { FormEvent, useState } from "react";
import { ArrowRight, LockKeyhole, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("admin@alvo.com");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setErr(error.message);
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[320px] bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.18),transparent_56%)]" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl" />
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-6xl items-stretch gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="app-hero flex flex-col justify-between">
          <div>
            <div className="app-kicker">Congregacao O Alvo Curitiba</div>
            <h1 className="app-title max-w-xl">
              Operacao organizada para recebimentos, estoque e distribuicao.
            </h1>
            <p className="app-subtitle">
              Uma interface mais clara para acompanhar entradas, retiradas e o desempenho das
              celulas em diferentes contextos de uso.
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="app-surface p-4">
              <div className="stat-icon bg-sky-100 text-sky-700">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-sm font-semibold text-slate-900">Acesso seguro</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Credenciais protegidas e sessao validada antes do acesso ao painel.
              </p>
            </div>
            <div className="app-surface p-4">
              <div className="stat-icon bg-emerald-100 text-emerald-700">
                <Sparkles className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-sm font-semibold text-slate-900">Fluxo mais limpo</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Navegacao focada nas rotinas do dia a dia, sem perda de contexto.
              </p>
            </div>
            <div className="app-surface p-4">
              <div className="stat-icon bg-amber-100 text-amber-700">
                <ArrowRight className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-sm font-semibold text-slate-900">Resposta rapida</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Carregamento leve e inicio direto para o trabalho operacional.
              </p>
            </div>
          </div>
        </section>

        <section className="app-surface flex items-center p-5 sm:p-8">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8">
              <div className="pill mb-4 w-fit">
                <LockKeyhole className="h-3.5 w-3.5" />
                Acesso administrativo
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Entrar no sistema
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Use seu email e senha para acessar os modulos operacionais.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Senha</label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    className="pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {err && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {err}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="button-base button-primary w-full"
              >
                <ArrowRight className="h-4 w-4" />
                {loading ? "Entrando..." : "Entrar"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
