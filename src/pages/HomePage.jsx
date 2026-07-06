import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CategoryFilter, FAQAccordion, InstructorCard, SearchBar } from "../components/Common";
import { BootcampCard, CourseRail, FeaturedMasterclass } from "../components/CourseCards";
import { bootcamps } from "../data/bootcamps";
import { instructors } from "../data/instructors";
import { masterclasses } from "../data/masterclasses";
import { useCategories } from "../hooks/useCategories";
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

function normalizeBootcamp(course) {
  if (!course) return course;
  return {
    ...course,
    price: course.price ?? course.priceLabel ?? "",
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
  const navigate = useNavigate();
  const [homeContent, setHomeContent] = useState(fallbackHomepageContent);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const { categories } = useCategories();

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
        if (active) setApiError("Showing saved homepage content.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const hero = homeContent.hero ?? fallbackHomepageContent.hero;
  const categorySection = homeContent.categorySection ?? fallbackHomepageContent.categorySection;
  const testimonialSection = homeContent.testimonialSection ?? fallbackHomepageContent.testimonialSection;
  const finalCTA = homeContent.finalCTA ?? fallbackHomepageContent.finalCTA;

  const featuredMasterclass = normalizeMasterclass(homeContent.featuredMasterclass) ?? masterclasses[0];
  const trendingMasterclasses = (homeContent.trendingMasterclasses?.length
    ? homeContent.trendingMasterclasses
    : fallbackHomepageContent.trendingMasterclasses
  ).map(normalizeMasterclass);
  const featuredBootcamps = (homeContent.featuredBootcamps?.length
    ? homeContent.featuredBootcamps
    : fallbackHomepageContent.featuredBootcamps
  ).map(normalizeBootcamp);
  const learnerStories = (homeContent.testimonials?.length
    ? homeContent.testimonials
    : fallbackHomepageContent.testimonials
  ).map(normalizeTestimonial);

  const discover = () =>
    navigate(
      `/masterclasses?search=${encodeURIComponent(query)}&category=${encodeURIComponent(category)}`,
    );

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
          {loading && <p className="loading-note">Loading latest homepage content...</p>}
          {apiError && <p className="form-status">{apiError}</p>}
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

      <section className="discovery section">
        <div>
          <div className="eyebrow">{categorySection.eyebrow}</div>
          <h2>{categorySection.title}</h2>
        </div>
        <SearchBar value={query} onChange={setQuery} />
        <CategoryFilter categories={categories} active={category} onChange={setCategory} />
        <button className="button" onClick={discover}>
          Discover classes
        </button>
      </section>

      <FeaturedMasterclass course={featuredMasterclass} />
      <CourseRail title="Trending live masterclasses" courses={trendingMasterclasses.slice(0, 5)} />

      <section className="section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">Cohort pathways</div>
            <h2>Go deep with a bootcamp</h2>
          </div>
          <Link to="/bootcamps">Explore bootcamps →</Link>
        </div>
        <div className="grid three">
          {featuredBootcamps.map((course) => (
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
          <Link className="button secondary" to="/become-instructor">
            Teach at UpSkillr.in
          </Link>
        </div>
        <InstructorCard instructorId={instructors[0].id} detailed />
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
