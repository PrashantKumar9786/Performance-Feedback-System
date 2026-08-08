import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { feedbackApi } from "../api";

const COLORS = ["#0f6e6e", "#c45c26", "#1f5f9e", "#8a4f1f", "#3d6b4f"];

export default function MyHistoryPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeParam, setActiveParam] = useState("all");

  useEffect(() => {
    feedbackApi
      .myHistory()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="muted">Loading your score history…</p>;
  if (error) return <p className="error-text">{error}</p>;

  const cycleLabels = [
    ...new Set(
      data.trendByParameter.flatMap((t) => t.points.map((p) => p.cycleLabel)),
    ),
  ];

  const chartData = cycleLabels.map((label) => {
    const row = { cycleLabel: label };
    data.trendByParameter.forEach((trend) => {
      const point = trend.points.find((p) => p.cycleLabel === label);
      row[trend.parameterKey] = point?.score ?? null;
    });
    return row;
  });

  const visibleTrends =
    activeParam === "all"
      ? data.trendByParameter
      : data.trendByParameter.filter((t) => t.parameterKey === activeParam);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Your scores</h1>
          <p>
            Track how you scored on each parameter across recent monthly cycles.
          </p>
        </div>
      </div>

      <div className="panel panel-pad" style={{ marginBottom: "1rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "0.75rem",
            flexWrap: "wrap",
            marginBottom: "0.75rem",
          }}
        >
          <strong>wait for score</strong>
          <select
            value={activeParam}
            onChange={(e) => setActiveParam(e.target.value)}
            style={{
              border: "1px solid var(--line)",
              borderRadius: 10,
              padding: "0.4rem 0.65rem",
            }}
          >
            <option value="all">All parameters</option>
            {data.trendByParameter.map((t) => (
              <option key={t.parameterKey} value={t.parameterKey}>
                {t.parameterName}
              </option>
            ))}
          </select>
        </div>

        {chartData.length === 0 ? (
          <div className="empty">No feedback received yet.</div>
        ) : (
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid stroke="#e5edf2" strokeDasharray="4 4" />
                <XAxis dataKey="cycleLabel" tick={{ fontSize: 12 }} />
                <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} width={30} />
                <Tooltip />
                <Legend />
                {visibleTrends.map((trend, i) => (
                  <Line
                    key={trend.parameterKey}
                    type="monotone"
                    dataKey={trend.parameterKey}
                    name={trend.parameterName}
                    stroke={COLORS[i % COLORS.length]}
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="panel">
        {data.history.length === 0 ? (
          <div className="empty">Nothing to show yet for past months.</div>
        ) : (
          data.history.map((item) => (
            <div
              key={item.submissionId}
              className="list-item"
              style={{ alignItems: "start" }}
            >
              <div style={{ flex: 1 }}>
                <strong>{item.cycle.label}</strong>
                <p className="muted" style={{ marginTop: "0.2rem" }}>
                  From {item.manager.name}
                  {item.manager.title ? ` · ${item.manager.title}` : ""}
                  {item.average != null ? ` · Avg ${item.average}` : ""}
                </p>
                <div
                  style={{
                    marginTop: "0.75rem",
                    display: "grid",
                    gap: "0.55rem",
                  }}
                >
                  {item.scores.map((s) => (
                    <div key={s.parameterKey}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "0.5rem",
                        }}
                      >
                        <span>{s.parameterName}</span>
                        <strong>{s.score}/5</strong>
                      </div>
                      <p
                        className="muted"
                        style={{ fontSize: "0.88rem", marginTop: 2 }}
                      >
                        {s.comment}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
