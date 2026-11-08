import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../services/api";
import type { DashboardData, Filters } from "../types/incidents";
export function useDashboard(filters: Filters) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const refreshRef = useRef<() => void>(() => {});
  useEffect(() => {
    let stopped = false;
    let running = false;
    let queued = false;
    let controller: AbortController | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Do not display rows from a previous filter while loading the next query.
    setData(null);
    const run = async () => {
      if (running || stopped) return;
      clearTimeout(timer);
      running = true;
      controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 15000);
      setRefreshing(true);
      try {
        const next = await api.dashboard(filters, controller.signal);
        if (!stopped) {
          setData(next);
          setLastUpdated(new Date());
          setError(null);
        }
      } catch (cause) {
        controller.abort(); // Cancel sibling requests when one fails.
        if (!stopped)
          setError(
            cause instanceof Error && cause.name !== "AbortError"
              ? cause.message
              : "The server took too long to respond. Please try again.",
          );
      } finally {
        clearTimeout(timeout);
        running = false;
        if (!stopped) {
          setRefreshing(false);
          timer = setTimeout(run, queued ? 0 : 8000);
          queued = false;
        }
      }
    };
    refreshRef.current = () => {
      if (running) queued = true;
      else void run();
    };
    void run();
    return () => {
      stopped = true;
      clearTimeout(timer);
      controller?.abort();
      refreshRef.current = () => {};
    };
  }, [filters.page, filters.sort, filters.status, filters.violation]);
  const refresh = useCallback(() => refreshRef.current(), []);
  return { data, error, refreshing, lastUpdated, refresh };
}
