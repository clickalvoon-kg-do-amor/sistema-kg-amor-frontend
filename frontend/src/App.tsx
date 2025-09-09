import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "./lib/supabaseClient";

import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Celulas from "./pages/Celulas";
import Recebimentos from "./pages/Recebimentos";

export default function App() {
  const [session, setSession] = useState<null | { user: any }>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // pega sessão atual
    const run = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session ? { user: data.session.user } : null);
      setLoading(false);
    };
    run();

    // ouve mudanças de auth
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
      <Router basename="/sistema-kg-amor-frontend">
        {/* Rota pública */}
        <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login />} />

        {/* Rotas protegidas com layout padrão */}
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
          {/* fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}
