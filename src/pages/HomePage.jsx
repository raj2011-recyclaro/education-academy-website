import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FAQAccordion, InstructorCard } from "../components/Common";
import { BootcampCard } from "../components/CourseCards";
import { bootcamps } from "../data/bootcamps";
import { instructors } from "../data/instructors";
import { masterclasses } from "../data/masterclasses";
import { getHomepageContent, getTestimonials } from "../lib/api";

const fallbackLearnerStories = [
  {
    quote: "The live chart clinic gave me a framework I used on my very next trade.",
    name: "Ananya S.",
    role: "Salaried Professional",
  },
  {
    quote: "It felt closer to sitting next to a real trader than another course I would never finish.",
    name: "Rohan M.",
    role: "Options Trader",
  },
  {
    quote: "The NISM V-A course got me through the exam on my first attempt in three weeks.",
    name: "Meera K.",
    role: "Bank Relationship Manager",
  },
  {
    quote: "The Algo Trading course helped me turn a strategy idea into a backtested, working system.",
    name: "Kabir A.",
    role: "IT Professional",
  },
  {
    quote: "The CFA Level 1 coaching gave me structure, deadlines, and useful feedback without making the material feel rushed.",
    name: "Nisha P.",
    role: "Finance Graduate",
  },
];

const fallbackHomepageContent = {
  hero: {
    eyebrow: "Finance and trading education, thoughtfully designed",
    headline: "Learn markets from someone who has traded them.",
    subheadline:
      "Join free live sessions and certification-ready courses in stock markets, technical analysis, options, algo trading, NISM, CMT, and CFA — built for ambitious Indian investors and traders.",
    primaryCTA: { label: "Explore masterclasses", href: "/masterclasses" },
    secondaryCTA: { label: "View courses", href: "/bootcamps" },
    proofPoints: ["3,000+ students taught", "SEBI Registered Research Analyst", "13 courses across trading & certification"],
  },
  featuredMasterclass: masterclasses[0],
  trendingMasterclasses: masterclasses.slice(1, 5),
  featuredBootcamps: bootcamps.slice(0, 3),
  categorySection: {
    eyebrow: "Find your next leap",
    title: "What do you want to learn?",
  },
  categories: [{ name: "Finance" }, { name: "Trading" }],
  testimonialSection: {
    eyebrow: "Learner stories",
    title: "Small rooms. Serious progress.",
  },
  testimonials: fallbackLearnerStories,
  finalCTA: {
    eyebrow: "Your next chapter can start small",
    title: "One live session could change how you work.",
    description: "Join thousands of thoughtful learners building future-relevant skills.",
    ctaLabel: "Find your masterclass",
    href: "/masterclasses",
  },
};

const courseTrackDefs = [
  { key: "stock-markets", label: "Stock Markets", accent: "var(--color-teal)", match: (title) => /stock market/i.test(title) },
  { key: "technical-analysis", label: "Technical Analysis & CMT", accent: "var(--color-navy)", match: (title) => /technical analysis|cmt level/i.test(title) },
  { key: "nism", label: "NISM Certifications", accent: "var(--color-orange)", match: (title) => /^nism/i.test(title) },
  { key: "options-derivatives", label: "Options & Derivatives", accent: "var(--color-teal)", match: (title) => /options/i.test(title) },
  { key: "algo-trading", label: "Algo Trading", accent: "var(--color-navy)", match: (title) => /algo trading/i.test(title) },
  { key: "cfa", label: "CFA Program", accent: "var(--color-orange)", match: (title) => /^cfa/i.test(title) },
];

function trackForCourse(course) {
  return courseTrackDefs.find((track) => track.match(course.title))?.key || "other";
}

function normalizeMasterclass(course) {
  if (!course) return course;
  return {
    ...course,
    price: course.price ?? course.priceLabel ?? "Free",
    registered: course.registered ?? course.registeredCount ?? 0,
    overview: course.overview ?? course.summary,
    date: course.date ?? course.dateTime?.split(" · ")[0] ?? "",
    time: course.time ?? course.dateTime?.split(" · ")[1] ?? "",
  };
}

function normalizeTestimonial(story) {
  return {
    quote: story.quote,
    name: story.name ?? story.learnerName,
    role: story.role,
  };
}

function renderHeadline(headline) {
  if (!headline?.toLowerCase().startsWith("learn ")) return headline;
  return (
    <>
      <span className="whooplash-underline">Learn</span>
      {headline.slice("Learn".length)}
    </>
  );
}

function renderTestimonialTitle(title) {
  if (!title?.toLowerCase().includes("progress")) return title;
  const [before, after] = title.split(/progress/i);
  return (
    <>
      {before}
      <span className="whooplash-underline">progress</span>
      {after}
    </>
  );
}

export default function HomePage() {
  const [homeContent, setHomeContent] = useState(fallbackHomepageContent);
  const [activeTrack, setActiveTrack] = useState("all");
  const courseTracksRef = useRef(null);

  const jumpToTrack = (trackKey) => {
    setActiveTrack(trackKey);
    courseTracksRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    let active = true;
    getHomepageContent()
      .then(async (data) => {
        if (!active) return;
        if (data.testimonials?.length) {
          setHomeContent(data);
          return;
        }

        try {
          const testimonials = await getTestimonials();
          if (active) setHomeContent({ ...data, testimonials });
        } catch (testimonialError) {
          console.warn("Using fallback testimonials:", testimonialError.message);
          if (active) setHomeContent(data);
        }
      })
      .catch((error) => {
        console.warn("Using fallback homepage content:", error.message);
      });
    return () => {
      active = false;
    };
  }, []);

  const hero = homeContent.hero ?? fallbackHomepageContent.hero;
  const testimonialSection = homeContent.testimonialSection ?? fallbackHomepageContent.testimonialSection;
  const finalCTA = homeContent.finalCTA ?? fallbackHomepageContent.finalCTA;

  const featuredMasterclass = normalizeMasterclass(homeContent.featuredMasterclass) ?? masterclasses[0];
  const trendingMasterclasses = (homeContent.trendingMasterclasses?.length
    ? homeContent.trendingMasterclasses
    : fallbackHomepageContent.trendingMasterclasses
  ).map(normalizeMasterclass);
  const learnerStories = (homeContent.testimonials?.length
    ? homeContent.testimonials
    : fallbackHomepageContent.testimonials
  ).map(normalizeTestimonial);

  const courseTracks = courseTrackDefs
    .map((track) => ({ ...track, count: bootcamps.filter((course) => trackForCourse(course) === track.key).length }))
    .filter((track) => track.count > 0);
  const courseTabs = [
    { key: "all", label: "All courses", accent: "var(--color-navy)", count: bootcamps.length },
    ...courseTracks,
  ];
  const tabCourses = (
    activeTrack === "all" ? bootcamps : bootcamps.filter((course) => trackForCourse(course) === activeTrack)
  ).slice(0, 6);

  return (
    <main>
      <section className="hero section">
        <div className="hero-copy">
          <div className="eyebrow">{hero.eyebrow}</div>
          <h1>{renderHeadline(hero.headline)}</h1>
          <p>{hero.subheadline}</p>
          <div className="hero-actions">
            <Link className="button" to={hero.primaryCTA?.href || "/masterclasses"}>
              {hero.primaryCTA?.label || "Explore masterclasses"}
            </Link>
            <Link className="button secondary" to={hero.secondaryCTA?.href || "/bootcamps"}>
              {hero.secondaryCTA?.label || "View bootcamps"}
            </Link>
          </div>
          <div className="trust-line">
            {(hero.proofPoints || fallbackHomepageContent.hero.proofPoints).map((point) => (
              <span key={point}>{point}</span>
            ))}
          </div>
          <div className="hero-topics">
            <span className="hero-topics-label">Explore subjects</span>
            <div className="hero-topics-list">
              {courseTracks.map((track) => (
                <button
                  type="button"
                  className="topic-pill"
                  key={track.key}
                  onClick={() => jumpToTrack(track.key)}
                >
                  <span className="topic-pill-dot" style={{ background: track.accent }} />
                  {track.label}
                  <span className="topic-pill-count">{track.count}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="course-wall">
          {[featuredMasterclass, ...trendingMasterclasses].slice(0, 5).map((course, index) => (
            <Link
              key={course.slug}
              to={`/masterclasses/${course.slug}`}
              className={`wall-card wall-${index + 1}`}
              style={{ backgroundImage: `url(${course.image})` }}
            >
              <span>{course.category}</span>
              <strong>{course.title}</strong>
            </Link>
          ))}
        </div>
      </section>

      <section className="section" id="course-tracks" ref={courseTracksRef}>
        <div className="section-heading">
          <div>
            <div className="eyebrow">Browse by track</div>
            <h2>Pick a path, see the courses.</h2>
          </div>
          <Link to="/bootcamps">View all bootcamps →</Link>
        </div>
        <div className="course-tabs-nav" role="tablist">
          {courseTabs.map((tab) => (
            <button
              type="button"
              role="tab"
              aria-selected={activeTrack === tab.key}
              className={activeTrack === tab.key ? "course-tab active" : "course-tab"}
              key={tab.key}
              onClick={() => setActiveTrack(tab.key)}
            >
              {tab.label}
              <span className="course-tab-count">{tab.count}</span>
            </button>
          ))}
        </div>
        <div className="grid three course-tabs-panel">
          {tabCourses.map((course) => (
            <BootcampCard key={course.slug} course={course} />
          ))}
        </div>
      </section>

      <section className="section instructor-spotlight">
        <div>
          <div className="eyebrow">Instructor spotlight</div>
          <h2>Learn with people who have done the work.</h2>
          <p>
            Every UpSkillr.in instructor pairs deep domain experience with a
            practical, generous teaching style.
          </p>
          <div className="spotlight-stats">
            {instructors[0].highlights?.slice(0, 3).map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
          <Link className="button secondary" to="/become-instructor">
            Teach at UpSkillr.in
          </Link>
        </div>
        <div className="spotlight-frame">
          <InstructorCard instructorId={instructors[0].id} detailed />
        </div>
      </section>

      <section className="section social-proof">
        <div className="section-heading">
          <div>
            <div className="eyebrow">{testimonialSection.eyebrow}</div>
            <h2>{renderTestimonialTitle(testimonialSection.title)}</h2>
          </div>
        </div>
        <div className="testimonial-grid">
          {learnerStories.map(({ quote, name, role }) => (
            <blockquote className="quote-card card" key={`${name}-${role}`}>
              <span>“</span>
              <p>{quote}</p>
              <footer>
                <b>{name}</b>
                <small>{role}</small>
              </footer>
            </blockquote>
          ))}
        </div>
      </section>

      <section className="section how-it-works">
        <div className="section-heading">
          <div>
            <div className="eyebrow">A better learning rhythm</div>
            <h2>How it works</h2>
          </div>
        </div>
        <div className="grid three">
          {[
            [
              "01",
              "Choose a focused session",
              "Start with one practical question or commit to a deeper cohort.",
            ],
            [
              "02",
              "Learn live and build",
              "Ask questions, practice with peers, and receive useful feedback.",
            ],
            [
              "03",
              "Apply it immediately",
              "Leave with a framework, project, or artifact you can use.",
            ],
          ].map(([n, title, copy]) => (
            <div className="step" key={n}>
              <span>{n}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section faq-section">
        <div>
          <div className="eyebrow">Questions, answered</div>
          <h2>FAQ</h2>
          <p>Everything you need to know before your first live session.</p>
        </div>
        <FAQAccordion
          items={[
            {
              q: "Are masterclasses really live?",
              a: "Yes. Most sessions happen live and include time for questions, workshops, or critique.",
            },
            {
              q: "Do I need prior experience?",
              a: "Each listing clearly states the expected level. Many masterclasses are beginner-friendly.",
            },
            {
              q: "What happens after I register?",
              a: "You receive a confirmation and reminder details. This frontend demo keeps that flow on-device.",
            },
          ]}
        />
      </section>

      <section className="final-cta">
        <div className="eyebrow">{finalCTA.eyebrow}</div>
        <h2>{finalCTA.title}</h2>
        <p>{finalCTA.description}</p>
        <Link className="button light" to={finalCTA.href || "/masterclasses"}>
          {finalCTA.ctaLabel || "Find your masterclass"} →
        </Link>
      </section>
    </main>
  );
}
