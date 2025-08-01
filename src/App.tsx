import { useEffect, useRef, useState, useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry } from "ag-grid-community";
import {
  AllEnterpriseModule,
  IntegratedChartsModule,
} from "ag-grid-enterprise";
import { AgChartsEnterpriseModule } from "ag-charts-enterprise";
import type {
  ChartModel,
  FirstDataRenderedEvent,
  ColDef,
} from "ag-grid-community";
import { apiFetch } from "./lib/api";
import Loader from "./components/Loader";

ModuleRegistry.registerModules([
  AllEnterpriseModule,
  IntegratedChartsModule.with(AgChartsEnterpriseModule),
]);

interface GridState {
  filters: any;
  columnState: any[];
  pivotMode: boolean;
  rowGroupCols: string[];
  pivotCols: string[];
  valueCols: string[];
}

interface StatData {
  id: number | string;
  title: string;
  columns: string[];
  rows: Record<string, any>[];
  gridState?: GridState;
}

interface AppProps {
  statId: string;
  graphId: string;
}

export default function App({ statId, graphId }: AppProps) {
  const [data, setData] = useState<StatData | null>(null);
  const [chartModel, setChartModel] = useState<ChartModel | null>(null);
  const [loading, setLoading] = useState(true);
  const gridRef = useRef<AgGridReact>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchAll() {
      try {
        const raw = await apiFetch(`v1/stats/${statId}`);
        const columns = JSON.parse(raw.columns_order || "[]");
        const rows = JSON.parse(raw.json_results || "[]");
        const gridState = raw.grid_state
          ? JSON.parse(raw.grid_state)
          : undefined;

        const charts = await apiFetch(`v1/stats/graphs?stat_id=${raw.id}`);
        const selectedChart = charts.find(
          (chart: any) => String(chart.id) == graphId
        );
        const config = selectedChart?.config;
        const parsedChartModel =
          typeof config === "string" ? JSON.parse(config) : config;

        setData({
          id: raw.id,
          title: raw.title,
          columns,
          rows,
          gridState,
        });

        setChartModel(parsedChartModel);
      } catch (e) {
        console.error("Error fetching data or chart:", e);
      } finally {
        setLoading(false);
      }
    }

    fetchAll();
  }, [statId, graphId]);

  const castNumericValues = (rows: Record<string, any>[], cols: string[]) =>
    rows.map((row) => {
      const newRow: Record<string, any> = {};
      for (const key of cols) {
        const val = row[key];
        newRow[key] =
          !isNaN(val) && val !== "" && val !== null ? Number(val) : val;
      }
      return newRow;
    });

  const castedRows = useMemo(() => {
    if (!data) return [];
    return castNumericValues(data.rows, data.columns);
  }, [data]);

  const columnDefs: ColDef[] = useMemo(() => {
    if (!data) return [];

    return data.columns.map((col) => {
      const firstValue = castedRows.find(
        (row) => row[col] !== undefined && row[col] !== null
      )?.[col];
      const isNumeric = typeof firstValue === "number";

      return {
        field: col,
        filter: isNumeric ? "agNumberColumnFilter" : "agTextColumnFilter",
        type: isNumeric ? "numericColumn" : undefined,
        chartDataType: isNumeric ? "series" : "category",
        enablePivot: true,
        enableRowGroup: true,
        enableValue: true,
        sortable: true,
        resizable: true,
      };
    });
  }, [data, castedRows]);

  const handleFirstDataRendered = (event: FirstDataRenderedEvent) => {
    const api = event.api;
    const gridState = data?.gridState;

    if (gridState) {
      api.setFilterModel(gridState.filters || {});
      api.setRowGroupColumns(gridState.rowGroupCols || []);
      api.setPivotColumns(gridState.pivotCols || []);
      api.setValueColumns(gridState.valueCols || []);
      api.setPivotMode?.(gridState.pivotMode);

      if (gridState.columnState?.length > 0) {
        api.applyColumnState({
          state: gridState.columnState,
          applyOrder: true,
        });
      } else {
        api.sizeColumnsToFit();
      }
    } else {
      api.sizeColumnsToFit();
    }

    if (chartModel) {
      setTimeout(() => {
        const container = document.getElementById("chart-container");
        if (!container) {
          console.warn("Container non trovato");
          return;
        }

        container.innerHTML = "";
        const chartRef = api.restoreChart(chartModel, container);
        if (!chartRef) {
          console.warn("Impossibile ricreare il grafico");
        }
      }, 100);
    }
  };

  if (!loading && (!data || data.rows.length === 0)) {
  return <p className="text-center text-red-500">No data available</p>;
}

return (
  <div className="w-full h-full flex flex-col">
    <div className="flex-none px-4 py-2">
      <h2 className="text-xl text-center font-bold">{data?.title}</h2>
    </div>

    <div className="ag-theme-alpine hidden" style={{ height: 1, width: 1 }}>
      <AgGridReact
        ref={gridRef}
        rowData={castedRows}
        columnDefs={columnDefs}
        enableCharts={true}
        cellSelection={true}
        defaultColDef={{
          sortable: true,
          filter: true,
          resizable: true,
        }}
        onFirstDataRendered={handleFirstDataRendered}
      />
    </div>

    <div id="chart-container" className="flex-1 overflow-hidden relative">
      {loading && <Loader />}
    </div>
  </div>
);

}
