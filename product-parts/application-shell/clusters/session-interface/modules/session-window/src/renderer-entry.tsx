import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SessionWindowFacade } from "./session-window-facade.js";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Missing #root element");
}

createRoot(root).render(
  <StrictMode>
    <SessionWindowFacade />
  </StrictMode>
);
