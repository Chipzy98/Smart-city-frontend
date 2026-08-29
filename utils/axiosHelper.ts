import axios from "axios";

// Pages call Next.js API routes (/api/smartcity/...)
// Next.js routes then forward to backend — NO direct backend call from browser.
// So base URL = empty string (same origin).
const BASE = "";

function getBearerToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

function authHeaders() {
  const token = getBearerToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const axiosGetFromApiAsync = async (url: string) => {
  const response = await axios.get(`${BASE}${url}`, {
    headers: authHeaders(),
  });
  return response.data;
};

export const axiosPostToApiAsync = async <T>(url: string, data: T) => {
  const response = await axios.post(`${BASE}${url}`, data, {
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
  });
  return response.data;
};