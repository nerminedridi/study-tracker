import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./App";
import { StoreProvider } from "./store/StoreProvider";
import { TimerProvider } from "./timer/TimerProvider";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <StoreProvider>
        <TimerProvider>
          <App />
        </TimerProvider>
      </StoreProvider>
    </BrowserRouter>
  </StrictMode>,
);
