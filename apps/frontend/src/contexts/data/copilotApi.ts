import type { DashboardPayload } from "./adaptDashboard";

export const DEFAULT_SHOP = "htn26-rain-jackets.myshopify.com";

const TOKEN_KEY = "htn26.copilot.token";

export class CopilotApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "CopilotApiError";
    this.status = status;
  }
}

export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL;
  if (typeof raw === "string" && raw.trim()) {
    return raw.trim().replace(/\/$/, "");
  }
  return "";
}

export function getLoginUrl(shop: string): string {
  const normalized = shop.trim() || DEFAULT_SHOP;
  const params = new URLSearchParams({ shop: normalized });
  // /auth/copilot runs classic offline OAuth (not embedded authenticate.admin).
  return `${getApiBaseUrl()}/auth/copilot?${params.toString()}`;
}

export function readStoredToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function writeStoredToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

export interface SessionResponse {
  connected: boolean;
  shop: string;
  storeName?: string;
}

export interface MerchantActionResult {
  ok: boolean;
  intent?: "sync" | "import-demo";
  message?: string;
  warning?: string;
  error?: string;
}

async function parseBody<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new CopilotApiError("The API returned a non-JSON response.", response.status);
  }
}

function errorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object") {
    const record = body as { error?: unknown; message?: unknown };
    if (typeof record.error === "string" && record.error.trim()) return record.error;
    if (typeof record.message === "string" && record.message.trim()) return record.message;
  }
  return fallback;
}

async function request<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  const body = await parseBody<unknown>(response);
  if (!response.ok) {
    throw new CopilotApiError(
      errorMessage(body, `Request failed (${response.status})`),
      response.status,
    );
  }
  return body as T;
}

export function fetchSession(token: string): Promise<SessionResponse> {
  return request<SessionResponse>("/api/session", token);
}

export function fetchDashboard(token: string): Promise<DashboardPayload> {
  return request<DashboardPayload>("/api/dashboard", token);
}

export function syncStore(token: string): Promise<MerchantActionResult> {
  return request<MerchantActionResult>("/api/sync", token, { method: "POST" });
}

export function importDemo(token: string): Promise<MerchantActionResult> {
  return request<MerchantActionResult>("/api/import-demo", token, { method: "POST" });
}
