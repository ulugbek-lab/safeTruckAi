import type {
  Analytics,
  DashboardData,
  Filters,
  Incident,
  IncidentPage,
  ReviewStatus,
  Statistics,
} from "../types/incidents";

import { demoDashboard, demoIncident, demoReview } from "./demo";
const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";
export const PAGE_SIZE = 10;
async function request<T>(
  path: string,
  signal?: AbortSignal,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`${base}/api${path}`, {
    ...options,
    signal,
    headers: { Accept: "application/json", ...options?.headers },
  });
  if (!response.ok) {
    let message = `Request failed (${response.status}). Please try again.`;
    try {
      const body = await response.json();
      if (typeof body.detail === "string") message = body.detail;
    } catch {
      /* A proxy may return a non-JSON error. */
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}
export const api = {
  async dashboard(
    filters: Filters,
    signal: AbortSignal,
  ): Promise<DashboardData> {
    if (DEMO_MODE) {
      return demoDashboard(filters);
    }
    const params = new URLSearchParams({
      offset: String((filters.page - 1) * PAGE_SIZE),
      limit: String(PAGE_SIZE),
      sort: filters.sort,
    });
    if (filters.violation) params.set("violation", filters.violation);
    if (filters.status) params.set("status", filters.status);
    const [incidents, statistics, analytics] = await Promise.all([
      request<IncidentPage>(`/dashboard/incidents?${params}`, signal),
      request<Statistics>("/dashboard/statistics", signal),
      request<Analytics>("/dashboard/analytics?days=14", signal),
    ]);
    return { incidents, statistics, analytics };
  },
  incident: (id: number, signal: AbortSignal) =>
    DEMO_MODE
      ? Promise.resolve(demoIncident(id))
      : request<Incident>(`/incidents/${id}`, signal),

  review: (id: number, status: ReviewStatus, signal: AbortSignal) =>
    DEMO_MODE
      ? Promise.resolve(demoReview(id, status))
      : request<Incident>(`/incidents/${id}`, signal, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }),
};
