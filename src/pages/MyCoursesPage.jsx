import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../components/Auth";
import { bootcamps } from "../data/bootcamps";
import { masterclasses } from "../data/masterclasses";
import { cancelEnrollment, getMyEnrollments } from "../lib/api";

function findCourse(courseType, courseSlug) {
  const catalog = courseType === "bootcamp" ? bootcamps : masterclasses;
  return catalog.find((course) => course.slug === courseSlug);
}

export default function MyCoursesPage() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getMyEnrollments()
      .then((data) => {
        if (active) setEnrollments(data);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || "Could not load your courses.");
      });
    return () => {
      active = false;
    };
  }, []);

  const cancel = async (id) => {
    try {
      await cancelEnrollment(id);
      setEnrollments((current) => current.filter((item) => item.id !== id));
    } catch (requestError) {
      setError(requestError.message || "Could not cancel that enrollment.");
    }
  };

  return (
    <main className="section">
      <div className="section-heading">
        <div>
          <div className="eyebrow">Welcome back{user?.fullName ? `, ${user.fullName.split(" ")[0]}` : ""}</div>
          <h1>My courses</h1>
        </div>
        <Link to="/bootcamps">Browse more courses →</Link>
      </div>

      {error && <p className="form-error">{error}</p>}

      {enrollments === null && !error && <p className="loading-note">Loading your courses…</p>}

      {enrollments?.length === 0 && (
        <div className="empty-state">
          <h2>You haven't opted into any course yet.</h2>
          <p>Browse masterclasses and bootcamps and enroll to see them here.</p>
          <Link className="button" to="/masterclasses">Explore masterclasses</Link>
        </div>
      )}

      {enrollments?.length > 0 && (
        <div className="grid three">
          {enrollments.map((enrollment) => {
            const course = findCourse(enrollment.courseType, enrollment.courseSlug);
            return (
              <article className="course-card card" key={enrollment.id}>
                <div className="card-body">
                  <div className="eyebrow">{enrollment.courseType}</div>
                  <h3>
                    {course
                      ? <Link to={`/${enrollment.courseType === "bootcamp" ? "bootcamps" : "masterclasses"}/${enrollment.courseSlug}`}>{course.title}</Link>
                      : enrollment.courseSlug}
                  </h3>
                  {course?.summary && <p>{course.summary}</p>}
                  <div className="card-bottom">
                    <span>Enrolled {new Date(enrollment.enrolledAt).toLocaleDateString()}</span>
                    <button type="button" className="link-button" onClick={() => cancel(enrollment.id)}>Cancel</button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
