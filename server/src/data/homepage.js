import { bootcamps } from "./bootcamps.js";
import { categories } from "./categories.js";
import { masterclasses } from "./masterclasses.js";
import { testimonials } from "./testimonials.js";

const instructorProfiles = {
  elena: {
    instructorName: "Dr. Elena Rao",
    instructorAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80",
  },
  jonathan: {
    instructorName: "Jonathan Meyer",
    instructorAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80",
  },
  sarah: {
    instructorName: "Sarah Chen",
    instructorAvatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80",
  },
  marcus: {
    instructorName: "Marcus Iyer",
    instructorAvatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80",
  },
};

const findMasterclass = (slug) => masterclasses.find((item) => item.slug === slug);
const findBootcamp = (slug) => bootcamps.find((item) => item.slug === slug);

function toMasterclassCard(course, overrides = {}) {
  if (!course) return null;
  const instructor = instructorProfiles[course.instructorId] || {};
  return {
    slug: course.slug,
    title: course.title,
    category: course.category,
    instructorId: course.instructorId,
    instructorName: instructor.instructorName || course.instructorId,
    instructorAvatar: instructor.instructorAvatar || null,
    image: course.image,
    dateTime: `${course.date} · ${course.time}`,
    date: course.date,
    time: course.time,
    priceLabel: course.price,
    registeredCount: course.registered,
    seatLimit: overrides.seatLimit || 2500,
    summary: course.summary,
    status: course.status,
    ctaLabel: overrides.ctaLabel || "Reserve your seat",
  };
}

function toBootcampCard(course, overrides = {}) {
  if (!course) return null;
  const instructor = instructorProfiles[course.instructorId] || {};
  return {
    slug: course.slug,
    title: course.title,
    category: course.category,
    instructorId: course.instructorId,
    instructorName: instructor.instructorName || course.instructorId,
    instructorAvatar: instructor.instructorAvatar || null,
    image: course.image,
    duration: course.duration,
    level: course.level,
    startDate: course.startDate,
    certificate: course.certificate,
    priceLabel: course.price,
    status: course.status,
    summary: course.summary,
    ctaLabel: overrides.ctaLabel || "View bootcamp",
  };
}

const homepageConfig = {
  hero: {
    eyebrow: "Live learning, thoughtfully designed",
    headline: "Learn from experts. Build skills that move you forward.",
    subheadline:
      "Join focused live masterclasses and mentor-led bootcamps built for ambitious professionals who want more than passive watching.",
    primaryCTA: { label: "Explore masterclasses", href: "/masterclasses" },
    secondaryCTA: { label: "View bootcamps", href: "/bootcamps" },
    proofPoints: ["4.9/5 learner rating", "35k+ learning hours", "32 expert instructors"],
  },
  featuredMasterclassSlug: "intro-to-generative-ai",
  trendingMasterclassSlugs: [
    "algorithmic-trading-foundations",
    "architecture-of-information",
    "leadership-through-vedic-principles",
    "ai-for-enterprise-leaders",
    "cloud-systems-that-scale",
  ],
  featuredBootcampSlugs: [
    "ai-engineering-cohort",
    "algorithmic-trading-strategies",
    "advanced-cloud-architecture",
  ],
  categorySection: {
    eyebrow: "Find your next leap",
    title: "What do you want to learn?",
    description: "Browse high-signal topics across live masterclasses and deeper cohort pathways.",
  },
  testimonialSection: {
    eyebrow: "Learner stories",
    title: "Small rooms. Serious progress.",
    description: "Grounded feedback from learners using Academy sessions to make practical progress.",
  },
  finalCTA: {
    eyebrow: "Your next chapter can start small",
    title: "One live session could change how you work.",
    description: "Join thoughtful learners building future-relevant skills through live practice.",
    ctaLabel: "Find your masterclass",
    href: "/masterclasses",
  },
};

export function getHomepageContent() {
  return {
    hero: homepageConfig.hero,
    featuredMasterclass: toMasterclassCard(findMasterclass(homepageConfig.featuredMasterclassSlug), {
      seatLimit: 2400,
      ctaLabel: "Reserve your seat",
    }),
    trendingMasterclasses: homepageConfig.trendingMasterclassSlugs
      .map((slug) => toMasterclassCard(findMasterclass(slug), { seatLimit: 1800 }))
      .filter(Boolean),
    featuredBootcamps: homepageConfig.featuredBootcampSlugs
      .map((slug) => toBootcampCard(findBootcamp(slug)))
      .filter(Boolean),
    categorySection: homepageConfig.categorySection,
    categories: categories
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder),
    testimonialSection: homepageConfig.testimonialSection,
    testimonials,
    finalCTA: homepageConfig.finalCTA,
  };
}
