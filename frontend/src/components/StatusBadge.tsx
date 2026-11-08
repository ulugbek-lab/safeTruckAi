import { statusLabel } from "../types/incidents";
export function StatusBadge({ status }: { status: string }) {
  const tone = ["pending", "reviewed", "dismissed"].includes(status)
    ? status
    : "unknown";
  return (
    <span className={`status-badge ${tone}`}>
      <span aria-hidden="true" />
      {statusLabel(status)}
    </span>
  );
}
