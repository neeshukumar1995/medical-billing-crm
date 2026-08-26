// utils/logout.js
import crmInstance from "./crmInstance";

export const logout = async () => {
  try {
    await crmInstance.post("/logout");
  } catch (e) {
    console.error("Logout failed", e);
  } finally {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    localStorage.removeItem("isLoggedIn");
    window.location.href = "/";
  }
};
