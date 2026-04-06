import { Suspense, lazy, useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { supabase } from "./lib/supabaseClient";

import Layout from "./components/Layout";

const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Celulas = lazy(() => import("./pages/Celulas"));
const Recebimentos = lazy(() => import("./pages/Recebimentos"));
const PainelGerenciador = lazy(() => import("./pages/PainelGerenciador"));
const Estoque = lazy(() => import("./pages/Estoque"));
const Retiradas = lazy(() => import("./pages/Retiradas"));
const Categorias = lazy(() => import("./pages/Categorias"));

function ScreenLoader({ label }: { label: string }) {
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="app-surface flex min-w-[280px] flex-col items-center gap-4 px-8 py-10 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-slate-200 border-t-slate-900" />
        <div>
          <div className="text-base font-semibold text-slate-900">{label}</div>
          <div className="mt-1 text-sm text-slate-500">Preparando a interface do sistema.</div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState<null | { user: any }>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session ? { user: data.session.user } : null);
      setLoading(false);
    };
    run();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      setSession(sess ? { user: sess.user } : null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (loading) {
    return <ScreenLoader label="Carregando sessão" />;
  }

  return (
    <Router>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            borderRadius: "18px",
            border: "1px solid rgba(226,232,240,0.9)",
            background: "rgba(255,255,255,0.96)",
            color: "#0f172a",
            boxShadow: "0 24px 48px -24px rgba(15,23,42,0.35)",
          },
        }}
      />
      <Suspense fallback={<ScreenLoader label="Carregando tela" />}>
        <Routes>
          <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login />} />
          <Route
            path="/"
            element={
              session ? (
                <Layout user={session.user} onLogout={() => supabase.auth.signOut()} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="celulas" element={<Celulas />} />
            <Route path="recebimentos" element={<Recebimentos />} />
            <Route path="estoque" element={<Estoque />} />
            <Route path="retiradas" element={<Retiradas />} />
            <Route path="categorias" element={<Categorias />} />
            <Route path="painel-gerenciador" element={<PainelGerenciador />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
}
