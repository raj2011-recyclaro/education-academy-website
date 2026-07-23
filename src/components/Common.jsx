import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getInstructor } from "../data/instructors";
import { createRegistration } from "../lib/api";

export function WhatsAppFloat() {
  const number = import.meta.env.VITE_WHATSAPP_NUMBER;
  if (!number) return null;
  const message = import.meta.env.VITE_WHATSAPP_MESSAGE || "";
  const href = `https://wa.me/${number}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
  return (
    <a className="whatsapp-float" href={href} target="_blank" rel="noopener noreferrer" aria-label="Chat with us on WhatsApp">
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12.04 2.003c-5.514 0-9.997 4.483-9.997 9.997 0 1.762.464 3.479 1.345 4.99L2 22l5.223-1.372a9.955 9.955 0 0 0 4.816 1.226h.001c5.514 0 9.997-4.483 9.997-9.997 0-2.67-1.04-5.182-2.929-7.071a9.935 9.935 0 0 0-7.068-2.783zm0 1.8a8.15 8.15 0 0 1 5.79 2.4 8.15 8.15 0 0 1 2.4 5.79c0 4.517-3.677 8.194-8.194 8.194a8.163 8.163 0 0 1-4.166-1.14l-.299-.177-3.1.813.828-3.023-.194-.31a8.14 8.14 0 0 1-1.264-4.357c0-4.517 3.677-8.19 8.199-8.19zm-4.518 4.66c-.176 0-.462.066-.704.331-.242.264-.924.902-.924 2.2s.947 2.553 1.078 2.73c.132.176 1.83 2.792 4.432 3.912.62.267 1.104.427 1.481.547.622.198 1.188.17 1.635.103.499-.075 1.535-.628 1.752-1.234.217-.606.217-1.126.152-1.234-.065-.109-.24-.176-.502-.308-.263-.132-1.535-.758-1.774-.845-.238-.088-.412-.132-.585.132-.174.264-.671.844-.822 1.017-.152.176-.303.198-.566.066-.264-.132-1.113-.41-2.12-1.308-.784-.699-1.313-1.562-1.466-1.826-.152-.264-.016-.407.116-.539.12-.119.264-.31.396-.464.132-.155.176-.264.264-.44.088-.176.044-.33-.022-.462-.066-.132-.585-1.412-.803-1.933-.211-.507-.427-.438-.585-.446-.152-.007-.328-.008-.503-.008z" />
      </svg>
    </a>
  );
}

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

// YouTube returns a 200 OK with a tiny 120x90 gray placeholder (not a 404)
// when maxresdefault.jpg doesn't exist for a video, so failure has to be
// detected by checking the loaded image's real dimensions, not onError.
function YoutubePosterButton({ youtubeId, image, label, className, onPlay }) {
  const maxres = `https://i.ytimg.com/vi/${youtubeId}/maxresdefault.jpg`;
  const hq = `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
  const [poster, setPoster] = useState(maxres);

  return (
    <button type="button" className={className} style={{ border: 0, cursor: "pointer", padding: 0 }} onClick={onPlay}>
      <img
        className="video-thumb-poster"
        src={poster}
        alt=""
        onLoad={(e) => {
          if (poster === maxres && e.currentTarget.naturalWidth <= 120) setPoster(hq);
        }}
        onError={() => setPoster(image)}
      />
      <span className="video-label">{label}</span>
      <span className="play">▶</span>
    </button>
  );
}

export function VideoThumbnail({ image, label = "Preview lesson", large = false, youtubeId }) {
  const [playing, setPlaying] = useState(false);
  const className = large ? "video-thumb large" : "video-thumb";

  if (youtubeId && playing) {
    return <div className={className}><iframe
      src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1`}
      title={label}
      allow="accelerated-video; autoplay; encrypted-media; picture-in-picture"
      allowFullScreen
    /></div>;
  }

  if (youtubeId) {
    return <YoutubePosterButton youtubeId={youtubeId} image={image} label={label} className={className} onPlay={() => setPlaying(true)} />;
  }

  return <div className={className} style={{ backgroundImage: `url(${image})` }}>
    <span className="video-label">{label}</span>
    <span className="play">▶</span>
  </div>;
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

export function InstructorCard({ instructorId, instructor: resolvedInstructor, detailed = false }) {
  const instructor = resolvedInstructor || getInstructor(instructorId);
  const highlights = (instructor.highlights?.length ? instructor.highlights : instructor.credentials)?.slice(0, 5);
  return <div className="instructor-card card">
    <div className="instructor-card-media">
      <img src={instructor.image} alt={instructor.name} />
      <span className="instructor-badge">Mentor</span>
    </div>
    <div className="instructor-card-body">
      <div className="eyebrow">Meet your mentor</div>
      <h3>{instructor.name}</h3>
      <strong>{instructor.role}</strong>
      {detailed && highlights?.length > 0 && <ul className="instructor-highlights">{highlights.map((item) => <li key={item}><span>✓</span>{item}</li>)}</ul>}
      <div className="instructor-contact">
        <Link to="/contact">Contact support →</Link>
      </div>
    </div>
  </div>;
}

export function NotFoundPage({ title = "This page stepped out for a class." }) {
  return <main className="center-page"><div className="eyebrow">404 / Not found</div><h1>{title}</h1><p>We couldn’t find what you were looking for, but there is plenty worth learning next.</p><Link className="button" to="/masterclasses">Explore masterclasses</Link></main>;
}
