import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

type Props = {
  user?: { email?: string };
  onLogout: () => void;
};

export default function Layout({ user, onLogout }: Props) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar user={user} onLogout={onLogout} />
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-0 md:grid-cols-[16rem_1fr]">
        <Sidebar />
        <main className="min-h-[calc(100vh-3.5rem)] p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
