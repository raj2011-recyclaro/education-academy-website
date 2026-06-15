import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { masterclasses } from "../data/masterclasses";
import { bootcamps } from "../data/bootcamps";
import { instructors } from "../data/instructors";
import { CategoryFilter, FAQAccordion, InstructorCard, SearchBar } from "../components/Common";
import { BootcampCard, CourseRail, FeaturedMasterclass } from "../components/CourseCards";

export default function HomePage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All topics");
  const discover = () => navigate(`/masterclasses?search=${encodeURIComponent(query)}&category=${encodeURIComponent(category)}`);
  return <main>
    <section className="hero section">
      <div className="hero-copy"><div className="eyebrow">Live learning, thoughtfully designed</div><h1>Learn from experts. Build skills that move you forward.</h1><p>Join focused live masterclasses and mentor-led bootcamps built for ambitious professionals who want more than passive watching.</p><div className="hero-actions"><Link className="button" to="/masterclasses">Explore masterclasses</Link><Link className="button secondary" to="/bootcamps">View bootcamps</Link></div><div className="trust-line"><span>4.9/5 learner rating</span><span>35k+ learning hours</span><span>32 expert instructors</span></div></div>
      <div className="course-wall">{masterclasses.slice(0, 5).map((course, index) => <Link key={course.slug} to={`/masterclasses/${course.slug}`} className={`wall-card wall-${index + 1}`} style={{ backgroundImage: `url(${course.image})` }}><span>{course.category}</span><strong>{course.title}</strong></Link>)}</div>
    </section>

    <section className="discovery section"><div><div className="eyebrow">Find your next leap</div><h2>What do you want to learn?</h2></div><SearchBar value={query} onChange={setQuery} /><CategoryFilter categories={["All topics", "Artificial Intelligence", "Finance", "Product Strategy", "Engineering"]} active={category} onChange={setCategory} /><button className="button" onClick={discover}>Discover classes</button></section>
    <FeaturedMasterclass course={masterclasses[0]} />
    <CourseRail title="Trending live masterclasses" courses={masterclasses.slice(1, 5)} />

    <section className="section"><div className="section-heading"><div><div className="eyebrow">Cohort pathways</div><h2>Go deep with a bootcamp</h2></div><Link to="/bootcamps">Explore bootcamps →</Link></div><div className="grid three">{bootcamps.map((course) => <BootcampCard key={course.slug} course={course} />)}</div></section>

    <section className="section instructor-spotlight"><div><div className="eyebrow">Instructor spotlight</div><h2>Learn with people who have done the work.</h2><p>Every Academy instructor pairs deep domain experience with a practical, generous teaching style.</p><Link className="button secondary" to="/become-instructor">Teach at Academy</Link></div><InstructorCard instructorId={instructors[0].id} detailed /></section>

    <section className="section social-proof"><div className="section-heading"><div><div className="eyebrow">Learner stories</div><h2>Small rooms. Serious progress.</h2></div></div><div className="grid three">{[
      ["The live teardown gave me a framework I used at work the very next morning.", "Ananya S.", "Product Lead"],
      ["It felt closer to a great workshop than another online course I would never finish.", "Rohan M.", "Data Analyst"],
      ["My capstone became the strongest project in my engineering portfolio.", "Meera K.", "Software Engineer"],
    ].map(([quote, name, role]) => <blockquote className="quote-card card" key={name}><span>“</span><p>{quote}</p><footer><b>{name}</b><small>{role}</small></footer></blockquote>)}</div></section>

    <section className="section how-it-works"><div className="section-heading"><div><div className="eyebrow">A better learning rhythm</div><h2>How it works</h2></div></div><div className="grid three">{[["01", "Choose a focused session", "Start with one practical question or commit to a deeper cohort."], ["02", "Learn live and build", "Ask questions, practice with peers, and receive useful feedback."], ["03", "Apply it immediately", "Leave with a framework, project, or artifact you can use."]].map(([n, title, copy]) => <div className="step" key={n}><span>{n}</span><h3>{title}</h3><p>{copy}</p></div>)}</div></section>

    <section className="section faq-section"><div><div className="eyebrow">Questions, answered</div><h2>FAQ</h2><p>Everything you need to know before your first live session.</p></div><FAQAccordion items={[{ q: "Are masterclasses really live?", a: "Yes. Most sessions happen live and include time for questions, workshops, or critique." }, { q: "Do I need prior experience?", a: "Each listing clearly states the expected level. Many masterclasses are beginner-friendly." }, { q: "What happens after I register?", a: "You receive a confirmation and reminder details. This frontend demo keeps that flow on-device." }]} /></section>

    <section className="final-cta"><div className="eyebrow">Your next chapter can start small</div><h2>One live session could change how you work.</h2><p>Join thousands of thoughtful learners building future-relevant skills.</p><Link className="button light" to="/masterclasses">Find your masterclass →</Link></section>
  </main>;
}
