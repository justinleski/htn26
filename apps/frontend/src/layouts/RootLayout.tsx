import { Link, NavLink, Outlet } from "react-router-dom";
import { motion } from "framer-motion";
import { StoreConnectionProvider, useStoreConnection } from "@/contexts/StoreConnectionContext";

const MotionNavLink = motion.create(NavLink);

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/insights", label: "Insights" },
  { to: "/creative-testing", label: "Creative testing" },
];

function Header() {
  const { connected } = useStoreConnection();

  return (
    <header className="border-b border-[var(--color-ink-on-dark)]/10 bg-[var(--color-bg-alt)]">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <motion.div whileTap={{ scale: 0.96 }} className="inline-block">
          <Link
            to={connected ? "/dashboard" : "/"}
            className="font-display text-sm font-semibold tracking-tight"
          >
            Marketing Copilot
          </Link>
        </motion.div>
        {connected && (
          <nav className="flex items-center gap-5 text-sm text-[var(--color-ink-on-dark)]/60">
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
          </nav>
        )}
      </div>
    </header>
  );
}

export function RootLayout() {
  return (
    <StoreConnectionProvider>
      <div className="grid-paper min-h-dvh text-[var(--color-ink-on-dark)]">
        <Header />
        <Outlet />
      </div>
    </StoreConnectionProvider>
  );
}
