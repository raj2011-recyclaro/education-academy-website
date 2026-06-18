import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  FAQAccordion,
  InstructorCard,
  MobileRegistrationCTA,
  NotFoundPage,
  RegistrationForm,
  StickyRegistrationCard,
  VideoThumbnail,
} from "../components/Common";
import { getBootcamp } from "../lib/api";

export default function BootcampDetailPage() {
  const { slug } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getBootcamp(slug)
      .then((data) => {
        if (active) setCourse(data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) {
    return <main className="center-page"><p>Loading bootcamp...</p></main>;
  }
  if (!course) return <NotFoundPage title="That bootcamp cohort could not be found." />;

  const curriculum = course.curriculum.map((item, index) => ({
    q: `Module ${index + 1} · ${item}`,
    a: "Live instruction, guided practice, mentor feedback, and a clear artifact for your portfolio.",
  }));
  const faq = [
    {
      q: "How much time should I plan each week?",
      a: "Most learners spend 8-12 hours each week across live sessions, projects, and peer work.",
    },
    {
      q: "Is the certificate accredited?",
      a: "The Academy completion certificate recognizes your work but is not a university degree or accreditation.",
    },
    {
      q: "Can my employer sponsor me?",
      a: "Yes. Contact support for a sponsorship letter and invoice placeholder.",
    },
  ];

  return (
    <main>
      <section className="bootcamp-detail-hero section">
        <div>
          <div className="eyebrow">{course.category} · {course.status}</div>
          <h1>{course.title}</h1>
          <p>{course.summary}</p>
          <div className="program-stats dark">
            <span><b>{course.duration}</b> duration</span>
            <span><b>{course.level}</b> level</span>
            <span><b>{course.startDate}</b> start date</span>
            <span><b>Certificate</b> included</span>
          </div>
        </div>
        <VideoThumbnail image={course.image} label="Program preview" />
      </section>
      <section className="detail-page section">
        <div className="detail-grid">
          <article>
            <section className="content-section">
              <div className="eyebrow">Curriculum</div>
              <h2>From foundations to a defendable capstone.</h2>
              <FAQAccordion items={curriculum} />
            </section>
            <section className="content-section">
              <h2>Projects and outcomes</h2>
              <div className="learn-grid">
                {course.outcomes.map((item, index) => (
                  <div className="learn-item card" key={item}>
                    <span>0{index + 1}</span>
                    <b>{item}</b>
                  </div>
                ))}
              </div>
            </section>
            <section className="content-section">
              <h2>Your mentor</h2>
              <InstructorCard instructorId={course.instructorId} detailed />
            </section>
            <section className="community card">
              <div>
                <div className="eyebrow">You will not build alone</div>
                <h2>Community and support</h2>
              </div>
              <p>
                Weekly office hours, an active peer studio, code and project
                reviews, plus focused career storytelling support.
              </p>
            </section>
            <section className="content-section">
              <h2>Bootcamp FAQ</h2>
              <FAQAccordion items={faq} />
            </section>
            <div className="mobile-registration" id="mobile-registration">
              <h2>Enroll or join the waitlist</h2>
              <RegistrationForm item={course} type="bootcamp" compact />
            </div>
          </article>
          <StickyRegistrationCard item={course} type="bootcamp" />
        </div>
        <MobileRegistrationCTA label="Enroll / join waitlist" />
      </section>
    </main>
  );
}
