import { BarChart3, ChartNoAxesCombined } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Analytics } from "../types/incidents";
import { violationLabel } from "../types/incidents";
const colors = ["#e3983b", "#516ed1", "#8391a6"];
const dayLabel = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
function ChartEmpty({
  loading,
  unavailable,
}: {
  loading: boolean;
  unavailable: boolean;
}) {
  return (
    <div className="chart-empty">
      <BarChart3 size={30} strokeWidth={1.4} />
      <strong>
        {loading
          ? "Loading analytics…"
          : unavailable
            ? "Analytics unavailable"
            : "No incidents in this period"}
      </strong>
      <span>
        {loading
          ? "Retrieving incident aggregates"
          : unavailable
            ? "Refresh to reconnect to the API."
            : "New detections will appear here automatically."}
      </span>
    </div>
  );
}
export function AnalyticsCharts({
  data,
  loading,
}: {
  data?: Analytics;
  loading: boolean;
}) {
  const distribution =
    data?.distribution.map((item) => ({
      name: violationLabel(item.violation),
      count: item.count,
    })) || [];
  const total = distribution.reduce((sum, item) => sum + item.count, 0);
  const recentTotal =
    data?.daily.reduce((sum, item) => sum + item.count, 0) || 0;
  return (
    <section className="analytics-grid" aria-label="Incident analytics">
      <article className="panel trend-panel">
        <div className="panel-heading">
          <div>
            <h2>Incident activity</h2>
            <p>Daily detections · last 14 days · UTC</p>
          </div>
          <ChartNoAxesCombined size={20} className="muted" />
        </div>
        {data && recentTotal > 0 ? (
          <>
            <div className="chart-frame">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.daily}
                  margin={{ top: 12, right: 8, left: -25, bottom: 0 }}
                  accessibilityLayer
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e9edf2"
                  />
                  <XAxis
                    dataKey="date"
                    tickFormatter={dayLabel}
                    tick={{ fontSize: 11, fill: "#788497" }}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={26}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "#788497" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    labelFormatter={(label) => dayLabel(String(label))}
                    cursor={{ fill: "#f1f4f9" }}
                    contentStyle={{
                      borderRadius: 10,
                      borderColor: "#e5eaf0",
                      fontSize: 12,
                    }}
                  />
                  <Bar
                    dataKey="count"
                    name="Incidents"
                    fill="#4e70cf"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={26}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="sr-only">
              {data.daily
                .map((day) => `${day.date}: ${day.count} incidents`)
                .join("; ")}
            </p>
          </>
        ) : (
          <ChartEmpty loading={loading} unavailable={!data && !loading} />
        )}
      </article>
      <article className="panel distribution-panel">
        <div className="panel-heading">
          <div>
            <h2>Violation breakdown</h2>
            <p>All-time incident distribution</p>
          </div>
        </div>
        {data && total > 0 ? (
          <>
            <div className="donut-frame">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart accessibilityLayer>
                  <Pie
                    data={distribution}
                    dataKey="count"
                    nameKey="name"
                    innerRadius={57}
                    outerRadius={77}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {distribution.map((item, i) => (
                      <Cell key={item.name} fill={colors[i % colors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 10,
                      borderColor: "#e5eaf0",
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-label">
                <strong>{total.toLocaleString()}</strong>
                <span>incidents</span>
              </div>
            </div>
            <div className="chart-legend">
              {distribution.map((item, i) => (
                <div key={item.name}>
                  <span
                    className="legend-dot"
                    style={{ background: colors[i % colors.length] }}
                  />
                  <span>{item.name}</span>
                  <strong>{item.count.toLocaleString()}</strong>
                  <small>{Math.round((item.count / total) * 100)}%</small>
                </div>
              ))}
            </div>
          </>
        ) : (
          <ChartEmpty loading={loading} unavailable={!data && !loading} />
        )}
      </article>
    </section>
  );
}
