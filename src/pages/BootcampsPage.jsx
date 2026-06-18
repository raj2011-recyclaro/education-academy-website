import { useEffect, useMemo, useState } from "react";
import { CategoryFilter } from "../components/Common";
import { BootcampCard } from "../components/CourseCards";
import { bootcamps as fallbackBootcamps } from "../data/bootcamps";
import { getBootcamps, joinWaitlist } from "../lib/api";

export default function BootcampsPage() {
  const [courses, setCourses] = useState(fallbackBootcamps);
  const [category, setCategory] = useState("All programs");
  const [loading, setLoading] = useState(true);
  const [waitlistStatus, setWaitlistStatus] = useState("");

  useEffect(() => {
    let active = true;
    getBootcamps()
      .then((data) => {
        if (active) setCourses(data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(
    () => ["All programs", ...new Set(courses.map((item) => item.category))],
    [courses],
  );

  const results = courses.filter(
    (item) => category === "All programs" || item.category === category,
  );

  const submitWaitlist = async (event) => {
    event.preventDefault();
    setWaitlistStatus("Joining...");
    const formData = new FormData(event.currentTarget);
    try {
      await joinWaitlist({
        email: formData.get("email"),
        interest: "Upcoming bootcamp pathways",
      });
      setWaitlistStatus("You're on the waitlist. We'll send updates soon.");
      event.currentTarget.reset();
    } catch (error) {
      setWaitlistStatus(error.message || "Could not join the waitlist.");
    }
  };

  return (
    <main>
      <section className="bootcamp-hero">
        <div className="eyebrow">Mentor-led cohorts</div>
        <h1>Advanced bootcamps for ambitious builders.</h1>
        <p>
          Rigorous programs, meaningful projects, and feedback from experienced
          practitioners. Built for career acceleration, not content consumption.
        </p>
        <div className="program-stats">
          <span><b>8-12</b> weeks</span>
          <span><b>1:8</b> mentor ratio</span>
          <span><b>3</b> portfolio projects</span>
        </div>
      </section>
      <section className="section listing-page">
        <div className="filter-panel">
          <CategoryFilter categories={categories} active={category} onChange={setCategory} />
        </div>
        {loading && <p className="loading-note">Loading cohort pathways...</p>}
        <div className="grid three">
          {results.map((course) => (
            <BootcampCard key={course.slug} course={course} />
          ))}
        </div>
        <div className="waitlist-panel">
          <div>
            <div className="eyebrow">More pathways are coming</div>
            <h2>Product leadership and data strategy cohorts are in development.</h2>
            <p>
              Tell us what you want to learn and we'll let you know when
              applications open.
            </p>
          </div>
          <form onSubmit={submitWaitlist}>
            <input type="email" name="email" required placeholder="Work email" />
            <button className="button" type="submit">Join pathway waitlist</button>
            {waitlistStatus && <small className="form-status">{waitlistStatus}</small>}
          </form>
        </div>
      </section>
    </main>
  );
}
