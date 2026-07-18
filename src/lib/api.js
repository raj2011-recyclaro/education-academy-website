const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "";

function createLocalId(prefix) {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${random}`;
}

async function request(path, options = {}) {
  if (!API_BASE_URL) {
    throw new Error("VITE_API_BASE_URL is not configured");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || "API request failed");
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload.data ?? payload;
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

export async function submitInstructorApplication(payload) {
  try {
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
