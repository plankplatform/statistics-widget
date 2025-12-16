import { useEffect, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, FirstDataRenderedEvent } from "ag-grid-community";
import { apiFetch } from "./lib/api";
import Loader from "./components/Loader";

interface WidgetChartProps {
  statId: string;
  graphId: string;
}

// Si tratta del widget statico -> versione più robusta di App -> non era in grado di renderizzare tutti i grafici
export default function WidgetChart({ statId, graphId }: WidgetChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<AgGridReact>(null);

  const [loading, setLoading] = useState(true);
  const [model, setModel] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState(null);
  const [sorting, setSorting] = useState(null);
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [title, setTitle] = useState<string>("");

  useEffect(() => {
    let disposed = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const graph = await apiFetch(`v1/stats/graphs/${graphId}`);
        if (!graph) {
          throw new Error("Graph not found");
        }

        const cfg = typeof graph.config === "string" ? JSON.parse(graph.config) : graph.config;
        const flt = typeof graph.filters === "string" ? JSON.parse(graph.filters) : graph.filters;
        const srt = typeof graph.sorting === "string" ? JSON.parse(graph.sorting) : graph.sorting;

        const stat = await apiFetch(`v1/stats/${statId}`);
        if (!stat) {
          throw new Error("Stat not found");
        }

        if (disposed) return;

        setModel(cfg);
        setFilters(flt);
        setSorting(srt);
        setColumns(JSON.parse(stat.columns_order || "[]"));
        setData(JSON.parse(stat.json_results || "[]"));
        setTitle(stat.query_name || "");
        setLoading(false);
      } catch (err) {
          if (disposed) return;
          console.error(err);
          setError(`The chart with stat:${statId} and graph:${graphId} does not exist`);
          setLoading(false);
      }
    }

    load();

    return () => {
      disposed = true;
    };
  }, [statId, graphId]);

  const castedData = useMemo(() => {
    return data.map((row) => {
      const r: any = {};
      columns.forEach((c) => {
        const val = row[c];
        r[c] = !isNaN(val) && val !== "" && val !== null ? Number(val) : val;
      });
      return r;
    });
  }, [data, columns]);

  const colDefs: ColDef[] = useMemo(() => {
    return columns.map((c) => {
      const sample = castedData.find((r) => r[c] !== undefined)?.[c];
      const isNumber = typeof sample === "number";

      return {
        field: c,
        filter: isNumber ? "agNumberColumnFilter" : "agTextColumnFilter",
        type: isNumber ? "numericColumn" : undefined,
        chartDataType: isNumber ? "series" : "category",
      };
    });
  }, [columns, castedData]);

  const handleFirstDataRendered = (e: FirstDataRenderedEvent) => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = "";

    if (sorting) {
      e.api.applyColumnState({
        state: sorting,
        applyOrder: true,
      });
    }

    if (filters) {
      e.api.setFilterModel(filters);
      setTimeout(() => {
        e.api.restoreChart(model, container);
      }, 80);
    } else {
      e.api.restoreChart(model, container);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (error) {
    return( 
    <div className="h-screen flex items-center justify-center">
        <h2 className="text-center text-red-500">{error}</h2>
      </div>
    );
  }


  if (!loading && (!data || data.length === 0)) {
    return (
      <p className="text-center text-red-500">No data available</p>
    );
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
            rowData={castedData}
            columnDefs={colDefs}
            onFirstDataRendered={handleFirstDataRendered}
            suppressMenuHide
            suppressMovableColumns
            popupParent={document.body}
          />
        </div>
      </div>
      <div ref={containerRef} className="w-full flex-1 min-h-0" />
    </div>
  );
}
