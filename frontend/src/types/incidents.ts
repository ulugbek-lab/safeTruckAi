export type Violation = "no_helmet" | "no_vest";
export type ReviewStatus = "pending" | "reviewed" | "dismissed";
export interface Incident {
  id: number;
  worker_id: number;
  violation: string;
  timestamp: string;
  status: string;
}
export interface IncidentPage {
  items: Incident[];
  total: number;
  offset: number;
  limit: number;
}
export interface Statistics {
  total: number;
  pending: number;
  no_helmet: number;
  no_vest: number;
}
export interface Analytics {
  timezone: string;
  days: number;
  daily: { date: string; count: number }[];
  distribution: { violation: string; count: number }[];
}
export interface Filters {
  violation: Violation | "";
  status: ReviewStatus | "";
  sort: "newest" | "oldest";
  page: number;
}
export interface DashboardData {
  incidents: IncidentPage;
  statistics: Statistics;
  analytics: Analytics;
}
export const violationLabel = (value: string) =>
  ({ no_helmet: "Missing helmet", no_vest: "Missing safety vest" })[value] ||
  value;
export const statusLabel = (value: string) =>
  ({ pending: "Pending", reviewed: "Reviewed", dismissed: "Dismissed" })[
    value
  ] || value;
export const formatTimestamp = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(value));
