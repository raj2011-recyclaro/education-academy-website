import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MaterialsManager, TextListEditor } from "../../components/AdminFormFields";
import { createMasterclass, getAdminCategories, getAdminMasterclass, getAdminUsers, updateMasterclass } from "../../lib/api";

const emptyForm = {
  slug: "", title: "", categoryId: "", instructorId: "", date: "", time: "", registered: 0,
  price: "", status: "", image: "", summary: "", overview: "", learn: [], audience: [],
  agenda: [], disclaimer: "", visibilityStatus: "draft",
};

export default function AdminMasterclassEditPage() {
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
    getAdminMasterclass(id)
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
        const result = await createMasterclass(form);
        navigate(`/admin/masterclasses/${result.data.id}`);
      } else {
        await updateMasterclass(id, form);
        setCourseSlug(form.slug);
        setMessage("Saved.");
      }
    } catch (requestError) {
      setError(requestError.message || "Could not save masterclass.");
    }
  };

  return (
    <>
      <div className="admin-header">
        <div>
          <div className="eyebrow">Admin</div>
          <h1>{isNew ? "New masterclass" : "Edit masterclass"}</h1>
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
          <label>Date<input value={form.date} onChange={(e) => set("date", e.target.value)} placeholder="July 9, 2026" /></label>
          <label>Time<input value={form.time} onChange={(e) => set("time", e.target.value)} placeholder="7:00 PM IST" /></label>
        </div>
        <div className="admin-form-row">
          <label>Registered count<input type="number" value={form.registered} onChange={(e) => set("registered", Number(e.target.value))} /></label>
          <label>Price<input value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="Free" /></label>
        </div>
        <label>Marketing status<input value={form.status} onChange={(e) => set("status", e.target.value)} placeholder="e.g. Live" /></label>
        <label>Image URL<input value={form.image} onChange={(e) => set("image", e.target.value)} /></label>
        <label>Summary<textarea rows="2" value={form.summary} onChange={(e) => set("summary", e.target.value)} /></label>
        <label>Overview<textarea rows="3" value={form.overview} onChange={(e) => set("overview", e.target.value)} /></label>

        <TextListEditor label="What you'll learn (one per line)" value={form.learn} onChange={(v) => set("learn", v)} />
        <TextListEditor label="Who this is for (one per line)" value={form.audience} onChange={(v) => set("audience", v)} />
        <TextListEditor label="Agenda (one per line)" value={form.agenda} onChange={(v) => set("agenda", v)} />

        <label>Disclaimer (optional)<textarea rows="2" value={form.disclaimer} onChange={(e) => set("disclaimer", e.target.value)} /></label>

        <label>Visibility
          <select value={form.visibilityStatus} onChange={(e) => set("visibilityStatus", e.target.value)}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </label>

        <div className="admin-actions">
          <button className="button" type="submit">{isNew ? "Create masterclass" : "Save changes"}</button>
        </div>
      </form>

      {!isNew && (
        <div style={{ marginTop: 40 }}>
          <h2>Session materials</h2>
          <MaterialsManager courseType="masterclass" courseSlug={courseSlug} />
        </div>
      )}
    </>
  );
}
