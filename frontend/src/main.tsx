import React from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import App from "./App";
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";

import "./index.css";

registerSW({ immediate: true });

const NOTIFICATION_DURATION = 9_000;
const TOAST_TOP_OFFSET = "calc(64px + env(safe-area-inset-top, 0px) + 1rem)";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
    <Toaster
      position="top-center"
      gutter={12}
      containerStyle={{
        top: TOAST_TOP_OFFSET,
        right: "1rem",
        bottom: "auto",
        left: "1rem",
        zIndex: 60,
      }}
      toastOptions={{ duration: NOTIFICATION_DURATION }}
    />
  </React.StrictMode>,
);
