import {
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  ChevronLeft,
  ChevronRight,
  ChevronRight as OpenIcon,
  Inbox,
} from "lucide-react";
import { PAGE_SIZE } from "../services/api";
import type { Filters, IncidentPage } from "../types/incidents";
import { formatTimestamp, violationLabel } from "../types/incidents";
import { StatusBadge } from "./StatusBadge";
interface Props {
  data?: IncidentPage;
  filters: Filters;
  onFilters: (next: Filters) => void;
  onOpen: (id: number) => void;
  loading: boolean;
}
export function IncidentTable({
  data,
  filters,
  onFilters,
  onOpen,
  loading,
}: Props) {
  const pages = Math.max(1, Math.ceil((data?.total || 0) / PAGE_SIZE));
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return (
    <section
      className="panel incident-panel"
      id="incident-history"
      aria-labelledby="history-title"
      aria-busy={loading}
    >
      <div className="panel-heading">
        <div>
          <h2 id="history-title">
            Incident history{" "}
            <span className="count-chip">
              {data ? data.total.toLocaleString() : "—"}
            </span>
          </h2>
          <p>Potential PPE violations detected across your workplace</p>
        </div>
        <span className="small-note">Times in {timezone}</span>
      </div>
      <div className="table-filters">
        <div className="filter-group">
          <label>
            Violation type
            <select
              value={filters.violation}
              onChange={(event) =>
                onFilters({
                  ...filters,
                  violation: event.target.value as Filters["violation"],
                  page: 1,
                })
              }
            >
              <option value="">All violation types</option>
              <option value="no_helmet">Missing helmet</option>
              <option value="no_vest">Missing safety vest</option>
            </select>
          </label>
          <label>
            Review status
            <select
              value={filters.status}
              onChange={(event) =>
                onFilters({
                  ...filters,
                  status: event.target.value as Filters["status"],
                  page: 1,
                })
              }
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="reviewed">Reviewed</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </label>
        </div>
        <label className="sort-filter">
          Sort by
          <select
            value={filters.sort}
            onChange={(event) =>
              onFilters({
                ...filters,
                sort: event.target.value as Filters["sort"],
                page: 1,
              })
            }
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
      </div>
      <div className="table-scroll">
        <table>
          <caption className="sr-only">
            Safety incidents. Select an incident to view details and update its
            review status.
          </caption>
          <thead>
            <tr>
              <th scope="col">Incident ID</th>
              <th scope="col">Tracking ID</th>
              <th scope="col">Violation type</th>
              <th
                scope="col"
                aria-sort={
                  filters.sort === "newest" ? "descending" : "ascending"
                }
              >
                <button
                  className="sort-button"
                  onClick={() =>
                    onFilters({
                      ...filters,
                      sort: filters.sort === "newest" ? "oldest" : "newest",
                      page: 1,
                    })
                  }
                >
                  Detected at{" "}
                  {filters.sort === "newest" ? (
                    <ArrowDownWideNarrow size={14} />
                  ) : (
                    <ArrowUpWideNarrow size={14} />
                  )}
                </button>
              </th>
              <th scope="col">Review status</th>
              <th scope="col">
                <span className="sr-only">Details</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((incident) => (
              <tr key={incident.id}>
                <td>
                  <button
                    className="incident-link"
                    onClick={() => onOpen(incident.id)}
                  >
                    INC-{String(incident.id).padStart(4, "0")}
                  </button>
                </td>
                <td>
                  <span className="worker-id">#{incident.worker_id}</span>
                </td>
                <td>
                  <span
                    className={`violation-dot ${incident.violation === "no_helmet" ? "helmet" : "vest"}`}
                  />
                  {violationLabel(incident.violation)}
                </td>
                <td className="timestamp">
                  {formatTimestamp(incident.timestamp)}
                </td>
                <td>
                  <StatusBadge status={incident.status} />
                </td>
                <td>
                  <button
                    className="icon-button"
                    aria-label={`View incident ${incident.id}`}
                    onClick={() => onOpen(incident.id)}
                  >
                    <OpenIcon size={17} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!data || data.items.length === 0 ? (
        <div className="table-empty" role="status">
          <Inbox size={32} strokeWidth={1.3} />
          <strong>
            {loading
              ? "Loading incidents…"
              : !data
                ? "Incident data unavailable"
                : data.total === 0
                  ? "No incidents found"
                  : "No incidents on this page"}
          </strong>
          <p>
            {loading
              ? "Connecting to your safety records."
              : !data
                ? "Check the connection message above and refresh."
                : filters.status || filters.violation
                  ? "Try adjusting your filters to see more records."
                  : "New detections will appear here automatically."}
          </p>
          {(filters.status || filters.violation) && !loading && (
            <button
              className="button secondary"
              onClick={() =>
                onFilters({ ...filters, status: "", violation: "", page: 1 })
              }
            >
              Clear filters
            </button>
          )}
        </div>
      ) : null}
      <div className="table-footer">
        <span>
          {data && data.items.length
            ? `Showing ${data.offset + 1}–${data.offset + data.items.length} of ${data.total.toLocaleString()} incidents`
            : "0 incidents shown"}
        </span>
        <div className="pagination">
          <button
            className="icon-button"
            aria-label="Previous page"
            disabled={filters.page === 1 || loading}
            onClick={() => onFilters({ ...filters, page: filters.page - 1 })}
          >
            <ChevronLeft size={17} />
          </button>
          <span>
            Page {filters.page} of {pages}
          </span>
          <button
            className="icon-button"
            aria-label="Next page"
            disabled={!data || filters.page >= pages || loading}
            onClick={() => onFilters({ ...filters, page: filters.page + 1 })}
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </div>
    </section>
  );
}
