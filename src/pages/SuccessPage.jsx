import { Link, useLocation } from "react-router-dom";
import { BootcampCard, CourseCard } from "../components/CourseCards";
import { bootcamps } from "../data/bootcamps";
import { masterclasses } from "../data/masterclasses";

export default function SuccessPage() {
  const { state } = useLocation();
  const item = state?.item;
  const type = state?.type;
  const registration = state?.registration;

  return (
    <main className="success-page section">
      <div className="success-mark">✓</div>
      <div className="eyebrow">Registration confirmed</div>
      <h1>You're in.</h1>
      <p>
        {item
          ? `Your place for ${item.title} is reserved.`
          : "No recent registration details were found, but you can still explore what is coming up."}
      </p>
      {item && (
        <div className="success-card card">
          <div>
            <div className="eyebrow">
              {type === "bootcamp" ? "Upcoming cohort" : "Upcoming session"}
            </div>
            <h2>{item.title}</h2>
            {registration?.id && <small>Confirmation ID: {registration.id}</small>}
          </div>
          <div>
            <b>{item.date || item.startDate}</b>
            <span>{item.time || item.duration}</span>
          </div>
          <button className="button secondary">Add to calendar</button>
          <button className="button">WhatsApp reminder</button>
        </div>
      )}
      <div className="success-actions">
        <Link to="/masterclasses">Browse masterclasses →</Link>
        <Link to="/bootcamps">Explore bootcamps →</Link>
      </div>
      <section className="related">
        <div className="section-heading">
          <div>
            <div className="eyebrow">Keep learning</div>
            <h2>Recommended next</h2>
          </div>
        </div>
        <div className="grid three">
          {type === "bootcamp"
            ? masterclasses.slice(0, 3).map((course) => (
              <CourseCard key={course.slug} course={course} />
            ))
            : bootcamps.map((course) => <BootcampCard key={course.slug} course={course} />)}
        </div>
      </section>
    </main>
  );
}
