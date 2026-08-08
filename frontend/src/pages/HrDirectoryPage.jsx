import { useEffect, useState } from 'react';
import { hrApi } from '../api';

export default function HrDirectoryPage() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    hrApi
      .directory()
      .then((res) => setUsers(res.users))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="muted">Loading directory…</p>;
  if (error) return <p className="error-text">{error}</p>;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Company directory</h1>
          <p>
            Org reporting lines that drive who can give feedback to whom.
          </p>
        </div>
      </div>

      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Reports to</th>
              <th>Direct reports</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <strong>{u.name}</strong>
                  <div className="muted" style={{ fontSize: '0.82rem' }}>
                    {u.title || u.email}
                  </div>
                </td>
                <td>{u.role}</td>
                <td>{u.manager?.name || '—'}</td>
                <td>{u.directReportCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
