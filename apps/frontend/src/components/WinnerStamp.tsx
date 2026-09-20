// The "this one won" annotation — a friendly rotated sticker, not a flat
// pill/chip. Pair with a `border-l-4 border-[var(--color-mark)]` on the
// highlighted row/card itself — this component is only the sticker.
export function WinnerStamp({
  label = "Top pick",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={`pointer-events-none absolute -top-3 -right-2 z-10 rotate-[-4deg] rounded-full border-2 border-[var(--color-mark)] bg-[var(--color-paper)] px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-[var(--color-mark)] uppercase shadow-sm ${className}`}
    >
      {label}
    </span>
  );
}
