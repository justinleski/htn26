export class ApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, { ...options, credentials: "same-origin", headers: { "Content-Type": "application/json", ...options.headers } });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) window.dispatchEvent(new Event("session-expired"));
    throw new ApiError(body?.error || "The server could not complete this request.", response.status);
  }
  return body as T;
}
export const post = <T>(path: string, body = {}) => api<T>(path, { method: "POST", body: JSON.stringify(body) });
export interface Dashboard {
  shop: string;
  products: { id: string; title: string; price: string; currency: string; demo: boolean; reviewCount: number; adCount: number }[];
  ads: { sourceId: string; productTitle: string; messaging: string; channel: string; attribution: string; currency: string; ctr: string; conversionRate: string; roas: string }[];
  reviews: { sourceId: string; productTitle: string; rating: number; text: string; attribution: string }[];
  findings: { kind: string; title: string; observation: string; supportingSourceIds: string[]; observedMetrics?: Record<string, { value: number | null; reason?: string }>; limitations: string[] }[];
  metrics: { groups: { currency: string; periodStart: string; periodEnd: string; totals: { spend: number; attributedRevenue: number }; ctr: string; conversionRate: string; roas: string }[] };
  canGenerate: boolean;
}
export interface SavedCampaign {
  id: string; productId: string; objective: string; audience: string; strategy: string;
  hooks: string[]; captions: string[];
  variants: { name: string; content: string; changedElement: string; hypothesis: string }[];
  supportingSourceIds: string[]; validationResults: string[]; createdAt: string;
}
export interface CampaignSummary { id: string; objective: string; createdAt: string; product: { title: string } }
