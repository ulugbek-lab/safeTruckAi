import { useEffect, useState } from "react";
import { AlertCircle, ArrowRight, RefreshCw, ShieldCheck } from "lucide-react";
import { lazy, Suspense } from "react";
const AnalyticsCharts = lazy(() =>
  import("../components/AnalyticsCharts").then((module) => ({
    default: module.AnalyticsCharts,
  })),
);
import { IncidentDetails } from "../components/IncidentDetails";
import { IncidentTable } from "../components/IncidentTable";
import { StatisticsCards } from "../components/StatisticsCards";
import { useDashboard } from "../hooks/useDashboard";
import { PAGE_SIZE } from "../services/api";
import type { Filters } from "../types/incidents";
export function DashboardPage() {
  const [filters, setFilters] = useState<Filters>({
    page: 1,
    violation: "",
    status: "",
    sort: "newest",
  });
  const [selected, setSelected] = useState<number | null>(null);
  const { data, error, refreshing, lastUpdated, refresh } =
    useDashboard(filters);
  useEffect(() => {
    if (
      data &&
      filters.page > 1 &&
      data.incidents.total <= (filters.page - 1) * PAGE_SIZE
    )
      setFilters((current) => ({
        ...current,
        page: Math.max(1, Math.ceil(data.incidents.total / PAGE_SIZE)),
      }));
  }, [data, filters.page]);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">SAFETY OPERATIONS</div>
          <h1>Safety overview</h1>
          <p>A clear view of workplace risks, from detection to review.</p>
        </div>
        <button
          className="button secondary refresh-button"
          disabled={refreshing}
          onClick={refresh}
        >
          <RefreshCw size={16} className={refreshing ? "refreshing" : ""} />
          {refreshing ? "Refreshing…" : "Refresh data"}
        </button>
      </div>
      <div className="connection-strip">
        <span
          className={`connection-pill ${error ? "offline" : lastUpdated ? "connected" : "connecting"}`}
        >
          <span />
          {error
            ? "Connection interrupted"
            : lastUpdated
              ? "API connected"
              : "Connecting to API"}
        </span>
        <span className="update-note">
          Auto-refresh every 8s<span className="separator">·</span>
          {lastUpdated
            ? `Last updated ${lastUpdated.toLocaleTimeString()}`
            : "Waiting for first update"}
        </span>
      </div>
      {error && (
        <div className="error-banner" role="alert">
          <AlertCircle size={19} />
          <div>
            <strong>Unable to refresh incident data</strong>
            <p>
              {error}{" "}
              {data
                ? "Showing the last successful snapshot."
                : "Make sure FastAPI and PostgreSQL are running."}
            </p>
          </div>
          <button
            className="text-button"
            disabled={refreshing}
            onClick={refresh}
          >
            Retry
          </button>
        </div>
      )}
      <StatisticsCards data={data?.statistics} loading={!data && refreshing} />
      <div id="analytics">
        <Suspense
          fallback={
            <div className="panel chart-empty" role="status">
              Loading analytics…
            </div>
          }
        >
          <AnalyticsCharts
            data={data?.analytics}
            loading={!data && refreshing}
          />
        </Suspense>
      </div>
      <div className="review-notice">
        <div className="notice-icon">
          <ShieldCheck size={20} />
        </div>
        <div>
          <strong>Keep your review queue moving</strong>
          <p>
            {data
              ? data.statistics.pending > 0
                ? `${data.statistics.pending.toLocaleString()} incident${data.statistics.pending === 1 ? "" : "s"} awaiting review. Open a record to assess and update its status.`
                : "Your review queue is clear. New detections will appear automatically."
              : "Review potential violations and keep a reliable incident history."}
          </p>
        </div>
        <button
          className="text-button"
          onClick={() => {
            setFilters((current) => ({
              ...current,
              status: "pending",
              page: 1,
            }));
            document
              .getElementById("incident-history")
              ?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        >
          View pending
          <ArrowRight size={15} />
        </button>
      </div>
      <IncidentTable
        data={data?.incidents}
        filters={filters}
        onFilters={setFilters}
        onOpen={setSelected}
        loading={!data && refreshing}
      />
      {selected !== null && (
        <IncidentDetails
          key={selected}
          id={selected}
          onClose={() => setSelected(null)}
          onSaved={refresh}
        />
      )}
    </>
  );
}
