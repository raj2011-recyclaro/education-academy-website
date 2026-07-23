import { useEffect, useState } from "react";
import { deleteMaterial, downloadMaterial, getCourseMaterials, uploadCourseMaterial } from "../lib/api";

export function MaterialsManager({ courseType, courseSlug }) {
  const [materials, setMaterials] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    if (!courseSlug) return;
    getCourseMaterials(courseType, courseSlug)
      .then((data) => setMaterials(data))
      .catch((requestError) => setError(requestError.message));
  };

  useEffect(load, [courseType, courseSlug]);

  const handleUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      await uploadCourseMaterial(courseType, courseSlug, file, file.name);
      load();
    } catch (requestError) {
      setError(requestError.message || "Could not upload file.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const remove = async (id) => {
    try {
      await deleteMaterial(id);
      load();
    } catch (requestError) {
      setError(requestError.message || "Could not delete file.");
    }
  };

  const download = async (id, fileName) => {
    try {
      await downloadMaterial(id, fileName);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  if (!courseSlug) {
    return <p className="field-hint">Save the course first, then come back here to attach documents.</p>;
  }

  return (
    <div>
      {error && <p className="form-error">{error}</p>}
      <div className="admin-materials-list">
        {materials.map((material) => (
          <div className="admin-material-row" key={material.id}>
            <span>{material.title} ({Math.round(material.fileSize / 1024)} KB)</span>
            <span className="admin-actions">
              <button type="button" className="link-button" onClick={() => download(material.id, material.fileName)}>Download</button>
              <button type="button" className="link-button" onClick={() => remove(material.id)}>Delete</button>
            </span>
          </div>
        ))}
        {materials.length === 0 && <p className="field-hint">No documents uploaded yet.</p>}
      </div>
      <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx" onChange={handleUpload} disabled={uploading} />
    </div>
  );
}

// One item per line — simplest way to edit a string-array field without a
// drag-and-drop row builder. See docs/ADMIN_PORTAL_PRD.md §13.5.
export function TextListEditor({ label, value, onChange, rows = 4 }) {
  return (
    <label>
      {label}
      <textarea
        rows={rows}
        value={(value || []).join("\n")}
        onChange={(e) => onChange(e.target.value.split("\n").map((line) => line.trim()).filter(Boolean))}
      />
    </label>
  );
}

// Repeatable two-field rows for curriculum ({title, topics}) and FAQ ({q, a}).
export function PairListEditor({ label, value, onChange, keyA, keyB, placeholderA, placeholderB }) {
  const items = value?.length ? value : [];

  const updateRow = (index, key, newValue) => {
    const next = items.map((item, i) => (i === index ? { ...item, [key]: newValue } : item));
    onChange(next);
  };

  const removeRow = (index) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const addRow = () => {
    onChange([...items, { [keyA]: "", [keyB]: "" }]);
  };

  return (
    <div className="admin-list-builder">
      <span className="field-hint" style={{ textTransform: "uppercase", fontWeight: 700, fontSize: "0.74rem", letterSpacing: "0.05em", color: "var(--navy)" }}>{label}</span>
      {items.map((item, index) => (
        <div className="admin-list-builder-row" key={index}>
          <input placeholder={placeholderA} value={item[keyA] || ""} onChange={(e) => updateRow(index, keyA, e.target.value)} />
          <textarea rows="1" placeholder={placeholderB} value={item[keyB] || ""} onChange={(e) => updateRow(index, keyB, e.target.value)} />
          <button type="button" className="link-button" onClick={() => removeRow(index)}>Remove</button>
        </div>
      ))}
      <button type="button" className="button secondary small" onClick={addRow}>+ Add row</button>
    </div>
  );
}
