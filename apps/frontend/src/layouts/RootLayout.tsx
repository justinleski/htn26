import { Link, Outlet } from "react-router-dom";
import { StoreConnectionProvider, useStoreConnection } from "@/contexts/StoreConnectionContext";

function Header() {
  const { connected } = useStoreConnection();

  return (
    <header className="border-b border-white/5">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
<<<<<<< HEAD
        <Link to={connected ? "/insights" : "/"} className="text-sm font-semibold tracking-tight">
=======
        <Link to={connected ? "/dashboard" : "/"} className="text-sm font-semibold tracking-tight">
>>>>>>> origin/main
          Marketing Copilot
        </Link>
        {connected && (
          <nav className="flex items-center gap-5 text-sm text-[var(--color-muted)]">
<<<<<<< HEAD
=======
            <Link to="/dashboard" className="hover:text-[var(--color-fg)]">
              Dashboard
            </Link>
>>>>>>> origin/main
            <Link to="/insights" className="hover:text-[var(--color-fg)]">
              Insights
            </Link>
            <Link to="/creative-testing" className="hover:text-[var(--color-fg)]">
              Creative testing
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}

export function RootLayout() {
  return (
    <StoreConnectionProvider>
      <div className="min-h-dvh bg-[var(--color-bg)] text-[var(--color-fg)]">
        <Header />
        <Outlet />
      </div>
    </StoreConnectionProvider>
  );
}
