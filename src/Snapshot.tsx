import { useEffect, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry } from "ag-grid-community";
import {
  AllEnterpriseModule,
  IntegratedChartsModule,
} from "ag-grid-enterprise";
import { AgChartsEnterpriseModule } from "ag-charts-enterprise";
import type { ColDef, FirstDataRenderedEvent } from "ag-grid-community";
import Loader from "./components/Loader";
import { apiFetchPublic } from "./lib/api";

ModuleRegistry.registerModules([
  AllEnterpriseModule,
  IntegratedChartsModule.with(AgChartsEnterpriseModule),
]);

type SnapshotPayload = {
  title?: string;
  columns_order: string | string[];
  json_results: string | Record<string, any>[];
  filters?: string | Record<string, any>;
  sorting?: string | any[];
  config: string | any; 
};

export default function ShareSnapshot({ snapshotId }: { snapshotId: string }) {
  const gridRef = useRef<AgGridReact>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState<string>("");
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [filters, setFilters] = useState<any>(null);
  const [sorting, setSorting] = useState<any>(null);
  const [model, setModel] = useState<any>(null);

  useEffect(() => {
    let disposed = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const raw: SnapshotPayload = await apiFetchPublic(`v1/newsletter/snapshots/${snapshotId}`); // TODO: l'api non esiste ancora
        if (disposed) return;

        const cols =
          typeof raw.columns_order === "string"
            ? JSON.parse(raw.columns_order)
            : raw.columns_order;
        const dataRows =
          typeof raw.json_results === "string"
            ? JSON.parse(raw.json_results)
            : raw.json_results;
        const flt =
          raw.filters && typeof raw.filters === "string"
            ? JSON.parse(raw.filters)
            : raw.filters;
        const srt =
          raw.sorting && typeof raw.sorting === "string"
            ? JSON.parse(raw.sorting)
            : raw.sorting;
        const cfg =
          typeof raw.config === "string" ? JSON.parse(raw.config) : raw.config;    

        setColumns(cols || []);
        setRows(dataRows || []);
        setFilters(flt || null);
        setSorting(srt || null);
        setModel(cfg || null);
        setTitle(raw.title || ""); // TODO forse uso query_name per il titolo
      } catch (e) {
        if (disposed) return;
        console.error(e);
        setError("Impossibile caricare lo snapshot selezionato");
      } finally {
        if (!disposed) setLoading(false);
      }
    }

    load();
    return () => {
      disposed = true;
    };
  }, [snapshotId]);

  const castedRows = useMemo(() => {
    return rows.map((row) => {
      const r: Record<string, any> = {};
      columns.forEach((c) => {
        const val = row[c];
        r[c] = !isNaN(val) && val !== "" && val !== null ? Number(val) : val;
      });
      return r;
    });
  }, [rows, columns]);

  const colDefs: ColDef[] = useMemo(() => {
    return columns.map((c) => {
      const sample = castedRows.find((r) => r[c] !== undefined)?.[c];
      const isNumber = typeof sample === "number";
      return {
        field: c,
        filter: isNumber ? "agNumberColumnFilter" : "agTextColumnFilter",
        type: isNumber ? "numericColumn" : undefined,
        chartDataType: isNumber ? "series" : "category",
        sortable: true,
        resizable: true,
      };
    });
  }, [columns, castedRows]);

  const handleFirstDataRendered = (e: FirstDataRenderedEvent) => {
    const api = e.api;

    if (sorting) {
      api.applyColumnState({ state: sorting, applyOrder: true });
    }
    if (filters) {
      api.setFilterModel(filters);
    }

    const container = containerRef.current;
    if (!container || !model) return;

    container.innerHTML = "";
    setTimeout(() => {
      api.restoreChart(model, container);
    }, 80);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-center text-red-500">{error}</p>
      </div>
    );
  }

  if (!castedRows.length) {
    return <p className="text-center text-red-500">No data available</p>;
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-none px-4 py-2">
        <h4 className="text-xl text-center font-bold">{title}</h4>
      </div>

      <div style={{ display: "none" }}>
        <div className="ag-theme-alpine hidden" style={{ width: 1, height: 1 }}>
          <AgGridReact
            ref={gridRef}
            rowData={castedRows}
            columnDefs={colDefs}
            onFirstDataRendered={handleFirstDataRendered}
            suppressMenuHide
            suppressMovableColumns
            popupParent={document.body}
          />
        </div>
      </div>

      <div ref={containerRef} id="chart-container" className="w-full flex-1 min-h-0 relative" />
    </div>
  );
}
