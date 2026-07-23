import { useEffect, useState } from "react";
import { downloadApplicationResume, getAdminApplications, promoteApplication, updateApplicationStatus } from "../../lib/api";

export default function AdminApplicationsPage() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const downloadResume = async (application) => {
    try {
      await downloadApplicationResume(application.id, application.resumeFileName);
    } catch (requestError) {
      setError(requestError.message || "Could not download resume.");
    }
  };

  const load = () => {
    getAdminApplications({ status, page })
      .then((data) => setResult(data))
      .catch((requestError) => setError(requestError.message || "Could not load applications."));
  };

  useEffect(load, [status, page]);

  const changeStatus = async (id, newStatus) => {
    try {
      await updateApplicationStatus(id, newStatus);
      load();
    } catch (requestError) {
      setError(requestError.message || "Could not update status.");
    }
  };

  const promote = async (id) => {
    setError("");
    setMessage("");
    try {
      await promoteApplication(id);
      setMessage("Promoted to teacher.");
      load();
    } catch (requestError) {
      setError(requestError.message || "Could not promote this applicant.");
    }
  };

  return (
    <>
      <div className="admin-header">
        <div>
          <div className="eyebrow">Admin</div>
          <h1>Instructor applications</h1>
        </div>
      </div>
      <div className="admin-filters">
        <select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
          <option value="">All statuses</option>
          <option value="new">New</option>
          <option value="reviewed">Reviewed</option>
          <option value="archived">Archived</option>
        </select>
      </div>
      {error && <p className="form-error">{error}</p>}
      {message && <p className="form-status">{message}</p>}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Topic</th>
              <th>Status</th>
              <th>Applied</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {result?.data?.map((application) => (
              <tr key={application.id}>
                <td>{application.fullName}</td>
                <td>{application.email}</td>
                <td>{application.topic}</td>
                <td><span className={`status-badge ${application.status}`}>{application.status}</span></td>
                <td>{new Date(application.createdAt).toLocaleDateString()}</td>
                <td className="actions">
                  <select value={application.status} onChange={(e) => changeStatus(application.id, e.target.value)}>
                    <option value="new">New</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="archived">Archived</option>
                  </select>
                  {application.resumeFileName && (
                    <button type="button" className="link-button" onClick={() => downloadResume(application)}>Resume</button>
                  )}
                  {application.promotedUserId ? (
                    <span className="status-badge teacher">Promoted</span>
                  ) : (
                    <button type="button" className="link-button" onClick={() => promote(application.id)}>Promote to teacher</button>
                  )}
                </td>
              </tr>
            ))}
            {result?.data?.length === 0 && (
              <tr><td colSpan={6}>No applications found.</td></tr>
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
