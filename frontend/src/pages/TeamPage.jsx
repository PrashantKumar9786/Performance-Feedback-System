import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { feedbackApi } from "../api";

export default function TeamPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    feedbackApi
      .team()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="muted">Loading your team…</p>;
  if (error) return <p className="error-text">{error}</p>;

  const pending = data.team.filter(
    (m) => m.feedbackStatus === "PENDING",
  ).length;
  const done = data.team.length - pending;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Share feedback</h1>
          <p>
            Review your team across five parameters and share your feedback.
          </p>
        </div>
        {data.cycle ? (
          <span className="badge badge-ok">Month · {data.cycle.label}</span>
        ) : (
          <span className="badge badge-warn">No open cycle</span>
        )}
      </div>

      <div
        className="stat-row"
        style={{ gridTemplateColumns: "repeat(3, 1fr)" }}
      >
        <div className="stat">
          <div className="label">Managed Employees</div>
          <div className="value">{data.team.length}</div>
        </div>
        <div className="stat1">
          <div className="label">Submitted</div>
          <div className="value">{done}</div>
        </div>
        <div className="stat2">
          <div className="label">Pending</div>
          <div className="value">{pending}</div>
        </div>
      </div>

      <div className="panel">
        {data.team.length === 0 ? (
          <div className="empty">
            You have no direct reports, so there is no feedback to give.
            <br />
            Switch to <Link to="/app/history">My scores</Link> to track feedback
            you receive.
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Team member</th>
                <th>Title</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.team.map((member) => (
                <tr key={member.id}>
                  <td>
                    <strong>{member.name}</strong>
                    <div className="muted" style={{ fontSize: "0.82rem" }}>
                      {member.email}
                    </div>
                  </td>
                  <td>{member.title || "—"}</td>
                  <td>
                    <span
                      className={`badge ${
                        member.feedbackStatus === "SUBMITTED"
                          ? "badge-ok"
                          : "badge-warn"
                      }`}
                    >
                      {member.feedbackStatus === "SUBMITTED"
                        ? "Submitted"
                        : "Pending"}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <Link
                      className="btn btn-primary"
                      to={`/app/give/${member.id}`}
                      style={{ display: "inline-block" }}
                    >
                      {member.feedbackStatus === "SUBMITTED" ? "Edit" : "Write"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
