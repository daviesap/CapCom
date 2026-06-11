import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);

const shouldPreventAppShellZoom = () =>
  window.matchMedia("(max-width: 767px)").matches && document.querySelector(".app-shell");

window.addEventListener(
  "gesturestart",
  (event) => {
    if (shouldPreventAppShellZoom()) {
      event.preventDefault();
    }
  },
  { passive: false }
);

window.addEventListener(
  "gesturechange",
  (event) => {
    if (shouldPreventAppShellZoom()) {
      event.preventDefault();
    }
  },
  { passive: false }
);

window.addEventListener(
  "touchmove",
  (event) => {
    if (event.touches.length > 1 && shouldPreventAppShellZoom()) {
      event.preventDefault();
    }
  },
  { passive: false }
);
