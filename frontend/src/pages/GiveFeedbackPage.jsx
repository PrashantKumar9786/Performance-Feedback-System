import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { feedbackApi } from '../api';

export default function GiveFeedbackPage() {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const [payload, setPayload] = useState(null);
  const [scores, setScores] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    feedbackApi
      .getSubmission(employeeId)
      .then((data) => {
        setPayload(data);
        const initial = {};
        data.parameters.forEach((p) => {
          const existing = data.submission?.scores?.find(
            (s) => s.parameterId === p.id
          );
          initial[p.id] = {
            score: existing?.score ?? null,
            comment: existing?.comment ?? '',
          };
        });
        setScores(initial);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [employeeId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const body = {
        employeeId,
        scores: Object.entries(scores).map(([parameterId, value]) => ({
          parameterId,
          score: value.score,
          comment: value.comment,
        })),
      };
      await feedbackApi.submit(body);
      navigate('/app/team');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="muted">Loading form…</p>;
  if (!payload && error) return <p className="error-text">{error}</p>;

  return (
    <>
      <div className="page-header">
        <div>
          <p className="muted" style={{ marginBottom: '0.35rem' }}>
            <Link to="/app/team">← Back to team</Link>
          </p>
          <h1>{payload.employee.name}</h1>
          <p>
            {payload.employee.title || 'Team member'} · {payload.cycle.label}
          </p>
        </div>
      </div>

      <form className="panel panel-pad" onSubmit={handleSubmit}>
        {payload.parameters.map((param) => (
          <div className="score-row" key={param.id}>
            <div>
              <strong>{param.name}</strong>
              <p className="muted" style={{ marginTop: '0.25rem' }}>
                {param.description}
              </p>
            </div>
            <div className="score-pills" role="group" aria-label={`${param.name} score`}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`score-pill ${
                    scores[param.id]?.score === n ? 'active' : ''
                  }`}
                  onClick={() =>
                    setScores((prev) => ({
                      ...prev,
                      [param.id]: { ...prev[param.id], score: n },
                    }))
                  }
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor={`comment-${param.id}`}>Why this score?</label>
              <textarea
                id={`comment-${param.id}`}
                rows={3}
                required
                placeholder="Explain the rating with a concrete example…"
                value={scores[param.id]?.comment || ''}
                onChange={(e) =>
                  setScores((prev) => ({
                    ...prev,
                    [param.id]: { ...prev[param.id], comment: e.target.value },
                  }))
                }
              />
            </div>
          </div>
        ))}

        {error ? <p className="error-text">{error}</p> : null}

        <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem' }}>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Submit feedback'}
          </button>
          <Link className="btn btn-ghost" to="/app/team">
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}
