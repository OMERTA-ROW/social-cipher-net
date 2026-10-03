import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const BASE = "Cyber Link";
const TITLES: Record<string, string> = {
  "/": "Home", "/login": "Sign in", "/auth": "Sign in", "/signup": "Create account", "/forgot-password": "Reset password",
  "/reset-password": "Choose a new password", "/auth/callback": "Confirming sign-in", "/voyage": "Solar System Voyage",
  "/privacy": "Privacy Policy", "/terms": "Terms of Service", "/contact": "Contact", "/dashboard": "Dashboard",
  "/profile": "Profile", "/settings": "Settings", "/integrations": "Integrations", "/connectors": "Connectors",
  "/backgrounds": "Backgrounds", "/security": "Security", "/community-guidelines": "Community Guidelines",
};

/** Title for a known path, or null when the router will show the 404 page. */
export const titleFor = (pathname: string, known: boolean) => {
  const p = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (!known) return `Page not found · ${BASE}`;
  const t = TITLES[p] ?? p.split("/")[1]?.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  return t ? `${t} · ${BASE}` : BASE;
};

/** Keeps document.title in sync with the current route. NotFound overrides to its own title. */
const RouteTitle = () => {
  const { pathname } = useLocation();
  useEffect(() => { document.title = titleFor(pathname, true); }, [pathname]);
  return null;
};
export default RouteTitle;
