import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getInstructor } from "../data/instructors";
import { createRegistration } from "../lib/api";

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
  return <div className="chips">{categories.map((category) => {
    const option = typeof category === "string"
      ? { label: category, value: category }
      : {
        label: category.label || category.name || category.slug,
        value: category.value || category.slug || category.name,
      };
    return <button className={active === option.value ? "chip active" : "chip"} key={option.value} onClick={() => onChange(option.value)}>{option.label}</button>;
  })}</div>;
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const formData = new FormData(event.currentTarget);
    try {
      const registration = await createRegistration({
        fullName: formData.get("fullName"),
        email: formData.get("email"),
        whatsapp: formData.get("whatsapp") || "",
        itemSlug: item.slug,
        itemTitle: item.title,
        itemType: type,
      });
      navigate("/registration-success", { state: { item, type, registration } });
    } catch (requestError) {
      setError(requestError.message || "Registration could not be completed.");
    } finally {
      setSubmitting(false);
    }
  };
  return <form className={compact ? "registration-form compact" : "registration-form"} onSubmit={submit}>
    <label>Full name<input required name="fullName" placeholder="Your full name" /></label>
    <label>Work email<input required name="email" type="email" placeholder="you@company.com" /></label>
    {!compact && <label>WhatsApp (optional)<input name="whatsapp" placeholder="+91 00000 00000" /></label>}
    {error && <p className="form-error">{error}</p>}
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

function truncateBio(bio, ratio = 0.5) {
  if (!bio) return { short: "", needsToggle: false };
  const cutoff = Math.floor(bio.length * ratio);
  if (cutoff >= bio.length) return { short: bio, needsToggle: false };
  const sentenceEnd = bio.indexOf(". ", cutoff);
  const short = sentenceEnd === -1 ? bio.slice(0, cutoff) : bio.slice(0, sentenceEnd + 1);
  return { short, needsToggle: short.length < bio.length };
}

export function InstructorCard({ instructorId, detailed = false }) {
  const instructor = getInstructor(instructorId);
  const [expanded, setExpanded] = useState(false);
  const highlights = instructor.highlights?.length ? instructor.highlights : instructor.credentials?.slice(0, 5);
  const { short, needsToggle } = truncateBio(instructor.bio);
  return <div className="instructor-card card"><img src={instructor.image} alt={instructor.name} /><div><h3>{instructor.name}</h3><strong>{instructor.role}</strong>
    {detailed && <p>{expanded || !needsToggle ? instructor.bio : `${short}…`}</p>}
    {detailed && needsToggle && <button type="button" className="read-more-toggle" onClick={() => setExpanded(!expanded)}>{expanded ? "Read less" : "Read more"}</button>}
    {detailed && highlights?.length > 0 && <div className="chips static">{highlights.map((item) => <span className="chip" key={item}>{item}</span>)}</div>}
    <Link to="/contact">Contact support →</Link>
  </div></div>;
}

export function NotFoundPage({ title = "This page stepped out for a class." }) {
  return <main className="center-page"><div className="eyebrow">404 / Not found</div><h1>{title}</h1><p>We couldn’t find what you were looking for, but there is plenty worth learning next.</p><Link className="button" to="/masterclasses">Explore masterclasses</Link></main>;
}
