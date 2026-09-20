import { Link, Outlet } from "react-router-dom";
import { StoreConnectionProvider, useStoreConnection } from "@/contexts/StoreConnectionContext";

function Header() {
  const { connected } = useStoreConnection();

  return (
    <header className="border-b border-[var(--color-ink-on-dark)]/10 bg-[var(--color-bg-alt)]">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link
          to={connected ? "/dashboard" : "/"}
          className="font-display text-sm font-semibold tracking-tight"
        >
          Marketing Copilot
        </Link>
        {connected && (
          <nav className="flex items-center gap-5 text-sm text-[var(--color-ink-on-dark)]/60">
            <Link to="/dashboard" className="hover:text-[var(--color-ink-on-dark)]">
              Dashboard
            </Link>
            <Link to="/insights" className="hover:text-[var(--color-ink-on-dark)]">
              Insights
            </Link>
            <Link to="/creative-testing" className="hover:text-[var(--color-ink-on-dark)]">
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
      <div className="min-h-dvh bg-[var(--color-bg)] text-[var(--color-ink-on-dark)]">
        <Header />
        <Outlet />
      </div>
    </StoreConnectionProvider>
  );
}
