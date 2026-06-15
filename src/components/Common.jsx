import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getInstructor } from "../data/instructors";

export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    const nodes = document.querySelectorAll("main > section, .content-section, .course-card, .page-header, .filter-panel");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      nodes.forEach((node) => node.classList.add("revealed"));
      return;
    }
    nodes.forEach((node) => node.classList.add("scroll-reveal"));
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -40px" });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [pathname]);
  return null;
}

export function SearchBar({ value, onChange, placeholder = "Search courses, skills, or instructors..." }) {
  return <label className="search-bar"><span>⌕</span><input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} /></label>;
}

export function CategoryFilter({ categories, active, onChange }) {
  return <div className="chips">{categories.map((category) => <button className={active === category ? "chip active" : "chip"} key={category} onClick={() => onChange(category)}>{category}</button>)}</div>;
}

export function VideoThumbnail({ image, label = "Preview lesson", large = false }) {
  return <div className={large ? "video-thumb large" : "video-thumb"} style={{ backgroundImage: `url(${image})` }}><span className="video-label">{label}</span><span className="play">▶</span></div>;
}

export function CountdownBadge() {
  return <div className="countdown"><span><b>02</b>Days</span><span><b>14</b>Hours</span></div>;
}

export function SeatProgressBar({ value = 84 }) {
  return <div className="seat-progress" style={{ "--seat-fill": `${value}%` }}><div><span>Seats filling</span><strong>{value}%</strong></div><div className="progress-track"><span /></div></div>;
}

export function RegistrationForm({ item, type = "masterclass", compact = false }) {
  const navigate = useNavigate();
  const submit = (event) => {
    event.preventDefault();
    navigate("/registration-success", { state: { item, type } });
  };
  return <form className={compact ? "registration-form compact" : "registration-form"} onSubmit={submit}>
    <label>Full name<input required placeholder="Your full name" /></label>
    <label>Work email<input required type="email" placeholder="you@company.com" /></label>
    {!compact && <label>WhatsApp (optional)<input placeholder="+91 00000 00000" /></label>}
    <button className="button" type="submit">{type === "bootcamp" ? "Enroll / join waitlist" : `Register ${item.price === "Free" ? "for free" : "now"}`} →</button>
  </form>;
}

export function StickyRegistrationCard({ item, type = "masterclass" }) {
  return <aside className="sticky-registration card">
    <div className="eyebrow">{type === "bootcamp" ? "Cohort enrollment" : "Masterclass access"}</div>
    <div className="registration-head"><h3>{item.price}</h3><CountdownBadge /></div>
    <SeatProgressBar />
    <RegistrationForm item={item} type={type} />
    <small>Secure registration. No payment is collected in this demo.</small>
  </aside>;
}

export function FAQAccordion({ items }) {
  const [open, setOpen] = useState(0);
  return <div className="accordion">{items.map((item, index) => {
    const isOpen = open === index;
    return <div className={isOpen ? "accordion-item open" : "accordion-item"} key={item.q}><button aria-expanded={isOpen} onClick={() => setOpen(isOpen ? -1 : index)}><span>{item.q}</span><span className="accordion-icon">+</span></button><div className="accordion-panel"><p>{item.a}</p></div></div>;
  })}</div>;
}

export function MobileRegistrationCTA({ label = "Reserve your seat" }) {
  const scrollToForm = () => document.getElementById("mobile-registration")?.scrollIntoView({ behavior: "smooth", block: "start" });
  return <button className="mobile-registration-cta" onClick={scrollToForm}>{label} <span>→</span></button>;
}

export function InstructorCard({ instructorId, detailed = false }) {
  const instructor = getInstructor(instructorId);
  return <div className="instructor-card card"><img src={instructor.image} alt={instructor.name} /><div><h3>{instructor.name}</h3><strong>{instructor.role}</strong>{detailed && <p>{instructor.bio}</p>}<Link to="/contact">Contact support →</Link></div></div>;
}

export function NotFoundPage({ title = "This page stepped out for a class." }) {
  return <main className="center-page"><div className="eyebrow">404 / Not found</div><h1>{title}</h1><p>We couldn’t find what you were looking for, but there is plenty worth learning next.</p><Link className="button" to="/masterclasses">Explore masterclasses</Link></main>;
}
