export function DataState({ loading, error, retry }: { loading: boolean; error: string | null; retry?: () => void }) {
  return <div className="mx-auto max-w-4xl px-6 py-12" role={error ? "alert" : "status"}>
    <p>{error ?? (loading ? "Loading your store…" : "No data yet.")}</p>
    {error && retry ? <button className="mt-4 underline" onClick={retry}>Try again</button> : null}
  </div>;
}
