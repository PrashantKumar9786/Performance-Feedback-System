import { useEffect, useState } from 'react';
import { hrApi } from '../api';

export default function HrCompletionPage() {
  const [cycles, setCycles] = useState([]);
  const [cycleId, setCycleId] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    hrApi
      .cycles()
      .then((res) => {
        setCycles(res.cycles);
        const open = res.cycles.find((c) => c.status === 'OPEN');
        setCycleId(open?.id || res.cycles[0]?.id || '');
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!cycleId) return;
    setLoading(true);
    hrApi
      .completion(cycleId)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [cycleId]);

  if (error && !data) return <p className="error-text">{error}</p>;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Monthly completion</h1>
          <p>
            See which managers still owe feedback for their direct reports this
            cycle.
          </p>
        </div>
        <select
          value={cycleId}
          onChange={(e) => setCycleId(e.target.value)}
          style={{
            border: '1px solid var(--line)',
            borderRadius: 10,
            padding: '0.55rem 0.75rem',
            minWidth: 180,
          }}
        >
          {cycles.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label} {c.status === 'OPEN' ? '(open)' : ''}
            </option>
          ))}
        </select>
      </div>

      {loading || !data ? (
        <p className="muted">Loading completion board…</p>
      ) : (
        <>
          <div className="stat-row">
            <div className="stat">
              <div className="label">Expected reviews</div>
              <div className="value">{data.summary.expected}</div>
            </div>
            <div className="stat">
              <div className="label">Completed</div>
              <div className="value">{data.summary.completed}</div>
            </div>
            <div className="stat">
              <div className="label">Pending</div>
              <div className="value">{data.summary.pending}</div>
            </div>
            <div className="stat">
              <div className="label">Completion rate</div>
              <div className="value">{data.summary.completionRate}%</div>
            </div>
          </div>

          <div className="grid-2">
            <div className="panel">
              <div className="panel-pad" style={{ borderBottom: '1px solid var(--line)' }}>
                <strong>Managers</strong>
                <p className="muted" style={{ marginTop: 4, fontSize: '0.88rem' }}>
                  {data.summary.managersComplete}/{data.summary.managersTotal} managers
                  fully complete
                </p>
              </div>
              {data.managers.map((row) => (
                <div key={row.manager.id} className="list-item" style={{ alignItems: 'start' }}>
                  <div>
                    <strong>{row.manager.name}</strong>
                    <div className="muted" style={{ fontSize: '0.82rem' }}>
                      {row.manager.title || row.manager.role}
                    </div>
                    <div style={{ marginTop: '0.65rem', display: 'grid', gap: '0.35rem' }}>
                      {row.reports.map((r) => (
                        <div
                          key={r.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: '0.75rem',
                            fontSize: '0.9rem',
                          }}
                        >
                          <span>{r.name}</span>
                          <span
                            className={`badge ${
                              r.feedbackStatus === 'SUBMITTED'
                                ? 'badge-ok'
                                : 'badge-warn'
                            }`}
                          >
                            {r.feedbackStatus === 'SUBMITTED' ? 'Done' : 'Missing'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <span
                    className={`badge ${row.isComplete ? 'badge-ok' : 'badge-warn'}`}
                  >
                    {row.submittedCount}/{row.totalReports}
                  </span>
                </div>
              ))}
            </div>

            <div className="panel">
              <div className="panel-pad" style={{ borderBottom: '1px solid var(--line)' }}>
                <strong>Still outstanding</strong>
                <p className="muted" style={{ marginTop: 4, fontSize: '0.88rem' }}>
                  Who Kavita (or HR) should nudge this month
                </p>
              </div>
              {data.pending.length === 0 ? (
                <div className="empty">Everyone has submitted for this cycle.</div>
              ) : (
                data.pending.map((item) => (
                  <div
                    key={`${item.managerId}-${item.employeeId}`}
                    className="list-item"
                  >
                    <div>
                      <strong>{item.managerName}</strong>
                      <div className="muted" style={{ fontSize: '0.85rem' }}>
                        → {item.employeeName}
                      </div>
                    </div>
                    <span className="badge badge-warn">Pending</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
