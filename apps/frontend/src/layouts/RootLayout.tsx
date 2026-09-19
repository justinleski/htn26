import { Outlet } from "react-router-dom";

export function RootLayout() {
  return (
    <div className="min-h-dvh bg-[var(--color-bg)] text-[var(--color-fg)]">
      <Outlet />
    </div>
  );
}
