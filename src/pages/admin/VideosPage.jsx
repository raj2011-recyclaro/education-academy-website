import { useEffect, useState } from "react";
import { createVideo, deleteVideo, getAdminCategories, getAdminVideos, updateVideoStatus } from "../../lib/api";

const emptyForm = { title: "", youtubeUrl: "", videoType: "course", categoryId: "", relatedProgramSlug: "", description: "" };

export default function AdminVideosPage() {
  const [videos, setVideos] = useState([]);
  const [categories, setCategories] = useState([]);
  const [typeFilter, setTypeFilter] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = () => {
    getAdminVideos({ type: typeFilter })
      .then((data) => setVideos(data))
      .catch((requestError) => setError(requestError.message || "Could not load videos."));
  };

  useEffect(load, [typeFilter]);
  useEffect(() => {
    getAdminCategories().then(setCategories).catch(() => {});
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await createVideo({ ...form, categoryId: form.categoryId || null });
      setForm(emptyForm);
      setMessage("Video added as draft. Publish it below to make it live.");
      load();
    } catch (requestError) {
      setError(requestError.message || "Could not add video.");
    }
  };

  const togglePublish = async (video) => {
    try {
      await updateVideoStatus(video.id, video.status === "published" ? "draft" : "published");
      load();
    } catch (requestError) {
      setError(requestError.message || "Could not update video status.");
    }
  };

  const remove = async (id) => {
    try {
      await deleteVideo(id);
      load();
    } catch (requestError) {
      setError(requestError.message || "Could not delete video.");
    }
  };

  return (
    <>
      <div className="admin-header">
        <div>
          <div className="eyebrow">Admin</div>
          <h1>Videos</h1>
        </div>
      </div>
      {error && <p className="form-error">{error}</p>}
      {message && <p className="form-status">{message}</p>}

      <form className="admin-form" onSubmit={submit}>
        <label>YouTube link<input required placeholder="https://www.youtube.com/watch?v=..." value={form.youtubeUrl} onChange={(e) => setForm({ ...form, youtubeUrl: e.target.value })} /></label>
        <label>Title<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
        <div className="admin-form-row">
          <label>Type
            <select value={form.videoType} onChange={(e) => setForm({ ...form, videoType: e.target.value })}>
              <option value="course">Course</option>
              <option value="orientation">Orientation</option>
            </select>
          </label>
          <label>Topic
            <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
              <option value="">No topic</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
        </div>
        <label>Linked program slug (optional)<input placeholder="e.g. basics-of-stock-market" value={form.relatedProgramSlug} onChange={(e) => setForm({ ...form, relatedProgramSlug: e.target.value })} /></label>
        <div className="admin-actions">
          <button className="button" type="submit">Add video</button>
        </div>
      </form>

      <div className="admin-filters" style={{ marginTop: 28 }}>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">All types</option>
          <option value="course">Course</option>
          <option value="orientation">Orientation</option>
        </select>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr><th>Title</th><th>Type</th><th>Program</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {videos.map((video) => (
              <tr key={video.id}>
                <td>{video.title}</td>
                <td>{video.videoType}</td>
                <td>{video.relatedProgramSlug || "—"}</td>
                <td><span className={`status-badge ${video.status}`}>{video.status}</span></td>
                <td className="actions">
                  <button type="button" className="link-button" onClick={() => togglePublish(video)}>
                    {video.status === "published" ? "Unpublish" : "Publish"}
                  </button>
                  <button type="button" className="link-button" onClick={() => remove(video.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {videos.length === 0 && <tr><td colSpan={5}>No videos yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
