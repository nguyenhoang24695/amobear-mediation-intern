import React, { useCallback, useContext, useState } from "react";
import styled from "styled-components";
import { Alert, Button, Paper } from "@mui/material";
import Papa from "papaparse";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import Header from "../components/Header";
import ProgressPopup from "../components/ProgressPopup";
import { AuthContext } from "../util/auth/AuthProvider";
import { PubData } from "./Nav";
import { DraftChanges } from "../util/useWaterfallChanges";
import MediationGroup, { ExperimentState } from "../types/admob/MediationGroup";
import App from "../types/App";
import applyWaterfallChanges from "../util/applyWaterfallChanges";

/* ---------------------------------------------------------- */
/*  Types                                                     */
/* ---------------------------------------------------------- */
interface Props {
  data: PubData;
}

interface CsvRow {
  id: string;
  mediationGroupId: string;
  adSourceId: string;
  ecpm: number;
  status: "pending" | "processing" | "success" | "error";
  message?: string;
}

/* ---------------------------------------------------------- */
/*  Helpers                                                   */
/* ---------------------------------------------------------- */
function buildTargetedApps(selectedMG: MediationGroup | null, data: PubData) {
  if (!selectedMG?.targeting?.adUnitIds)
    return {} as Record<string, { app: App; primaries: string[] }>;

  return selectedMG.targeting.adUnitIds.reduce(
    (acc, unitId) => {
      const appId = data.adUnits[unitId].appId;
      if (!acc[appId]) {
        acc[appId] = { app: data.apps[appId], primaries: [unitId] };
      } else {
        acc[appId].primaries.push(unitId);
      }
      return acc;
    },
    {} as Record<string, { app: App; primaries: string[] }>
  );
}

/* ---------------------------------------------------------- */
/*  Component                                                 */
/* ---------------------------------------------------------- */
const CSVUpload: React.FC<Props> = ({ data }) => {
  const { account } = useContext(AuthContext);

  /* ------------------------ state ------------------------- */
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  /* ------------------------ CSV parsing ------------------- */
  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files?.length) return;
      const file = e.target.files[0];
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim().toLowerCase(),
        complete: ({ data: parsed }) => {
          const mapped: CsvRow[] = (parsed as any[]).map((d, idx) => ({
            id: `row-${idx}-${Math.random()}`,
            mediationGroupId: d["mediation group id"].trim(),
            adSourceId: d["ad source id"].trim(),
            ecpm: parseFloat(d["ecpm"]),
            status: "pending",
          }));
          setRows(mapped);
          setGlobalError(null);
        },
        error: (err) => setGlobalError(err.message),
      });
    },
    []
  );

  /* ------------------------ row colours ------------------- */
  const getRowClassName = (params: { row: CsvRow }) => {
    switch (params.row.status) {
      case "processing":
        return "processing-row";
      case "success":
        return "success-row";
      case "error":
        return "error-row";
      default:
        return "";
    }
  };

  /* ------------------------ apply logic ------------------- */
  const applyAll = async () => {
    if (!account) {
      setGlobalError("No publisher account in context.");
      return;
    }

    setProcessing(true);
    const copy = [...rows];

    for (let i = 0; i < copy.length; i++) {
      const r = copy[i];
      copy[i] = { ...r, status: "processing", message: undefined };
      setRows([...copy]);
      try {
        const mg = data.mediationGroups[r.mediationGroupId];
        if (!mg)
          throw new Error(`Mediation Group ${r.mediationGroupId} not found`);
        if (mg.mediationAbExperimentState === ExperimentState.RUNNING) {
          throw new Error(
            `Mediation Group ${mg.displayName} is running an A/B test`
          );
        }

        const changes: DraftChanges = {
          [`new-${Math.random()}`]: {
            type: "new",
            adSourceId: r.adSourceId,
            cpm: r.ecpm,
            displayName: `${r.adSourceId} ${r.ecpm}`,
          },
        };

        const targetedApps = buildTargetedApps(mg, data);

        await applyWaterfallChanges({
          account,
          mediationGroup: mg,
          targetedApps,
          adSources: data.adSources,
          changes,
        });

        copy[i] = { ...copy[i], status: "success" };
        setRows([...copy]);
      } catch (err: any) {
        copy[i] = {
          ...copy[i],
          status: "error",
          message: err.message || String(err),
        };
        setRows([...copy]);
      }
    }

    setProcessing(false);
  };

  /* ------------------------ grid cols --------------------- */
  const columns: GridColDef[] = [
    { field: "mediationGroupId", headerName: "Mediation Group ID", flex: 1 },
    { field: "adSourceId", headerName: "Ad Source ID", flex: 1 },
    { field: "ecpm", headerName: "eCPM", flex: 0.6, type: "number" },
    {
      field: "status",
      headerName: "Status",
      flex: 0.7,
      renderCell: (params) => {
        const { status } = params.row as CsvRow;
        switch (status) {
          case "processing":
            return "⌛ Processing";
          case "success":
            return "✅ Success";
          case "error":
            return "❌ Error";
          default:
            return "—";
        }
      },
    },
    {
      field: "message",
      headerName: "Message",
      flex: 2,
      sortable: false,
      filterable: false,
    },
  ];

  /* ------------------------ render ------------------------ */
  return (
    <View>
      <ProgressPopup
        isOpen={processing}
        status={processing ? "Processing" : "idle"}
        percent={0}
        logs={[]}
        showClose={false}
      />
      <Container>
        <Header title="CSV Upload" />
        <Paper sx={{ p: 2, mb: 4 }}>
          <input type="file" accept=".csv" onChange={handleFileUpload} />
        </Paper>

        {globalError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {globalError}
          </Alert>
        )}

        {rows.length > 0 && (
          <>
            <Paper sx={{ height: 500, width: "100%" }}>
              <DataGrid
                rows={rows}
                columns={columns}
                getRowClassName={getRowClassName}
                disableRowSelectionOnClick
              />
            </Paper>
            <Button
              variant="contained"
              size="large"
              sx={{ mt: 4, alignSelf: "center" }}
              disabled={processing}
              onClick={applyAll}
            >
              Apply All
            </Button>
          </>
        )}
      </Container>
    </View>
  );
};

export default CSVUpload;

/* ---------------------------------------------------------- */
/*  styles                                                    */
/* ---------------------------------------------------------- */
const View = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;

  .processing-row {
    background-color: #fff9c4;
  }
  .success-row {
    background-color: #c8e6c9;
  }
  .error-row {
    background-color: #ffcdd2;
  }
`;

const Container = styled.div`
  width: 100%;
  max-width: 1200px;
  padding: 16px;
  display: flex;
  flex-direction: column;
`;
