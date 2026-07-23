import { useEffect, useState } from "react";
import { getAdminUsers, updateUserRole, updateUserStatus } from "../../lib/api";

export default function AdminUsersPage() {
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const load = () => {
    getAdminUsers({ role, status, search, page })
      .then((data) => setResult(data))
      .catch((requestError) => setError(requestError.message || "Could not load users."));
  };

  useEffect(load, [role, status, search, page]);

  const changeRole = async (id, newRole) => {
    try {
      await updateUserRole(id, newRole);
      load();
    } catch (requestError) {
      setError(requestError.message || "Could not update role.");
    }
  };

  const changeStatus = async (id, newStatus) => {
    try {
      await updateUserStatus(id, newStatus);
      load();
    } catch (requestError) {
      setError(requestError.message || "Could not update status.");
    }
  };

  return (
    <>
      <div className="admin-header">
        <div>
          <div className="eyebrow">Admin</div>
          <h1>Users</h1>
        </div>
      </div>
      <div className="admin-filters">
        <input placeholder="Search name or email" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} />
        <select value={role} onChange={(e) => { setPage(1); setRole(e.target.value); }}>
          <option value="">All roles</option>
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
          <option value="admin">Admin</option>
        </select>
        <select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {result?.data?.map((user) => (
              <tr key={user.id}>
                <td>{user.fullName || "—"}</td>
                <td>{user.email}</td>
                <td><span className={`status-badge ${user.role}`}>{user.role}</span></td>
                <td><span className={`status-badge ${user.status}`}>{user.status}</span></td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td className="actions">
                  <select value={user.role} onChange={(e) => changeRole(user.id, e.target.value)}>
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => changeStatus(user.id, user.status === "active" ? "suspended" : "active")}
                  >
                    {user.status === "active" ? "Suspend" : "Reactivate"}
                  </button>
                </td>
              </tr>
            ))}
            {result?.data?.length === 0 && (
              <tr><td colSpan={6}>No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {result?.pagination && (
        <div className="admin-pagination">
          <button className="link-button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Previous</button>
          <span>Page {result.pagination.page} of {result.pagination.totalPages}</span>
          <button className="link-button" disabled={page >= result.pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next →</button>
        </div>
      )}
    </>
  );
}
