// src/pages/Home.tsx
import { useCallback, useContext, useMemo, useState } from "react";
import styled from "styled-components";
import { Alert, Button, ButtonGroup, Paper, TextField } from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import Header from "../components/Header";
import ProgressPopup from "../components/ProgressPopup";
import WaterfallTable from "../components/WaterfallTable";
import MediationGroup, { ExperimentState } from "../types/admob/MediationGroup";
import { PubData } from "./Nav";
import App from "../types/App";
import {
  DeleteCall,
  DraftChanges,
  EditCall,
  NewCall,
  useWaterfallChanges,
} from "../util/useWaterfallChanges";
import { AuthContext } from "../util/auth/AuthProvider";
import BiddingTable from "../components/BiddingTable";
import AdTypeOptions, { NetworkOptions } from "../components/AdTypeOptions";
import TestOptions, { TestOptionsType } from "../components/TestOptions";
import MediationGroupDetails from "../components/MediationGroupDetails";
import { MintegralOptions } from "../components/MintegralSpecificConfigurations";
import { BiddingNetworkID, WaterfallNetworkID } from "../types/Networks";
import MintegralSpecificConfigurations from "../components/MintegralSpecificConfigurations";

/* ---------------------------------------------------------- */
/*  Main component                                            */
/* ---------------------------------------------------------- */

interface Props {
  data: PubData;
}

const Home: React.FC<Props> = ({ data }) => {
  const { account } = useContext(AuthContext);

  /* -------------------- selection ------------------------ */
  const [selectedMG, setSelectedMG] = useState<MediationGroup | null>(null);

  /* -------------------- derived targeted apps ------------ */
  const targetedApps: {
    [appId: string]: { app: App; primaries: string[] };
  } = useMemo(() => {
    if (!selectedMG?.targeting?.adUnitIds) return {};

    const out: {
      [appId: string]: { app: App; primaries: string[] };
    } = {};

    selectedMG.targeting.adUnitIds.forEach((unitId) => {
      const appId = data.adUnits[unitId].appId;
      if (!out[appId]) {
        out[appId] = {
          app: data.apps[appId],
          primaries: [unitId],
        };
      } else {
        out[appId].primaries.push(unitId);
      }
    });

    return out;
  }, [selectedMG, data]);

  /* -------------------- change-draft from WaterfallTable -- */
  const [draftBiddingChanges, setDraftBiddingChanges] = useState<DraftChanges>(
    {}
  );
  const [draftWaterfallChanges, setDraftWaterfallChanges] =
    useState<DraftChanges>({});
  const [networkOptions, setNetworkOptions] = useState<NetworkOptions>();
  const [networkOptionsError, setNetworkOptionsError] =
    useState<boolean>(false);

  const [mintegralOptions, setMintegralOptions] =
    useState<MintegralOptions | null>(null);

  const [testOptions, setTestOptions] = useState<TestOptionsType>();

  /* -------------------- mutation hook -------------------- */
  /* Home.tsx */
  const {
    applyChanges,
    progress: { step, percent },
    error,
    logs,
  } = useWaterfallChanges(selectedMG, account, targetedApps, data.adSources);

  const showNetworkSpecificOptions = () => {
    for (const element of [
      ...Object.values(draftBiddingChanges),
      ...Object.values(draftWaterfallChanges),
    ]) {
      if (element.type === "new") {
        const newCall = element as NewCall;
        if (
          newCall.adSourceId === BiddingNetworkID.Mintegral ||
          newCall.adSourceId === WaterfallNetworkID.Mintegral
        ) {
          return true;
        }
      } else if (element.type === "edit") {
        const editCall = element as EditCall;
        if (editCall.originalLine.adSourceId === WaterfallNetworkID.Mintegral) {
          return true;
        }
      }
    }
    return false;
  };

  const showAdTypeOptions = () => {
    for (const element of [
      ...Object.values(draftBiddingChanges),
      ...Object.values(draftWaterfallChanges),
    ]) {
      if (element.type === "new") {
        const newCall = element as NewCall;
        if (
          newCall.adSourceId === BiddingNetworkID.Pangle ||
          newCall.adSourceId === WaterfallNetworkID.Pangle ||
          newCall.adSourceId === WaterfallNetworkID.AdMob
        ) {
          return true;
        }
      } else if (element.type === "edit") {
        const editCall = element as EditCall;
        if (
          editCall.originalLine.adSourceId === WaterfallNetworkID.Pangle ||
          editCall.originalLine.adSourceId === WaterfallNetworkID.AdMob
        ) {
          return true;
        }
      }
    }
    return false;
  };

  const handleApply = useCallback(
    (withTestOptions: boolean) => {
      if (!selectedMG) return;
      const allChanges = {
        ...draftBiddingChanges,
        ...draftWaterfallChanges,
      };

      const transformedChanges: DraftChanges = withTestOptions
        ? Object.fromEntries(
            Object.entries(allChanges).flatMap(([key, call]) => {
              if (call.type === "edit") {
                return [
                  [
                    `new-${Math.random()}`,
                    {
                      type: "new",
                      adSourceId: call.originalLine.adSourceId!,
                      cpm: call.changes.cpm,
                      displayName: call.changes.displayName,
                    } satisfies NewCall,
                  ],
                  [
                    key,
                    {
                      type: "delete",
                      originalLine: call.originalLine,
                    } satisfies DeleteCall,
                  ],
                ];
              }
              return [[key, call]];
            })
          )
        : allChanges;

      applyChanges(
        transformedChanges,
        networkOptions,
        withTestOptions ? testOptions : undefined,
        mintegralOptions
      );
    },
    [
      applyChanges,
      { ...draftBiddingChanges, ...draftWaterfallChanges },
      selectedMG,
    ]
  );

  /* -------------------- render --------------------------- */
  return (
    <View>
      <ProgressPopup
        isOpen={step !== "idle"}
        status={step}
        percent={percent}
        showClose={percent === 100 || !!error}
        logs={logs}
      />

      <Container>
        <Box>
          <Header title="Mediation Group" />
          <Paper>
            <Autocomplete
              sx={{ width: "500px", alignSelf: "center", mt: 2, ml: 2, mb: 2 }}
              options={Object.values(data.mediationGroups)}
              getOptionLabel={(o) => o.displayName ?? "—"}
              onChange={(_, v) => {
                setSelectedMG(v);
                setDraftBiddingChanges({});
                setDraftWaterfallChanges({});
              }}
              renderInput={(params) => (
                <TextField {...params} label="Select Mediation Group" />
              )}
            />
          </Paper>
        </Box>
        {selectedMG &&
          selectedMG.mediationAbExperimentState === ExperimentState.RUNNING && (
            <Box>
              <Alert severity="error">
                This mediation group is currently running an A/B experiment.
              </Alert>
            </Box>
          )}
        {selectedMG &&
          selectedMG.mediationAbExperimentState !== ExperimentState.RUNNING && (
            <Box>
              <Box>
                <Header title="Details" />

                <MediationGroupDetails
                  mediationGroup={selectedMG}
                  data={data}
                />
              </Box>
              <Box style={{ marginTop: "5%" }}>
                <Header title="Bidding Lines" />
                <BiddingTable
                  key={selectedMG.mediationGroupId}
                  mediationGroup={selectedMG}
                  adSources={data.adSources}
                  onChanges={setDraftBiddingChanges}
                />
              </Box>

              <Box style={{ marginTop: " 10%" }}>
                <Header title="Waterfall Lines" />
                <WaterfallTable
                  key={selectedMG.mediationGroupId}
                  mediationGroup={selectedMG}
                  adSources={data.adSources}
                  onChanges={setDraftWaterfallChanges}
                />
              </Box>

              {showAdTypeOptions() && (
                <Box style={{ marginTop: " 10%" }}>
                  <Header title={`Ad Type Options`} />

                  <AdTypeOptions
                    format={selectedMG.targeting!.format!}
                    setNetworkOptions={setNetworkOptions}
                    setNetworkOptionsError={setNetworkOptionsError}
                  />
                </Box>
              )}

              {showNetworkSpecificOptions() && (
                <Box style={{ marginTop: " 10%" }}>
                  <Header title={`Mintegral Configurations`} />

                  <MintegralSpecificConfigurations
                    setMintegralOptions={setMintegralOptions}
                    mediationGroup={selectedMG}
                    data={data}
                  />
                </Box>
              )}

              <Box style={{ marginTop: " 10%" }}>
                <Header title={`Test Options`} />

                <TestOptions setTestOptions={setTestOptions} />
              </Box>

              <Box>
                <ButtonGroup
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  sx={{ gap: 4 }}
                >
                  <Button
                    variant="contained"
                    size="large"
                    sx={{ mt: 10, alignSelf: "center" }}
                    disabled={
                      Object.keys({
                        ...draftBiddingChanges,
                        ...draftWaterfallChanges,
                      }).length === 0 ||
                      step !== "idle" ||
                      networkOptionsError ||
                      (!mintegralOptions && showNetworkSpecificOptions())
                    }
                    onClick={() => handleApply(false)}
                  >
                    Apply Changes
                  </Button>
                  <Button
                    variant="contained"
                    size="large"
                    sx={{ mt: 10, alignSelf: "center" }}
                    disabled={
                      Object.keys({
                        ...draftBiddingChanges,
                        ...draftWaterfallChanges,
                      }).length === 0 ||
                      step !== "idle" ||
                      networkOptionsError ||
                      !testOptions?.testName ||
                      !testOptions.userAllocation ||
                      (!mintegralOptions && showNetworkSpecificOptions())
                    }
                    onClick={() => handleApply(true)}
                  >
                    Create A/B Test
                  </Button>
                </ButtonGroup>
              </Box>
            </Box>
          )}
      </Container>

      {error && <ErrorBox>⚠️ {error.message}</ErrorBox>}
    </View>
  );
};

export default Home;

/* ---------------------------------------------------------- */
/*  styles                                                    */
/* ---------------------------------------------------------- */

const View = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const Container = styled.div`
  width: 100%;
  max-width: 1200px;
  padding: 16px;
  display: flex;
  flex-direction: column;
`;

const Box = styled.div`
  margin-top: 24px;
  display: flex;
  flex-direction: column;
`;

const ErrorBox = styled.div`
  margin-top: 16px;
  color: #d00;
`;
