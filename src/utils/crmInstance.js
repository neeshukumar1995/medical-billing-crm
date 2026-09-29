import axios from "axios";
import { API_BASE_URL, DEFAULT_HEADERS } from "@/config/api";

// Create axios instance
const crmInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: DEFAULT_HEADERS,
});

// ✅ Routes that should NEVER trigger auth-redirect / refresh-token flow
// (these are called on the login page itself, before any token exists)
const PUBLIC_ROUTES = ["/login", "/refresh"];

const isPublicRoute = (url = "") => PUBLIC_ROUTES.some((r) => url.includes(r));

// ✅ Detect if we are currently on the login page (adjust path if different)
const isOnLoginPage = () => {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname;
  return path === "/" || path === "/login";
};

const isFormData = (data) => data instanceof FormData;

// ── Request interceptor ────────────────────────────────
crmInstance.interceptors.request.use((config) => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // The header's client/company switcher stores the active company under
  // this key for the rest of the app. Send it on every request: the
  // backend's `company.scope` middleware only honors it when the user may
  // access that company (User::canAccessCompany), so a stale or forged value
  // just falls back to the user's own company.
  if (typeof window !== "undefined") {
    const rawCompanyId = localStorage.getItem("companyId");
    if (rawCompanyId) {
      try {
        config.headers["X-Company-ID"] = String(JSON.parse(rawCompanyId));
      } catch {
        config.headers["X-Company-ID"] = rawCompanyId;
      }
    }
  }

  if (isFormData(config.data)) {
    delete config.headers["Content-Type"];
  }

  return config;
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// ✅ Centralized, safe logout — will NOT redirect if already on login page
const forceLogout = () => {
  if (typeof window === "undefined") return;

  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user");
  localStorage.removeItem("role");
  localStorage.removeItem("permission");
  localStorage.removeItem("role_id");
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("selectedClientKey");

  // ✅ KEY FIX: prevent infinite reload loop
  if (!isOnLoginPage()) {
    window.location.href = "/";
  }
};

// ── Response interceptor ────────────────────────────────
crmInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const requestUrl = originalRequest?.url || "";

    // ✅ KEY FIX: skip entire refresh/redirect flow for public routes
    // (e.g. /companies/ called on login page before any auth exists)
    if (isPublicRoute(requestUrl)) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      // ✅ KEY FIX: if already on login page, don't try to refresh/logout-redirect
      if (isOnLoginPage()) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return crmInstance(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem("refresh_token");
        if (!refreshToken) throw new Error("No refresh token found");

        const refreshResponse = await axios.post(
          `${API_BASE_URL}/refresh`,
          { token: refreshToken },
          { headers: DEFAULT_HEADERS }
        );

        const newAccessToken = refreshResponse.data.access_token;
        const newRefreshToken = refreshResponse.data.refresh_token;

        localStorage.setItem("access_token", newAccessToken);
        localStorage.setItem("refresh_token", newRefreshToken);

        crmInstance.defaults.headers.common["Authorization"] = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return crmInstance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        forceLogout(); // ✅ अब safe है, loop नहीं बनेगा
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default crmInstance;