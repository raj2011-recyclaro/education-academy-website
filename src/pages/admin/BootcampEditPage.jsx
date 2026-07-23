import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MaterialsManager, PairListEditor, TextListEditor } from "../../components/AdminFormFields";
import { createBootcamp, getAdminBootcamp, getAdminCategories, getAdminUsers, updateBootcamp } from "../../lib/api";

const emptyForm = {
  slug: "", title: "", code: "", categoryId: "", instructorId: "", duration: "", level: "",
  deliveryMode: "", liveSessions: "", startDate: "", certificate: true, price: "", status: "",
  idealFor: "", examBody: "", examFee: "", passMark: "", image: "", summary: "", whyCourse: "",
  aboutCourse: "", whoShouldAttend: [], outcomes: [], curriculum: [], refundConditions: [],
  faq: [], disclaimer: "", visibilityStatus: "draft",
};

export default function AdminBootcampEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;
  const [form, setForm] = useState(emptyForm);
  const [courseSlug, setCourseSlug] = useState(null);
  const [categories, setCategories] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    getAdminCategories().then(setCategories).catch(() => {});
    getAdminUsers({ role: "teacher", pageSize: 50 }).then((data) => setTeachers(data.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    getAdminBootcamp(id)
      .then((data) => {
        setForm({ ...emptyForm, ...data, categoryId: data.categoryId || "", instructorId: data.instructor?.id || "" });
        setCourseSlug(data.slug);
      })
      .catch((requestError) => setError(requestError.message));
  }, [id]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      if (isNew) {
        const result = await createBootcamp(form);
        navigate(`/admin/bootcamps/${result.data.id}`);
      } else {
        await updateBootcamp(id, form);
        setCourseSlug(form.slug);
        setMessage("Saved.");
      }
    } catch (requestError) {
      setError(requestError.message || "Could not save bootcamp.");
    }
  };

  return (
    <>
      <div className="admin-header">
        <div>
          <div className="eyebrow">Admin</div>
          <h1>{isNew ? "New bootcamp" : "Edit bootcamp"}</h1>
        </div>
      </div>
      {error && <p className="form-error">{error}</p>}
      {message && <p className="form-status">{message}</p>}
      <form className="admin-form" onSubmit={submit}>
        <div className="admin-form-row">
          <label>Title<input required value={form.title} onChange={(e) => set("title", e.target.value)} /></label>
          <label>Slug<input required value={form.slug} onChange={(e) => set("slug", e.target.value)} /></label>
        </div>
        <div className="admin-form-row">
          <label>Category
            <select value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
              <option value="">None</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label>Teacher
            <select value={form.instructorId} onChange={(e) => set("instructorId", e.target.value)}>
              <option value="">Unassigned</option>
              {teachers.map((t) => <option key={t.id} value={t.id}>{t.fullName || t.email}</option>)}
            </select>
          </label>
        </div>
        <div className="admin-form-row">
          <label>Code<input value={form.code} onChange={(e) => set("code", e.target.value)} /></label>
          <label>Price<input value={form.price} onChange={(e) => set("price", e.target.value)} /></label>
        </div>
        <div className="admin-form-row">
          <label>Duration<input value={form.duration} onChange={(e) => set("duration", e.target.value)} /></label>
          <label>Level<input value={form.level} onChange={(e) => set("level", e.target.value)} /></label>
        </div>
        <div className="admin-form-row">
          <label>Delivery mode<input value={form.deliveryMode} onChange={(e) => set("deliveryMode", e.target.value)} /></label>
          <label>Live sessions<input value={form.liveSessions} onChange={(e) => set("liveSessions", e.target.value)} /></label>
        </div>
        <div className="admin-form-row">
          <label>Start date<input value={form.startDate} onChange={(e) => set("startDate", e.target.value)} /></label>
          <label>Marketing status<input value={form.status} onChange={(e) => set("status", e.target.value)} placeholder="e.g. Enrollment open" /></label>
        </div>
        <div className="admin-form-row">
          <label>Ideal for<input value={form.idealFor} onChange={(e) => set("idealFor", e.target.value)} /></label>
          <label>Certificate
            <select value={form.certificate ? "true" : "false"} onChange={(e) => set("certificate", e.target.value === "true")}>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </label>
        </div>
        <div className="admin-form-row">
          <label>Exam body<input value={form.examBody} onChange={(e) => set("examBody", e.target.value)} /></label>
          <label>Exam fee<input value={form.examFee} onChange={(e) => set("examFee", e.target.value)} /></label>
        </div>
        <label>Pass mark<input value={form.passMark} onChange={(e) => set("passMark", e.target.value)} /></label>
        <label>Image URL<input value={form.image} onChange={(e) => set("image", e.target.value)} /></label>
        <label>Summary<textarea rows="2" value={form.summary} onChange={(e) => set("summary", e.target.value)} /></label>
        <label>Why this course<textarea rows="3" value={form.whyCourse} onChange={(e) => set("whyCourse", e.target.value)} /></label>
        <label>About this course<textarea rows="3" value={form.aboutCourse} onChange={(e) => set("aboutCourse", e.target.value)} /></label>

        <TextListEditor label="Who should attend (one per line)" value={form.whoShouldAttend} onChange={(v) => set("whoShouldAttend", v)} />
        <TextListEditor label="Outcomes (one per line)" value={form.outcomes} onChange={(v) => set("outcomes", v)} />
        <TextListEditor label="Refund conditions (one per line)" value={form.refundConditions} onChange={(v) => set("refundConditions", v)} />

        <PairListEditor label="Curriculum" value={form.curriculum} onChange={(v) => set("curriculum", v)} keyA="title" keyB="topics" placeholderA="Module title" placeholderB="Topics covered" />
        <PairListEditor label="FAQ" value={form.faq} onChange={(v) => set("faq", v)} keyA="q" keyB="a" placeholderA="Question" placeholderB="Answer" />

        <label>Disclaimer (optional)<textarea rows="2" value={form.disclaimer} onChange={(e) => set("disclaimer", e.target.value)} /></label>

        <label>Visibility
          <select value={form.visibilityStatus} onChange={(e) => set("visibilityStatus", e.target.value)}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </label>

        <div className="admin-actions">
          <button className="button" type="submit">{isNew ? "Create bootcamp" : "Save changes"}</button>
        </div>
      </form>

      {!isNew && (
        <div style={{ marginTop: 40 }}>
          <h2>Course materials</h2>
          <MaterialsManager courseType="bootcamp" courseSlug={courseSlug} />
        </div>
      )}
    </>
  );
}
