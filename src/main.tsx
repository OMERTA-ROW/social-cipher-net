import { createRoot } from "react-dom/client";
import { purgeCorruptAuthSessions } from "./lib/authSession";
import App from "./App.tsx";
import "./index.css";

// Drop corrupted stored sessions (e.g. "[object Object]") before auth restores.
try { purgeCorruptAuthSessions(window.localStorage); } catch { /* storage unavailable */ }

createRoot(document.getElementById("root")!).render(<App />);
