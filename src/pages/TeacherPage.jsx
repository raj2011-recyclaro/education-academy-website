import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../components/Auth";
import { getTeacherCourses } from "../lib/api";

export default function TeacherPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getTeacherCourses()
      .then((data) => {
        if (active) setCourses(data);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || "Could not load your courses.");
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="section">
      <div className="section-heading">
        <div>
          <div className="eyebrow">Teacher</div>
          <h1>My teaching{user?.fullName ? `, ${user.fullName.split(" ")[0]}` : ""}</h1>
        </div>
      </div>
      <p>
        These are the courses UpSkillr.in admins have attributed to you. Course creation and editing
        is managed by the admin team for now — reach out via <Link to="/contact">Contact</Link> for changes.
      </p>
      {error && <p className="form-error">{error}</p>}
      {courses === null && !error && <p className="loading-note">Loading your courses…</p>}

      {courses && (
        <>
          <h2 style={{ marginTop: 32 }}>Bootcamps</h2>
          {courses.bootcamps.length === 0 && <p className="field-hint">No bootcamps attributed to you yet.</p>}
          <div className="grid three">
            {courses.bootcamps.map((course) => (
              <article className="course-card card" key={course.slug}>
                <div className="card-body">
                  <div className="eyebrow">{course.category}</div>
                  <h3><Link to={`/bootcamps/${course.slug}`}>{course.title}</Link></h3>
                  <p>{course.summary}</p>
                  <span className={`status-badge ${course.visibilityStatus}`}>{course.visibilityStatus}</span>
                </div>
              </article>
            ))}
          </div>

          <h2 style={{ marginTop: 40 }}>Masterclasses</h2>
          {courses.masterclasses.length === 0 && <p className="field-hint">No masterclasses attributed to you yet.</p>}
          <div className="grid three">
            {courses.masterclasses.map((course) => (
              <article className="course-card card" key={course.slug}>
                <div className="card-body">
                  <div className="eyebrow">{course.category}</div>
                  <h3><Link to={`/masterclasses/${course.slug}`}>{course.title}</Link></h3>
                  <p>{course.summary}</p>
                  <span className={`status-badge ${course.visibilityStatus}`}>{course.visibilityStatus}</span>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
