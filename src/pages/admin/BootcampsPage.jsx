import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { deleteBootcamp, getAdminBootcamps, updateBootcampStatus } from "../../lib/api";

export default function AdminBootcampsPage() {
  const [status, setStatus] = useState("");
  const [courses, setCourses] = useState([]);
  const [error, setError] = useState("");

  const load = () => {
    getAdminBootcamps({ status })
      .then((data) => setCourses(data))
      .catch((requestError) => setError(requestError.message || "Could not load bootcamps."));
  };

  useEffect(load, [status]);

  const togglePublish = async (course) => {
    try {
      await updateBootcampStatus(course.id, course.visibilityStatus === "published" ? "draft" : "published");
      load();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const remove = async (id) => {
    try {
      await deleteBootcamp(id);
      load();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <>
      <div className="admin-header">
        <div>
          <div className="eyebrow">Admin</div>
          <h1>Bootcamps</h1>
        </div>
        <Link className="button" to="/admin/bootcamps/new">+ New bootcamp</Link>
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="admin-filters">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr><th>Title</th><th>Category</th><th>Teacher</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {courses.map((course) => (
              <tr key={course.id}>
                <td>{course.title}</td>
                <td>{course.category || "—"}</td>
                <td>{course.instructor?.name || course.instructorId || "—"}</td>
                <td><span className={`status-badge ${course.visibilityStatus}`}>{course.visibilityStatus}</span></td>
                <td className="actions">
                  <Link className="link-button" to={`/admin/bootcamps/${course.id}`}>Edit</Link>
                  <button type="button" className="link-button" onClick={() => togglePublish(course)}>
                    {course.visibilityStatus === "published" ? "Unpublish" : "Publish"}
                  </button>
                  <button type="button" className="link-button" onClick={() => remove(course.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {courses.length === 0 && <tr><td colSpan={5}>No bootcamps yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
