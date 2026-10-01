import { createRoot } from "react-dom/client";
import { purgeCorruptAuthSessions } from "./lib/authSession";
import App from "./App.tsx";
import "./index.css";

// Drop corrupted stored sessions (e.g. "[object Object]") before auth restores.
try { purgeCorruptAuthSessions(window.localStorage); } catch { /* storage unavailable */ }

const root = document.getElementById("root");
if (!root) throw new Error("Application root is unavailable");
createRoot(root).render(<App />);
