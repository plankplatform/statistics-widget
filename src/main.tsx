import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "ag-grid-enterprise";
import { LicenseManager } from "ag-grid-enterprise";

const licenseKey = import.meta.env.VITE_AG_GRID_LICENSE;
if (licenseKey) {
  LicenseManager.setLicenseKey(licenseKey);
}

const env = import.meta.env.VITE_APP_ENV;

async function setup() {
  // Autenticazione locale solo in dev/local
  if (env === "local") {
    if (sessionStorage.getItem("apitoken")) {
      console.log("API token already set in sessionStorage");
    } else {
      console.log("Fetching API token...");
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/v1/auth/user/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userid: import.meta.env.VITE_API_USER,
            password: import.meta.env.VITE_API_PASSWORD,
          }),
        }
      );

      const data = await response.json();
      if (data.jwt) {
        sessionStorage.setItem("apitoken", data.jwt);
      } else {
        console.error("Failed to fetch API token:", data);
      }
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const statId = params.get("statId") ?? "";
  const graphId = params.get("graphId") ?? "";

  console.log("Stat ID:", statId);
  console.log("Graph ID:", graphId);

  const container = document.getElementById("stats-widget");
  if (!container) {
    console.error("stats-widget not found");
    return;
  }

  ReactDOM.createRoot(container).render(
    <App statId={statId} graphId={graphId} />
  );
});

}

setup();
