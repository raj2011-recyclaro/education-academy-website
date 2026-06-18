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
import { getMasterclass } from "../lib/api";

export default function MasterclassDetailPage() {
  const { slug } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getMasterclass(slug)
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
    return <main className="center-page"><p>Loading masterclass...</p></main>;
  }
  if (!course) return <NotFoundPage title="That masterclass is not on the schedule." />;

  return (
    <main className="detail-page section">
      <div className="detail-grid">
        <article>
          <VideoThumbnail image={course.image} label={course.status} large />
          <div className="detail-title">
            <div className="eyebrow">{course.category} · {course.price}</div>
            <h1>{course.title}</h1>
            <p>{course.summary}</p>
            <div className="detail-meta">
              <span>{course.date}</span>
              <span>{course.time}</span>
              <span>{course.registered.toLocaleString()} registered</span>
            </div>
          </div>
          <InstructorCard instructorId={course.instructorId} detailed />
          <ContentSection title="Overview"><p>{course.overview}</p></ContentSection>
          <ContentSection title="What you will learn">
            <div className="learn-grid">
              {course.learn.map((item, i) => (
                <div className="learn-item card" key={item}>
                  <span>0{i + 1}</span>
                  <b>{item}</b>
                </div>
              ))}
            </div>
          </ContentSection>
          <ContentSection title="Who this is for">
            <ul className="check-list">
              {course.audience.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </ContentSection>
          <ContentSection title="Masterclass agenda">
            <FAQAccordion
              items={course.agenda.map((item, index) => ({
                q: `${String(index + 1).padStart(2, "0")} · ${item}`,
                a: "A focused, interactive segment with practical examples and time to apply the idea.",
              }))}
            />
          </ContentSection>
          <ContentSection title="Frequently asked questions">
            <FAQAccordion
              items={[
                {
                  q: "Will there be a recording?",
                  a: "Registered learners receive replay information after the live session when a recording is available.",
                },
                {
                  q: "Can I ask questions live?",
                  a: "Yes. Every live masterclass includes a moderated Q&A or workshop segment.",
                },
              ]}
            />
          </ContentSection>
          {course.disclaimer && (
            <div className="disclaimer card">
              <b>Important content advisory</b>
              <p>{course.disclaimer}</p>
            </div>
          )}
          <div className="mobile-registration" id="mobile-registration">
            <h2>Reserve your seat</h2>
            <RegistrationForm item={course} compact />
          </div>
        </article>
        <StickyRegistrationCard item={course} />
      </div>
      <MobileRegistrationCTA />
    </main>
  );
}

function ContentSection({ title, children }) {
  return <section className="content-section"><h2>{title}</h2>{children}</section>;
}
