import { Link, NavLink, Outlet } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";
import { DataState } from "@/components/DataState";
import { StoreConnectionProvider, useStoreConnection } from "@/contexts/StoreConnectionContext";

const MotionNavLink = motion.create(NavLink);

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/insights", label: "Insights" },
  { to: "/campaign", label: "Campaigns" },
  { to: "/creative-testing", label: "Creative demo" },
];

function Header() {
  const { connected, logout } = useStoreConnection();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signOut() {
    setSigningOut(true);
    setError(null);
    try { await logout(); }
    catch { setError("Sign-out failed. Please try again."); }
    finally { setSigningOut(false); }
  }

  return (
    <header className="border-b border-[var(--color-ink-on-dark)]/10 bg-[var(--color-bg-alt)]">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <motion.div whileTap={{ scale: 0.96 }} className="inline-block">
          <Link
            to={connected ? "/dashboard" : "/"}
            className="inline-flex items-center"
          >
            <img src="/adgile-logo.png" alt="Adgile" className="h-8 w-auto" />
          </Link>
        </motion.div>
        {connected && (
          <nav aria-label="Main navigation" className="flex flex-wrap items-center gap-5 text-sm text-[var(--color-ink-on-dark)]/60">
            {NAV_ITEMS.map((item) => (
              <MotionNavLink
                key={item.to}
                to={item.to}
                whileTap={{ scale: 0.94 }}
                className={({ isActive }) =>
                  `relative py-1 transition-colors ${
                    isActive
                      ? "font-medium text-[var(--color-ink-on-dark)]"
                      : "hover:text-[var(--color-ink-on-dark)]"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {item.label}
                    {isActive && (
                      <motion.span
                        layoutId="nav-underline"
                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                        className="absolute right-0 -bottom-1 left-0 h-0.5 rounded-full bg-[var(--color-mark)]"
                      />
                    )}
                  </>
                )}
              </MotionNavLink>
            ))}
            <button type="button" disabled={signingOut} onClick={() => void signOut()} className="hover:text-[var(--color-ink)] disabled:opacity-60">{signingOut ? "Signing out…" : "Sign out"}</button>
          </nav>
        )}
      </div>
      {error ? <p role="alert" className="mx-auto max-w-5xl px-6 pb-3 text-sm text-[var(--color-flag)]">{error}</p> : null}
    </header>
  );
}

export function RootLayout() {
  return (
    <StoreConnectionProvider>
      <div className="grid-paper min-h-dvh text-[var(--color-ink-on-dark)]">
        <Header />
        <SessionContent />
      </div>
    </StoreConnectionProvider>
  );
}

function SessionContent() {
  const { loading, error } = useStoreConnection();
  return loading || error ? <DataState loading={loading} error={error} retry={() => window.location.reload()} /> : <Outlet />;
}
