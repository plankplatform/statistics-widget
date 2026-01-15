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
import type { FilterModel } from "ag-grid-community";

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

function normalizeDateFilters( model: FilterModel | null | undefined): FilterModel | null {
  if (!model) return null;
  const copy: FilterModel = { ...model };
  Object.values(copy).forEach((f: any) => {
    if (f?.filterType === "date") {
      if (typeof f.dateFrom === "string") f.dateFrom = f.dateFrom.split(" ")[0];
      if (typeof f.dateTo === "string") f.dateTo = f.dateTo.split(" ")[0];
    }
  });
  return copy;
}

// Crea un widget tabella dinamico con scadenza fissata e dati provenienti da una tabella pubblica
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
          `v1/reporting/snapshots/${encodeURIComponent(token)}`
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

  const normalizeCol = (text: string) => {
    const cleaned = text.replace(/[_-]/g, " ");
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  };

  const columnDefs: ColDef[] = useMemo(() => {
    return columns.map((c) => {
      const values = castedRows.map((r) => r[c]);

      const isNumber = values.every((v) => typeof v === "number");
      const isDate = values.every(
        (v) => typeof v === "string" && !Number.isNaN(Date.parse(v))
      );

      let filter: any;
      let type: any;
      let filterParams: any;

      if (isNumber) {
        filter = "agNumberColumnFilter";
        type = "numericColumn";
      } else if (isDate) {
        filter = "agDateColumnFilter";
        type = "dateColumn";
        filterParams = {
          comparator: (filterDate: Date, cellValue: string) => {
            const cellDate = new Date(cellValue);
            const cellTime = new Date(
              cellDate.getFullYear(),
              cellDate.getMonth(),
              cellDate.getDate()
            ).getTime();
            const filterTime = new Date(
              filterDate.getFullYear(),
              filterDate.getMonth(),
              filterDate.getDate()
            ).getTime();
            if (cellTime < filterTime) return -1;
            if (cellTime > filterTime) return 1;
            return 0;
          },
        };
      } else {
        filter = "agTextColumnFilter";
      }

      return {
        colId: c,
        field: c,
        headerName: normalizeCol(c),
        filter,
        sortable: true,
        type,
        filterParams,
        chartDataType: isNumber ? "series" : "category",
        enablePivot: true,
        enableRowGroup: true,
        enableValue: true,
        resizable: true,
      };
    });
  }, [columns, castedRows]);

  const applySavedState = (api: GridApi) => {
    if (!gridState) {
      api.sizeColumnsToFit();
      return;
    }

    api.setGridOption("pivotMode", !!gridState.pivotMode);
    api.setFilterModel(normalizeDateFilters(gridState.filters || null));

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
      <div
        className="ag-theme-alpine w-full flex-1 min-h-0"
        style={{ minHeight: "70vh", height: "70vh" }}
      >
        <AgGridReact
          ref={gridRef}
          rowData={castedRows}
          columnDefs={columnDefs}
          enableCharts={true}
          cellSelection={true}
          pagination={true}
          paginationPageSize={20}
          domLayout="normal"
          pivotMode={!!gridState?.pivotMode}
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
