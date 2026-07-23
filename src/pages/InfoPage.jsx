import { useState } from "react";
import { sendContactMessage, submitInstructorApplication } from "../lib/api";

const MAX_RESUME_BYTES = 5 * 1024 * 1024;
const RESUME_ACCEPT = ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export default function InfoPage({ type }) {
  const [sent, setSent] = useState(false);
  const [status, setStatus] = useState("");
  const instructor = type === "instructor";

  const submit = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const resumeFile = formData.get("resume");
    const hasResume = resumeFile instanceof File && resumeFile.size > 0;
    if (hasResume && resumeFile.size > MAX_RESUME_BYTES) {
      setStatus("Resume file is too large. Please upload a PDF or Word document under 5MB.");
      return;
    }
    setStatus("Sending...");
    try {
      if (instructor) {
        await submitInstructorApplication({
          fullName: formData.get("fullName"),
          email: formData.get("email"),
          phone: formData.get("phone"),
          topic: formData.get("topic"),
          message: formData.get("message"),
        }, hasResume ? resumeFile : undefined);
      } else {
        await sendContactMessage({
          fullName: formData.get("fullName"),
          email: formData.get("email"),
          topic: "Contact request",
          message: formData.get("message"),
        });
      }
      setSent(true);
    } catch (error) {
      setStatus(error.message || "Message could not be sent.");
    }
  };

  const points = instructor
    ? [
      "Editorial and curriculum support",
      "A high-intent learner community",
      "Flexible masterclass and cohort formats",
    ]
    : [
      "Learner support within one business day",
      "Employer sponsorship help",
      "Accessibility and session questions",
    ];

  return (
    <main className="info-page">
      <section>
        <div className="eyebrow">{instructor ? "Teach with UpSkillr.in" : "Talk to a human"}</div>
        <h1>
          {instructor
            ? "Turn your hard-won experience into an exceptional live class."
            : "How can we help?"}
        </h1>
        <p>
          {instructor
            ? "We partner with thoughtful practitioners who can teach with clarity, generosity, and a bias toward useful work."
            : "Questions about a session, sponsorship, accessibility, or your registration? Our learning support team is here."}
        </p>
        <div className="info-points">
          {points.map((item) => <span key={item}>✓ {item}</span>)}
        </div>
      </section>
      <section className="card info-form">
        {sent ? (
          <div className="empty-state">
            <h2>Message received.</h2>
            <p>Thanks. The UpSkillr.in team will be in touch soon.</p>
          </div>
        ) : (
          <form onSubmit={submit}>
            <label>Full name<input required name="fullName" /></label>
            <label>Email<input required name="email" type="email" /></label>
            {instructor && <>
              <label>Phone<input required name="phone" type="tel" /></label>
              <label>Topic you'd like to teach<input required name="topic" /></label>
            </>}
            <label>
              {instructor ? "Tell us about your experience" : "How can we help?"}
              <textarea required name="message" rows="6" />
            </label>
            {instructor && (
              <label>
                Resume / portfolio (optional)
                <input type="file" name="resume" accept={RESUME_ACCEPT} />
                <small className="field-hint">PDF or Word document, up to 5MB</small>
              </label>
            )}
            {status && <p className="form-status">{status}</p>}
            <button className="button" type="submit">Send message</button>
          </form>
        )}
      </section>
    </main>
  );
}
