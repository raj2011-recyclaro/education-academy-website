import { useState } from "react";
import { bootcamps } from "../data/bootcamps";
import { CategoryFilter } from "../components/Common";
import { BootcampCard } from "../components/CourseCards";

export default function BootcampsPage() {
  const [category, setCategory] = useState("All programs");
  const categories = ["All programs", ...new Set(bootcamps.map((item) => item.category))];
  const results = bootcamps.filter((item) => category === "All programs" || item.category === category);
  return <main><section className="bootcamp-hero"><div className="eyebrow">Mentor-led cohorts</div><h1>Advanced bootcamps for ambitious builders.</h1><p>Rigorous programs, meaningful projects, and feedback from experienced practitioners. Built for career acceleration, not content consumption.</p><div className="program-stats"><span><b>8–12</b> weeks</span><span><b>1:8</b> mentor ratio</span><span><b>3</b> portfolio projects</span></div></section><section className="section listing-page"><div className="filter-panel"><CategoryFilter categories={categories} active={category} onChange={setCategory} /></div><div className="grid three">{results.map((course) => <BootcampCard key={course.slug} course={course} />)}</div><div className="waitlist-panel"><div><div className="eyebrow">More pathways are coming</div><h2>Product leadership and data strategy cohorts are in development.</h2><p>Tell us what you want to learn and we’ll let you know when applications open.</p></div><form onSubmit={(e) => e.preventDefault()}><input type="email" required placeholder="Work email" /><button className="button">Join pathway waitlist</button></form></div></section></main>;
}
