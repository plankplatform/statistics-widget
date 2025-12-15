import ReactDOM from "react-dom/client";
import "./index.css";
import "ag-grid-enterprise";
import { LicenseManager } from "ag-grid-enterprise";

import WidgetChart from "./WidgetChart";
import Snapshot from "./Snapshot";
import TableWidget from "./WidgetTable";

const licenseKey = import.meta.env.VITE_AG_GRID_LICENSE;
if (licenseKey) {
  LicenseManager.setLicenseKey(licenseKey);
}

const env = import.meta.env.VITE_APP_ENV;

async function setup() {
  if (env === "local") {
    if (!sessionStorage.getItem("apitoken")) {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/v1/auth/user/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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

  const params = new URLSearchParams(window.location.search);
  const statId = params.get("statId") ?? "";
  const graphId = params.get("graphId") ?? "";
  const token = params.get("token") ?? "";
  const view = params.get("view") ?? "snapshot";

  const container = document.getElementById("stats-widget");
  if (!container) {
    console.error("stats-widget not found");
    return;
  }

  /*
  - Se nell'url vengono passati statId e graphId significa che la richiesta è per il widget statico -> l'unico che utilizza questa informazione nella generazione
  - Se invece ho solo il token significa che la richiesta è per il widget dinamico -> non necessita di statId e graphId
  - Se in aggiunta è indicata la view=table significa che la richiesta è per il widget dinamico + tabella
  */
  if(statId && graphId){
    ReactDOM.createRoot(container).render(
      <WidgetChart statId={statId} graphId={graphId} />
    );
  } else if (token && !statId && !graphId) {
   ReactDOM.createRoot(container).render(
      view === "table" ? <TableWidget token={token} /> : <Snapshot token={token} />
    );
  } else {
    console.error("statId and graphId or token parameters are required");
  }

}

setup();
