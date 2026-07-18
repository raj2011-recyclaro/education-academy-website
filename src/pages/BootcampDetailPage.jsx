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
import { bootcamps, refundNote } from "../data/bootcamps";
import { getVideos } from "../lib/api";

export default function BootcampDetailPage() {
  const { slug } = useParams();
  const course = bootcamps.find((item) => item.slug === slug) || null;
  const [video, setVideo] = useState(null);

  useEffect(() => {
    let active = true;
    getVideos({ type: "course", program: slug }).then((videos) => {
      if (active) setVideo(videos[0] || null);
    });
    return () => {
      active = false;
    };
  }, [slug]);

  if (!course) return <NotFoundPage title="That bootcamp cohort could not be found." />;

  const curriculum = (course.curriculum || []).map((item, index) => ({
    q: `Module ${index + 1} · ${item.title || item}`,
    a: item.topics || "Live instruction, guided practice, mentor feedback, and a clear artifact for your portfolio.",
  }));
  const faq = course.faq?.length
    ? course.faq
    : [
        {
          q: "How much time should I plan each week?",
          a: "Most learners spend 8-12 hours each week across live sessions, projects, and peer work.",
        },
        {
          q: "Is the certificate accredited?",
          a: "The UpSkillr.in completion certificate recognizes your work but is not a university degree or accreditation.",
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
          {(course.examBody || course.examFee) && course.examBody !== "Not applicable" && (
            <div className="program-stats dark">
              <span><b>{course.examBody}</b> exam body</span>
              <span><b>{course.examFee}</b> exam fee</span>
            </div>
          )}
        </div>
        <VideoThumbnail
          image={video?.thumbnailUrl || course.image}
          label="Program preview"
          youtubeId={video?.youtubeId || course.youtubeId}
        />
      </section>
      <section className="detail-page section">
        <div className="detail-grid">
          <article>
            {course.whyCourse && (
              <section className="content-section">
                <div className="eyebrow">Why this course</div>
                <p>{course.whyCourse}</p>
              </section>
            )}
            {course.aboutCourse && (
              <section className="content-section">
                <h2>About this course</h2>
                <p>{course.aboutCourse}</p>
              </section>
            )}
            {course.whoShouldAttend?.length > 0 && (
              <section className="content-section">
                <h2>Who should attend</h2>
                <ul className="check-list">
                  {course.whoShouldAttend.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </section>
            )}
            <section className="content-section">
              <div className="eyebrow">Curriculum</div>
              <h2>Module by module.</h2>
              <FAQAccordion items={curriculum} />
            </section>
            <section className="content-section">
              <h2>What you will learn</h2>
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
            {course.refundConditions?.length > 0 && (
              <section className="content-section">
                <div className="eyebrow">Score guarantee</div>
                <h2>Refund policy</h2>
                <p>Upskillr offers a 100% course fee refund if all of the following conditions are met within the stated deadline.</p>
                <ul className="check-list">
                  {course.refundConditions.map((item) => <li key={item}>{item}</li>)}
                </ul>
                <div className="disclaimer card"><p>{refundNote}</p></div>
              </section>
            )}
            <section className="content-section">
              <h2>Bootcamp FAQ</h2>
              <FAQAccordion items={faq} />
            </section>
            {course.disclaimer && (
              <div className="disclaimer card">
                <b>Important content advisory</b>
                <p>{course.disclaimer}</p>
              </div>
            )}
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
