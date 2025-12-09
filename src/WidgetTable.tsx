import { useEffect, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry } from "ag-grid-community";
import {
  AllEnterpriseModule,
  IntegratedChartsModule,
} from "ag-grid-enterprise";
import { AgChartsEnterpriseModule } from "ag-charts-enterprise";
import type {
  ColDef,
  FirstDataRenderedEvent,
  GridApi,
  GridReadyEvent,
} from "ag-grid-community";
import Loader from "./components/Loader";
import { apiFetchPublic } from "./lib/api";

ModuleRegistry.registerModules([
  AllEnterpriseModule,
  IntegratedChartsModule.with(AgChartsEnterpriseModule),
]);

type GridState = {
  filters?: any;
  columnState?: any[];
  pivotMode?: boolean;
  rowGroupCols?: string[];
  pivotCols?: string[];
  valueCols?: string[];
};

type SnapshotPayload = {
  title?: string;
  columns_order: string[] | string;
  json_results: Record<string, any>[] | string;
  filters?: Record<string, any> | string | null;
  sorting?: any[] | string | null;
  grid_state?: GridState | string | null;
  query_name?: string | null;
};

function parseValue<T>(val: T | string | null | undefined): T | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "string") {
    try {
      return JSON.parse(val) as T;
    } catch {
      return val as T;
    }
  }
  return val as T;
}

export default function TableWidget({ token }: { token: string }) {
  const gridRef = useRef<AgGridReact>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState<string>("");
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [gridState, setGridState] = useState<GridState | null>(null);

  useEffect(() => {
    let disposed = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const raw: SnapshotPayload = await apiFetchPublic(
          `v1/newsletter/snapshots/${encodeURIComponent(token)}`
        );

        if (disposed) return;

        const cols = (parseValue(raw.columns_order) as string[]) || [];
        const dataRows =
          (parseValue(raw.json_results) as Record<string, any>[]) || [];
        const parsedGridState = parseValue<GridState>(raw.grid_state);
        const queryName = parseValue<string | null>(raw.query_name) || "";

        setColumns(cols);
        setRows(dataRows);
        setGridState(parsedGridState || null);
        setTitle(queryName || "");
      } catch (e) {
        if (disposed) return;
        console.error(e);
        setError("Impossibile caricare la tabella selezionata");
      } finally {
        if (!disposed) setLoading(false);
      }
    }

    load();
    return () => {
      disposed = true;
    };
  }, [token]);

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

  const columnDefs: ColDef[] = useMemo(() => {
    return columns.map((c) => {
      const sample = castedRows.find((r) => r[c] !== undefined)?.[c];
      const isNumber = typeof sample === "number";

      return {
        field: c,
        filter: isNumber ? "agNumberColumnFilter" : "agTextColumnFilter",
        type: isNumber ? "numericColumn" : undefined,
        chartDataType: isNumber ? "series" : "category",
        enablePivot: true,
        enableRowGroup: true,
        enableValue: true,
        sortable: true,
        resizable: true,
      };
    });
  }, [columns, castedRows]);

  const applySavedState = (api: GridApi) => {
    if (!gridState) {
      api.sizeColumnsToFit();
      return;
    }

    api.setFilterModel(gridState.filters || {});
    //api.setPivotMode(!!gridState.pivotMode);
    api.setRowGroupColumns(gridState.rowGroupCols || []);
    api.setPivotColumns(gridState.pivotCols || []);
    api.setValueColumns(gridState.valueCols || []);

    if (gridState.columnState?.length) {
      api.applyColumnState({
        state: gridState.columnState,
        applyOrder: true,
      });
    } else {
      api.sizeColumnsToFit();
    }
  };

  const handleGridReady = (event: GridReadyEvent) => {
    applySavedState(event.api);
  };

  const handleFirstDataRendered = (event: FirstDataRenderedEvent) => {
    applySavedState(event.api);
  };

  const exportCsv = () => {
    gridRef.current?.api?.exportDataAsCsv();
  };

  const exportExcel = () => {
    gridRef.current?.api?.exportDataAsExcel();
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
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h4 className="text-lg font-semibold truncate">
          {title || "Table"}
        </h4>
        <div className="flex gap-2">
          <button
            onClick={exportCsv}
            className="h-10 px-4 rounded-md border border-gray-300 bg-white text-sm hover:bg-gray-50"
          >
            Export CSV
          </button>
          <button
            onClick={exportExcel}
            className="h-10 px-4 rounded-md border border-gray-300 bg-white text-sm hover:bg-gray-50"
          >
            Export Excel
          </button>
        </div>
      </div>

      <div className="ag-theme-alpine w-full flex-1 min-h-0">
        <AgGridReact
          ref={gridRef}
          rowData={castedRows}
          columnDefs={columnDefs}
          enableCharts={true}
          cellSelection={true}
          pagination={true}
          paginationPageSize={20}
          domLayout="autoHeight"
          sideBar={{
            defaultToolPanel: undefined,
            toolPanels: [
              {
                id: "columns",
                labelDefault: "Columns",
                labelKey: "columns",
                iconKey: "columns",
                toolPanel: "agColumnsToolPanel",
              },
              {
                id: "filters",
                labelDefault: "Filters",
                labelKey: "filters",
                iconKey: "filter",
                toolPanel: "agFiltersToolPanel",
              },
            ],
          }}
          defaultColDef={{
            sortable: true,
            filter: true,
            resizable: true,
            enablePivot: true,
            enableRowGroup: true,
            enableValue: true,
          }}
          onGridReady={handleGridReady}
          onFirstDataRendered={handleFirstDataRendered}
        />
      </div>
    </div>
  );
}
