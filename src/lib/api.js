import { bootcamps as localBootcamps } from "../data/bootcamps";
import { masterclasses as localMasterclasses } from "../data/masterclasses";

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

export async function getMasterclasses() {
  try {
    return await request("/api/masterclasses");
  } catch (error) {
    console.warn("Using local masterclass data:", error.message);
    return localMasterclasses;
  }
}

export async function getMasterclass(slug) {
  try {
    return await request(`/api/masterclasses/${slug}`);
  } catch (error) {
    if (error.status === 404) return null;
    console.warn("Using local masterclass detail:", error.message);
    return localMasterclasses.find((item) => item.slug === slug) || null;
  }
}

export async function getBootcamps() {
  try {
    return await request("/api/bootcamps");
  } catch (error) {
    console.warn("Using local bootcamp data:", error.message);
    return localBootcamps;
  }
}

export async function getBootcamp(slug) {
  try {
    return await request(`/api/bootcamps/${slug}`);
  } catch (error) {
    if (error.status === 404) return null;
    console.warn("Using local bootcamp detail:", error.message);
    return localBootcamps.find((item) => item.slug === slug) || null;
  }
}

export async function getHomepageContent() {
  return request("/api/homepage");
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
