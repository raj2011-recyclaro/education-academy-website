import { useEffect, useState } from "react";
import { createCategory, deleteCategory, getAdminCategories, updateCategory } from "../../lib/api";

const emptyForm = { name: "", description: "", icon: "", sortOrder: 0, featured: false };

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  const load = () => {
    getAdminCategories()
      .then((data) => setCategories(data))
      .catch((requestError) => setError(requestError.message || "Could not load categories."));
  };

  useEffect(load, []);

  const startEdit = (category) => {
    setEditingId(category.id);
    setForm({
      name: category.name,
      description: category.description || "",
      icon: category.icon || "",
      sortOrder: category.sortOrder,
      featured: category.featured,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      if (editingId) {
        await updateCategory(editingId, form);
      } else {
        await createCategory(form);
      }
      cancelEdit();
      load();
    } catch (requestError) {
      setError(requestError.message || "Could not save category.");
    }
  };

  const remove = async (id) => {
    setError("");
    try {
      await deleteCategory(id);
      load();
    } catch (requestError) {
      setError(requestError.message || "Could not delete category.");
    }
  };

  return (
    <>
      <div className="admin-header">
        <div>
          <div className="eyebrow">Admin</div>
          <h1>Categories</h1>
        </div>
      </div>
      {error && <p className="form-error">{error}</p>}
      <form className="admin-form" onSubmit={submit}>
        <div className="admin-form-row">
          <label>Name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label>Icon key<input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} /></label>
        </div>
        <label>Description<textarea rows="2" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        <div className="admin-form-row">
          <label>Sort order<input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} /></label>
          <label>Featured
            <select value={form.featured ? "true" : "false"} onChange={(e) => setForm({ ...form, featured: e.target.value === "true" })}>
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
          </label>
        </div>
        <div className="admin-actions">
          <button className="button" type="submit">{editingId ? "Save changes" : "Add category"}</button>
          {editingId && <button type="button" className="button secondary" onClick={cancelEdit}>Cancel</button>}
        </div>
      </form>

      <div className="admin-table-wrap" style={{ marginTop: 28 }}>
        <table className="admin-table">
          <thead>
            <tr><th>Name</th><th>Slug</th><th>Featured</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.id}>
                <td>{category.name}</td>
                <td>{category.slug}</td>
                <td>{category.featured ? "Yes" : "No"}</td>
                <td className="actions">
                  <button type="button" className="link-button" onClick={() => startEdit(category)}>Edit</button>
                  <button type="button" className="link-button" onClick={() => remove(category.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
