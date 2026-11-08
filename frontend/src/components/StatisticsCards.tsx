import { ClipboardList, Clock3, HardHat, Shirt } from "lucide-react";
import type { Statistics } from "../types/incidents";
export function StatisticsCards({
  data,
  loading,
}: {
  data?: Statistics;
  loading: boolean;
}) {
  const cards = [
    {
      label: "Total incidents",
      value: data?.total,
      icon: ClipboardList,
      tone: "blue",
      caption: "All recorded detections",
    },
    {
      label: "Pending review",
      value: data?.pending,
      icon: Clock3,
      tone: "amber",
      caption: "Awaiting a safety review",
    },
    {
      label: "Missing helmet",
      value: data?.no_helmet,
      icon: HardHat,
      tone: "red",
      caption: "Potential helmet violations",
    },
    {
      label: "Missing safety vest",
      value: data?.no_vest,
      icon: Shirt,
      tone: "violet",
      caption: "Potential vest violations",
    },
  ];
  return (
    <section
      className="stats-grid"
      aria-label="All-time incident statistics"
      aria-busy={loading}
    >
      {cards.map((card) => (
        <article className="stat-card" key={card.label}>
          <div className="stat-top">
            <span>{card.label}</span>
            <span className={`icon-tile ${card.tone}`}>
              <card.icon size={19} />
            </span>
          </div>
          <div className="stat-number">
            {card.value === undefined ? (
              <span className={loading ? "skeleton number-skeleton" : ""}>
                {loading ? "" : "—"}
              </span>
            ) : (
              card.value.toLocaleString()
            )}
          </div>
          <p>{card.caption}</p>
        </article>
      ))}
    </section>
  );
}
