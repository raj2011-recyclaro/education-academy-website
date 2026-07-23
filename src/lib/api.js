import { bootcamps as staticBootcamps } from "../data/bootcamps.js";
import { masterclasses as staticMasterclasses } from "../data/masterclasses.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "";

// In-memory only — never persisted to localStorage or a cookie. See
// docs/PLATFORM_AUTH_RBAC_PRD.md §9.2 for why (XSS/cross-domain-cookie resistance).
let authToken = null;

export function setAuthToken(token) {
  authToken = token || null;
}

function createLocalId(prefix) {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${random}`;
}

async function request(path, options = {}) {
  if (!API_BASE_URL) {
    throw new Error("VITE_API_BASE_URL is not configured");
  }

  const isFormData = options.body instanceof FormData;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...options.headers,
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || "API request failed");
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  // Preserve the full payload when it carries pagination alongside `data` — callers of
  // paginated admin endpoints need both. Otherwise unwrap `.data` as a convenience,
  // since most endpoints only ever have that one field worth extracting.
  if (payload && typeof payload === "object" && "pagination" in payload) {
    return payload;
  }
  return payload.data ?? payload;
}

export async function getBootcamps() {
  try {
    return await request("/api/bootcamps");
  } catch (error) {
    if (API_BASE_URL) throw error;
    return staticBootcamps;
  }
}

export async function getBootcamp(slug) {
  try {
    return await request(`/api/bootcamps/${slug}`);
  } catch (error) {
    if (API_BASE_URL) throw error;
    return staticBootcamps.find((item) => item.slug === slug) || null;
  }
}

export async function getMasterclasses() {
  try {
    return await request("/api/masterclasses");
  } catch (error) {
    if (API_BASE_URL) throw error;
    return staticMasterclasses;
  }
}

export async function getMasterclass(slug) {
  try {
    return await request(`/api/masterclasses/${slug}`);
  } catch (error) {
    if (API_BASE_URL) throw error;
    return staticMasterclasses.find((item) => item.slug === slug) || null;
  }
}

export async function getHomepageContent() {
  return request("/api/homepage");
}

function mapVideo(row) {
  return {
    id: row.id,
    title: row.title,
    youtubeUrl: row.youtube_url,
    youtubeId: row.youtube_video_id,
    videoType: row.video_type,
    programSlug: row.related_program_slug,
    description: row.description,
    thumbnailUrl: row.thumbnail_url,
    posterUrl: row.thumbnail_url || (row.youtube_video_id ? `https://i.ytimg.com/vi/${row.youtube_video_id}/hqdefault.jpg` : null),
    status: row.status,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    categoryId: row.category_id,
    categorySlug: row.category_slug,
    categoryName: row.category_name,
  };
}

// type: "orientation" | "course", category: category slug, program: related program slug.
export async function getVideos({ type, category, program } = {}) {
  const params = new URLSearchParams();
  if (type) params.set("type", type);
  if (category) params.set("category", category);
  if (program) params.set("program", program);
  const queryString = params.toString();

  try {
    const data = await request(`/api/videos${queryString ? `?${queryString}` : ""}`);
    return (Array.isArray(data) ? data : []).map(mapVideo);
  } catch (error) {
    console.warn("Could not load videos:", error.message);
    return [];
  }
}

export async function getCategories({ featured = false } = {}) {
  return request(`/api/categories${featured ? "?featured=true" : ""}`);
}

export async function getTestimonials({ featured = false } = {}) {
  return request(`/api/testimonials${featured ? "?featured=true" : ""}`);
}

export async function createRegistration(payload) {
  try {
    return await request("/api/registrations", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (error) {
    if (API_BASE_URL) throw error;
    return {
      id: createLocalId("reg"),
      status: "confirmed",
      ...payload,
      createdAt: new Date().toISOString(),
      localOnly: true,
    };
  }
}

export async function joinWaitlist(payload) {
  try {
    return await request("/api/waitlist", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (error) {
    if (API_BASE_URL) throw error;
    return {
      id: createLocalId("wait"),
      status: "joined",
      ...payload,
      createdAt: new Date().toISOString(),
      localOnly: true,
    };
  }
}

export async function submitInstructorApplication(payload, resumeFile) {
  try {
    if (resumeFile) {
      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (value) formData.append(key, value);
      });
      formData.append("resume", resumeFile);
      return await request("/api/instructor-applications", { method: "POST", body: formData });
    }
    return await request("/api/instructor-applications", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (error) {
    if (API_BASE_URL) throw error;
    return {
      id: createLocalId("instructor"),
      status: "received",
      ...payload,
      resumeFileName: resumeFile?.name,
      createdAt: new Date().toISOString(),
      localOnly: true,
    };
  }
}

export async function sendContactMessage(payload) {
  try {
    return await request("/api/contact", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (error) {
    if (API_BASE_URL) throw error;
    return {
      id: createLocalId("msg"),
      status: "received",
      ...payload,
      createdAt: new Date().toISOString(),
      localOnly: true,
    };
  }
}

export async function loginWithGoogle(idToken) {
  return request("/api/auth/google", {
    method: "POST",
    body: JSON.stringify({ idToken }),
  });
}

export async function loginWithGoogleAccessToken(accessToken) {
  return request("/api/auth/google", {
    method: "POST",
    body: JSON.stringify({ accessToken }),
  });
}

export async function getMe() {
  return request("/api/auth/me");
}

export async function getMyEnrollments() {
  return request("/api/me/enrollments");
}

export async function enrollInCourse({ courseType, courseSlug }) {
  return request("/api/me/enrollments", {
    method: "POST",
    body: JSON.stringify({ courseType, courseSlug }),
  });
}

export async function cancelEnrollment(id) {
  return request(`/api/me/enrollments/${id}`, { method: "DELETE" });
}

function toQueryString(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, value);
  });
  const string = query.toString();
  return string ? `?${string}` : "";
}

// --- Admin: users ---
export async function getAdminUsers(params) {
  return request(`/api/admin/users${toQueryString(params)}`);
}
export async function updateUserRole(id, role) {
  return request(`/api/admin/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) });
}
export async function updateUserStatus(id, status) {
  return request(`/api/admin/users/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
}

// --- Admin: instructor applications ---
export async function getAdminApplications(params) {
  return request(`/api/admin/instructor-applications${toQueryString(params)}`);
}
export async function updateApplicationStatus(id, status) {
  return request(`/api/admin/instructor-applications/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
}
export async function promoteApplication(id) {
  return request(`/api/admin/instructor-applications/${id}/promote`, { method: "POST" });
}

// --- Admin: categories ---
export async function getAdminCategories() {
  return request("/api/admin/categories");
}
export async function createCategory(payload) {
  return request("/api/admin/categories", { method: "POST", body: JSON.stringify(payload) });
}
export async function updateCategory(id, payload) {
  return request(`/api/admin/categories/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}
export async function deleteCategory(id) {
  return request(`/api/admin/categories/${id}`, { method: "DELETE" });
}

// --- Admin: videos ---
export async function getAdminVideos(params) {
  return request(`/api/admin/videos${toQueryString(params)}`);
}
export async function createVideo(payload) {
  return request("/api/admin/videos", { method: "POST", body: JSON.stringify(payload) });
}
export async function updateVideo(id, payload) {
  return request(`/api/admin/videos/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}
export async function updateVideoStatus(id, status) {
  return request(`/api/admin/videos/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
}
export async function deleteVideo(id) {
  return request(`/api/admin/videos/${id}`, { method: "DELETE" });
}

// --- Admin: bootcamps ---
export async function getAdminBootcamps(params) {
  return request(`/api/admin/bootcamps${toQueryString(params)}`);
}
export async function getAdminBootcamp(id) {
  return request(`/api/admin/bootcamps/${id}`);
}
export async function createBootcamp(payload) {
  return request("/api/admin/bootcamps", { method: "POST", body: JSON.stringify(payload) });
}
export async function updateBootcamp(id, payload) {
  return request(`/api/admin/bootcamps/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}
export async function updateBootcampStatus(id, visibilityStatus) {
  return request(`/api/admin/bootcamps/${id}/status`, { method: "PATCH", body: JSON.stringify({ visibilityStatus }) });
}
export async function deleteBootcamp(id) {
  return request(`/api/admin/bootcamps/${id}`, { method: "DELETE" });
}

// --- Admin: masterclasses ---
export async function getAdminMasterclasses(params) {
  return request(`/api/admin/masterclasses${toQueryString(params)}`);
}
export async function getAdminMasterclass(id) {
  return request(`/api/admin/masterclasses/${id}`);
}
export async function createMasterclass(payload) {
  return request("/api/admin/masterclasses", { method: "POST", body: JSON.stringify(payload) });
}
export async function updateMasterclass(id, payload) {
  return request(`/api/admin/masterclasses/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}
export async function updateMasterclassStatus(id, visibilityStatus) {
  return request(`/api/admin/masterclasses/${id}/status`, { method: "PATCH", body: JSON.stringify({ visibilityStatus }) });
}
export async function deleteMasterclass(id) {
  return request(`/api/admin/masterclasses/${id}`, { method: "DELETE" });
}

// --- Admin: course materials ---
export async function getCourseMaterials(type, slug) {
  return request(`/api/admin/courses/${type}/${slug}/materials`);
}
export async function uploadCourseMaterial(type, slug, file, title) {
  const formData = new FormData();
  formData.append("file", file);
  if (title) formData.append("title", title);
  return request(`/api/admin/courses/${type}/${slug}/materials`, { method: "POST", body: formData });
}
export async function deleteMaterial(id) {
  return request(`/api/admin/materials/${id}`, { method: "DELETE" });
}
async function downloadFile(path, fileName) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
  });
  if (!response.ok) throw new Error("Could not download that file");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName || "download";
  link.click();
  URL.revokeObjectURL(url);
}

export async function downloadMaterial(id, fileName) {
  return downloadFile(`/api/admin/materials/${id}/download`, fileName);
}

export async function downloadApplicationResume(id, fileName) {
  return downloadFile(`/api/admin/instructor-applications/${id}/resume`, fileName);
}

// --- Teacher ---
export async function getTeacherCourses() {
  return request("/api/teacher/me/courses");
}
