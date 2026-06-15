import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getInstructor } from "../data/instructors";
import { SeatProgressBar } from "./Common";

export function CourseCard({ course }) {
  const instructor = getInstructor(course.instructorId);
  return <article className="course-card card">
    <Link to={`/masterclasses/${course.slug}`} className="card-image" style={{ backgroundImage: `url(${course.image})` }}><span>{course.status}</span><span>{course.price}</span></Link>
    <div className="card-body"><div className="eyebrow">{course.category}</div><h3><Link to={`/masterclasses/${course.slug}`}>{course.title}</Link></h3><p>{course.summary}</p><div className="instructor-mini"><img src={instructor.image} alt="" /><span><b>{instructor.name}</b><small>{course.date} · {course.time}</small></span></div><div className="card-bottom"><span>{course.registered.toLocaleString()} registered</span><Link to={`/masterclasses/${course.slug}`}>View details →</Link></div></div>
  </article>;
}

export function BootcampCard({ course }) {
  const instructor = getInstructor(course.instructorId);
  return <article className="course-card bootcamp-card card">
    <Link to={`/bootcamps/${course.slug}`} className="card-image" style={{ backgroundImage: `url(${course.image})` }}><span>{course.status}</span><span>Certificate</span></Link>
    <div className="card-body"><div className="chips static"><span className="chip">{course.duration}</span><span className="chip">{course.level}</span><span className="chip">{course.price}</span></div><h3><Link to={`/bootcamps/${course.slug}`}>{course.title}</Link></h3><p>{course.summary}</p><div className="instructor-mini"><img src={instructor.image} alt="" /><span><b>{instructor.name}</b><small>Starts {course.startDate}</small></span></div><SeatProgressBar value={course.status === "Waitlist" ? 100 : 72} /><Link className="button secondary" to={`/bootcamps/${course.slug}`}>View bootcamp</Link></div>
  </article>;
}

export function CourseRail({ title, courses }) {
  const railRef = useRef(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const timer = window.setInterval(() => {
      const rail = railRef.current;
      if (rail) {
        rail.scrollLeft += 1;
        if (rail.scrollLeft >= rail.scrollWidth / 2) rail.scrollLeft = 0;
      }
    }, 32);
    return () => window.clearInterval(timer);
  }, [paused]);

  return <section className="section section-tinted"><div className="section-heading"><div><div className="eyebrow">Popular this week</div><h2>{title}</h2></div><Link to="/masterclasses">Explore all →</Link></div><div className="course-rail auto-rail" ref={railRef} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={() => setPaused(false)}>{[...courses, ...courses].map((course, index) => <CourseCard key={`${course.slug}-${index}`} course={course} />)}</div></section>;
}

export function FeaturedMasterclass({ course }) {
  return <section className="featured">
    <div className="featured-image" style={{ backgroundImage: `url(${course.image})` }}><span className="badge">Featured live session</span></div>
    <div className="featured-copy"><div className="eyebrow">{course.category}</div><h2>{course.title}</h2><p>{course.overview}</p><div className="stat-row"><span><b>{course.registered.toLocaleString()}</b> learners registered</span><span><b>{course.date}</b> at {course.time}</span></div><Link className="button" to={`/masterclasses/${course.slug}`}>Reserve your seat →</Link></div>
  </section>;
}
