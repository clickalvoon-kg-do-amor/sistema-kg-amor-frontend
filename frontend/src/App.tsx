import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "./lib/supabaseClient";

import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Celulas from "./pages/Celulas";
import Recebimentos from "./pages/Recebimentos";
import PainelGerenciador from "./pages/PainelGerenciador";
import Estoque from "./pages/Estoque";
import Retiradas from "./pages/Retiradas"; 
import Categorias from "./pages/Categorias"; // <-- ADICIONADO

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
    return (
      <div className="min-h-screen grid place-items-center text-slate-600">
        Carregando…
      </div>
    );
  }

  return (
    <Router>
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
          <Route path="categorias" element={<Categorias />} /> {/* <-- ADICIONADO */}
          <Route path="painel-gerenciador" element={<PainelGerenciador />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}