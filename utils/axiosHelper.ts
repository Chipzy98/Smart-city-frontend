import axios from "axios";

// Backend Azure Functions base URL — set in .env.local
const BACKEND_URL = process.env.SMART_CITY_API_URL ?? "http://localhost:7261";

// ── Token helper (runs only in browser) ───────────────────────────────────
function getBearerToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

function authHeaders() {
  const token = getBearerToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── GET ────────────────────────────────────────────────────────────────────
export const axiosGetFromApiAsync = async (url: string) => {
  const response = await axios.get(`${BACKEND_URL}${url}`, {
    headers: authHeaders(),
  });
  return response.data;
};

// ── POST ───────────────────────────────────────────────────────────────────
export const axiosPostToApiAsync = async <T>(url: string, data: T) => {
  const response = await axios.post(`${BACKEND_URL}${url}`, data, {
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
  });
  return response.data;
};