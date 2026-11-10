
import type {
  Incident,
  ReviewStatus,
  Filters,
  DashboardData,
} from "../types/incidents";

const STORAGE_KEY = "safetruck-portfolio-demo-v1";
const PAGE_SIZE = 10;

function initialIncidents(): Incident[] {
  const violations = ["no_helmet", "no_vest"];

  return Array.from({ length: 24 }, (_, index) => ({
    id: index + 1,
    worker_id: 100 + (index % 8),
    violation: violations[index % 2],
    status: index % 4 === 0 ? "reviewed" : "pending",
    timestamp: new Date(
      Date.now() - index * 12 * 60 * 60 * 1000
    ).toISOString(),
  }));
}

function readIncidents(): Incident[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved) as Incident[];
  } catch {
    // Fall back to initial demo data.
  }

  const records = initialIncidents();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  return records;
}

export function demoDashboard(filters: Filters): DashboardData {
  const all = readIncidents();

  const filtered = all
    .filter((item) =>
      !filters.violation || item.violation === filters.violation
    )
    .filter((item) =>
      !filters.status || item.status === filters.status
    )
    .sort((a, b) =>
      filters.sort === "newest"
        ? b.timestamp.localeCompare(a.timestamp)
        : a.timestamp.localeCompare(b.timestamp)
    );

  const offset = (filters.page - 1) * PAGE_SIZE;

  const daily = Array.from({ length: 14 }, (_, index) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - (13 - index));
    const day = date.toISOString().slice(0, 10);

    return {
      date: day,
      count: all.filter((item) =>
        item.timestamp.startsWith(day)
      ).length,
    };
  });

  return {
    incidents: {
      items: filtered.slice(offset, offset + PAGE_SIZE),
      total: filtered.length,
      offset,
      limit: PAGE_SIZE,
    },
    statistics: {
      total: all.length,
      pending: all.filter((item) => item.status === "pending").length,
      no_helmet: all.filter((item) => item.violation === "no_helmet").length,
      no_vest: all.filter((item) => item.violation === "no_vest").length,
    },
    analytics: {
      timezone: "UTC",
      days: 14,
      daily,
      distribution: ["no_helmet", "no_vest"].map((violation) => ({
        violation,
        count: all.filter((item) => item.violation === violation).length,
      })),
    },
  };
}

export function demoIncident(id: number): Incident {
  const incident = readIncidents().find((item) => item.id === id);

  if (!incident) throw new Error("Demo incident not found.");

  return incident;
}

export function demoReview(
  id: number,
  status: ReviewStatus
): Incident {
  const incidents = readIncidents();
  const incident = incidents.find((item) => item.id === id);

  if (!incident) throw new Error("Demo incident not found.");

  incident.status = status;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(incidents));

  return incident;
}
