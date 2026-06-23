import styled from "styled-components";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Skeleton,
  TextField,
} from "@mui/material";
import { AuthContext } from "../util/auth/AuthProvider";
import AdMobAPI from "../util/api/AdMobAPI";
import AdMobAbExperiment from "../types/admob/AdMobAbExperiment";
import { ExperimentState } from "../types/admob/MediationAbExperiment";
import { PubData } from "./Nav";
import { fDateTime } from "../util/TimeFormat";
import { VariantChoice } from "../types/admob/request/StopMediationAbExperimentsRequest";

interface PropTypes {
  data: PubData;
}

const Experiments = ({ data }: PropTypes) => {
  const { account } = useContext(AuthContext);
  const [experiments, setExperiments] = useState<AdMobAbExperiment[]>([]);
  const [search, setSearch] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    variant: VariantChoice;
    exp: AdMobAbExperiment;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const listExperiments = useCallback(async (accountName: string) => {
    if (!accountName) return;
    setLoading(true);
    try {
      const response = await AdMobAPI.listABExperiments(accountName);
      setExperiments(response.admobAbExperiments ?? []);
    } catch (error) {
      console.error("Failed to fetch experiments:", error);
      setExperiments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (account) {
      listExperiments(account.name);
    }
  }, [account]);

  // Map experiments to rows with a stable id
  const experimentByName = useMemo(() => {
    const map = new Map<string, AdMobAbExperiment>();
    experiments.forEach((e) => map.set(e.mediationAbExperiment.name, e));
    return map;
  }, [experiments]);

  // --- rows for the grid -------------------------------------
  const rows = useMemo(() => {
    return experiments
      .filter((e) =>
        e.mediationAbExperiment.displayName
          .toLowerCase()
          .includes(search.toLowerCase())
      )
      .sort((a) => (a.mediationAbExperiment.state === "RUNNING" ? -1 : 1))
      .map((e) => ({
        /* 👇 UNIQUE id – the full resource name is always present */
        name: e.mediationAbExperiment.name,
        displayName: e.mediationAbExperiment.displayName,

        // ⬇️ store raw dates, not formatted text
        startTime: new Date(e.mediationAbExperiment.startTime),
        endTime: new Date(e.mediationAbExperiment.endTime),

        mgName:
          data.mediationGroups[e.mediationAbExperiment.mediationGroupId]
            ?.displayName,
        split:
          e.mediationAbExperiment.treatmentTrafficPercentage +
          "/" +
          (100 - Number(e.mediationAbExperiment.treatmentTrafficPercentage)),
        state: e.mediationAbExperiment.state,
        variantLeader: e.mediationAbExperiment.variantLeader,
      }));
  }, [experiments, search, data.mediationGroups]);

  // --- columns ------------------------------------------------
  const columns: GridColDef[] = [
    {
      field: "startTime",
      headerName: "Start",
      type: "dateTime", // tells the grid it’s a date
      flex: 0.5,
    },
    {
      field: "endTime",
      headerName: "End",
      type: "dateTime",
      flex: 0.5,
    },
    { field: "mgName", headerName: "Mediation Group", flex: 1 },
    { field: "displayName", headerName: "Name", flex: 1 },
    { field: "split", headerName: "Split (A/B)", flex: 0.5 },
    { field: "state", headerName: "State" },
    { field: "variantLeader", headerName: "Leader" },
    {
      field: "actions",
      headerName: "Choose Variant",
      flex: 1,
      renderCell: (params) =>
        params.row.state === ExperimentState.RUNNING ? (
          <ButtonGroup
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            {["A", "B"].map((label, i) => (
              <Button
                key={label}
                size="small"
                variant="outlined"
                onClick={() => {
                  const exp = experimentByName.get(params.id as string);
                  if (!exp) return;
                  setPendingAction({
                    variant:
                      i === 0
                        ? VariantChoice.VARIANT_CHOICE_A
                        : VariantChoice.VARIANT_CHOICE_B,
                    exp,
                  });
                  setConfirmOpen(true);
                }}
              >
                Variant {label}
              </Button>
            ))}
          </ButtonGroup>
        ) : (
          "-"
        ),
    },
  ];

  return (
    <View>
      <TextField
        label="Search by Experiment Name"
        variant="outlined"
        fullWidth
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 16 }}
      />

      {loading && <LinearProgress />}
      <DataGrid
        rows={rows}
        columns={columns}
        getRowId={(row) => row.name}
        autoHeight
      />

      {confirmOpen && pendingAction && (
        <Dialog open onClose={() => setConfirmOpen(false)}>
          <DialogTitle>Confirm Variant</DialogTitle>
          <DialogContent>
            Are you sure you want to stop this experiment and select{" "}
            <b>
              {pendingAction.variant === VariantChoice.VARIANT_CHOICE_A
                ? "Variant A"
                : "Variant B"}
            </b>{" "}
            for mediation group{" "}
            <b>
              {
                data.mediationGroups[
                  pendingAction.exp.mediationAbExperiment.mediationGroupId
                ].displayName
              }
            </b>
            ?
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                if (!account || !pendingAction) return;
                await AdMobAPI.stopMediationAbExperiments(
                  account.name,
                  pendingAction.exp.mediationAbExperiment.mediationGroupId,
                  { variantChoice: pendingAction.variant }
                );
                setConfirmOpen(false);
                listExperiments(account.name); // refresh list
              }}
              variant="contained"
              color="primary"
            >
              Confirm
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </View>
  );
};

export default Experiments;

const View = styled.div`
  display: flex;
  flex-direction: column;
  padding: 16px;
  width: 100%;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
`;
