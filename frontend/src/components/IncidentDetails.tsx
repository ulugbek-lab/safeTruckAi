import { useEffect, useRef, useState } from "react";
import { AlertCircle, CameraOff, Check, X } from "lucide-react";
import { api } from "../services/api";
import type { Incident, ReviewStatus } from "../types/incidents";
import { formatTimestamp, violationLabel } from "../types/incidents";
import { StatusBadge } from "./StatusBadge";
interface Props {
  id: number;
  onClose: () => void;
  onSaved: () => void;
}
export function IncidentDetails({ id, onClose, onSaved }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [incident, setIncident] = useState<Incident | null>(null);
  const [status, setStatus] = useState<ReviewStatus>("pending");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [retry, setRetry] = useState(0);
  const mutation = useRef<AbortController | null>(null);
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element?.showModal();
    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
      previous?.focus();
      mutation.current?.abort();
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let active = true;
    setLoading(true);
    setError(null);
    api
      .incident(id, controller.signal)
      .then((value) => {
        if (!active) return;
        setIncident(value);
        if (["pending", "reviewed", "dismissed"].includes(value.status))
          setStatus(value.status as ReviewStatus);
      })
      .catch((cause) => {
        if (active)
          setError(
            cause.name === "AbortError"
              ? "The request timed out. Please retry."
              : cause.message,
          );
      })
      .finally(() => {
        clearTimeout(timeout);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [id, retry]);
  async function save() {
    if (!incident || saving) return;
    const controller = new AbortController();
    mutation.current = controller;
    const timeout = setTimeout(() => controller.abort(), 15000);
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await api.review(id, status, controller.signal);
      setIncident(updated);
      setSaved(true);
      onSaved();
    } catch (cause) {
      setError(
        cause instanceof Error && cause.name !== "AbortError"
          ? cause.message
          : "The update could not be confirmed. Reload this incident before retrying.",
      );
    } finally {
      clearTimeout(timeout);
      setSaving(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="detail-dialog"
      aria-labelledby="detail-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!saving) onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <div className="detail-header">
        <div>
          <span className="eyebrow">INCIDENT DETAILS</span>
          <h2 id="detail-title">INC-{String(id).padStart(4, "0")}</h2>
        </div>
        <button
          className="icon-button"
          aria-label="Close incident details"
          onClick={onClose}
          disabled={saving}
        >
          <X size={20} />
        </button>
      </div>
      <div className="detail-body">
        {loading && <p role="status">Loading incident details…</p>}
        {error && (
          <div className="error-banner" role="alert">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}
        {!loading && !incident && (
          <button
            className="button secondary"
            onClick={() => setRetry((value) => value + 1)}
          >
            Retry loading
          </button>
        )}
        {incident && (
          <>
            <div className="detail-violation">
              <span className="eyebrow">POTENTIAL VIOLATION</span>
              <h3>{violationLabel(incident.violation)}</h3>
              <StatusBadge status={incident.status} />
            </div>
            <dl className="detail-fields">
              <div>
                <dt>Worker tracking ID</dt>
                <dd>#{incident.worker_id}</dd>
              </div>
              <div>
                <dt>Detected at</dt>
                <dd>{formatTimestamp(incident.timestamp)}</dd>
              </div>
              <div>
                <dt>Timestamp (UTC)</dt>
                <dd>{new Date(incident.timestamp).toISOString()}</dd>
              </div>
            </dl>
            <p className="tracking-note">
              Tracking IDs identify temporary detection tracks. They do not
              identify a person and may change when a worker re-enters the view.
            </p>
            <div className="evidence-placeholder">
              <CameraOff size={24} />
              <div>
                <strong>No visual evidence captured</strong>
                <p>
                  Video and screenshot capture are not available in this phase.
                </p>
              </div>
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void save();
              }}
            >
              <label className="review-label" htmlFor="review-status">
                Review status
              </label>
              <select
                id="review-status"
                value={status}
                disabled={saving}
                onChange={(event) => {
                  setStatus(event.target.value as ReviewStatus);
                  setSaved(false);
                }}
              >
                <option value="pending">Pending</option>
                <option value="reviewed">Reviewed</option>
                <option value="dismissed">Dismissed</option>
              </select>
              <p className="small-note">
                Dismissed incidents remain in the history and all-time
                analytics.
              </p>
              <div className="review-footer">
                <span role="status" className="saved-message">
                  {saved && (
                    <>
                      <Check size={15} />
                      Review saved
                    </>
                  )}
                </span>
                <button
                  className="button primary"
                  type="submit"
                  disabled={saving || status === incident.status}
                >
                  {saving ? "Saving…" : "Save review"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </dialog>
  );
}
