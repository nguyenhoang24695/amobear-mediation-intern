import {
  Alert,
  Autocomplete,
  Box,
  LinearProgress,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import MintegralMedia from "../types/mintegral/MintegralMedia";
import MintegralPlacementResponse from "../types/mintegral/MintegralPlacementResponse";
import MediationGroup from "../types/admob/MediationGroup";
import { PubData } from "../pages/Nav";
import MintegralAPI from "../util/api/MintegralAPI";

// ────────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────────

export interface MintegralSelection {
  app: MintegralMedia; // Full Mintegral app object
  placement: MintegralPlacementResponse; // Full Mintegral placement object
}

/**
 * Keyed by AdMob appId (stringified). Change to adUnitId if you need per-unit.
 */
export type MintegralOptions = Record<string, MintegralSelection>;

interface Props {
  setMintegralOptions: (map: MintegralOptions | null) => void;
  mediationGroup: MediationGroup;
  data: PubData;
}

// ────────────────────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────────────────────

export default function MintegralSpecificConfigurations({
  setMintegralOptions,
  mediationGroup,
  data,
}: Props) {
  // All Mintegral apps (fetched once)
  const [mtgApps, setMtgApps] = useState<MintegralMedia[]>([]);

  // Placements cache keyed by Mintegral app_id
  const [placementsCache, setPlacementsCache] = useState<
    Record<number, MintegralPlacementResponse[]>
  >({});

  // Current selections for each AdMob app (key = AdMob appId as string)
  const [selectionMap, setSelectionMap] = useState<MintegralOptions>({});
  const [loading, setLoading] = useState<boolean>(true);

  // ────────────────────────────────────────────────────────────────────────────
  // Fetch Mintegral data (mocked here)
  // ────────────────────────────────────────────────────────────────────────────

  const listMintegralApps = useCallback(async () => {
    setLoading(true);
    try {
      const apps = await MintegralAPI.listMedia();

      const storeIds = admobApps.map((app) => app.linkedAppInfo.appStoreId);

      const iosApps = apps.filter((app) => app.os === "IOS");
      const androidApps = apps.filter((app) => app.os === "ANDROID");

      if (mediationGroup.targeting?.platform?.toLocaleLowerCase() === "ios") {
        // For iOS, store IDs in Mintegral do not have the "id" prefix

        setMtgApps(
          iosApps.filter((filteredApp) => {
            const realPackage = filteredApp.package.replace("id", "");

            return storeIds.includes(realPackage);
          })
        );
      } else if (
        mediationGroup.targeting?.platform?.toLocaleLowerCase() === "android"
      ) {
        setMtgApps(
          androidApps.filter((filteredApp) => {
            return storeIds.includes(filteredApp.package);
          })
        );
      }
    } catch (error) {
      console.error("Failed to fetch Mintegral apps:", error);
      setMtgApps([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const getPlacements = useCallback(
    async (mtgAppId: number) => {
      setLoading(true);
      try {
        if (placementsCache[mtgAppId]) return placementsCache[mtgAppId];

        const res = await MintegralAPI.listPlacements(mtgAppId);

        setPlacementsCache((c) => ({ ...c, [mtgAppId]: res }));
        return res;
      } catch (error) {
        console.error("Failed to fetch Mintegral placements:", error);
        setPlacementsCache({});
        return [];
      } finally {
        setLoading(false);
      }
    },
    [placementsCache]
  );

  useEffect(() => {
    setMintegralOptions(null); // Reset on mount
    listMintegralApps();
  }, [listMintegralApps]);

  // ────────────────────────────────────────────────────────────────────────────
  // Derive AdMob apps in this mediation group
  // ────────────────────────────────────────────────────────────────────────────

  const admobApps = useMemo(() => {
    const ids: string[] = mediationGroup.targeting?.adUnitIds ?? [];

    const appIds = ids.filter(Boolean).map((id) => data.adUnits[id].appId);
    const apps = appIds
      .filter(Boolean)
      .map((id) => data.apps[id])
      .filter(Boolean);
    return apps ?? [];
  }, [mediationGroup, data]);

  // ────────────────────────────────────────────────────────────────────────────
  // Push finished map upward once all rows are filled
  // ────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const allDone =
      admobApps.length > 0 &&
      admobApps.every((a) => {
        const sel = selectionMap[String(a.appId)];
        return !!(sel?.app && sel?.placement);
      });

    setMintegralOptions(allDone ? selectionMap : null);
  }, [selectionMap, admobApps, setMintegralOptions]);

  // ────────────────────────────────────────────────────────────────────────────
  // Handlers
  // ────────────────────────────────────────────────────────────────────────────

  const handleSelectMtgApp = async (
    admobAppId: string,
    value: MintegralMedia | null
  ) => {
    const key = String(admobAppId);

    if (!value) {
      // Remove selection if user clears
      setSelectionMap((m) => {
        const copy = { ...m };
        delete copy[key];
        return copy;
      });
      return;
    }

    await getPlacements(value.app_id);
    setSelectionMap((m) => ({
      ...m,
      [key]: {
        app: value,
        placement:
          m[key]?.placement && m[key]?.placement.app_id === value.app_id
            ? m[key]!.placement
            : (null as unknown as MintegralPlacementResponse), // reset if old placement doesn't belong to new app
      },
    }));
  };

  const handleSelectPlacement = (
    admobAppId: string,
    value: MintegralPlacementResponse | null
  ) => {
    const key = String(admobAppId);
    setSelectionMap((m) => ({
      ...m,
      [key]: {
        app: m[key]!.app,
        placement: value as MintegralPlacementResponse,
      },
    }));
  };

  // ────────────────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────────────────

  return (
    <Paper sx={{ width: "100%" }}>
      {loading && <LinearProgress color="error" />}

      {admobApps.length === 0 && (
        <Alert severity="error" sx={{ m: 2 }}>
          No AdMob apps found in this mediation group.
        </Alert>
      )}
      {!mtgApps.length && (
        <Alert severity="error" sx={{ m: 2 }}>
          No Mintegral apps found for this AdMob app. Please check your
          credentials.
        </Alert>
      )}
      {admobApps.map((admobApp) => {
        const key = String(admobApp.appId);
        const sel = selectionMap[key];
        const placements = sel?.app
          ? placementsCache[sel.app.app_id] ?? []
          : [];

        return (
          <Box
            key={key}
            sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}
          >
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <img
                src={admobApp.linkedAppInfo?.iconUri ?? ""}
                alt="App Icon"
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                style={{ width: 40, height: 40, borderRadius: 5 }}
                onError={(e) => (e.currentTarget.style.visibility = "hidden")}
              />
              <Typography variant="subtitle2" sx={{ mb: 1, ml: 2 }}>
                {admobApp.manualAppInfo?.displayName}
              </Typography>
            </Box>

            {/* Mintegral App */}
            <Autocomplete<MintegralMedia>
              sx={{ mt: 4, maxWidth: 400 }}
              options={mtgApps}
              value={sel?.app ?? null}
              getOptionLabel={(o) => o.app_name}
              onChange={(_, value) => handleSelectMtgApp(admobApp.appId, value)}
              renderInput={(params) => (
                <TextField {...params} label="Mintegral App" />
              )}
              isOptionEqualToValue={(o, v) => o.app_id === v.app_id}
            />

            {/* Mintegral Placement */}
            <Autocomplete<MintegralPlacementResponse>
              sx={{ mt: 2, maxWidth: 400 }}
              options={placements}
              value={sel?.placement ?? null}
              getOptionLabel={(o) => o.placement_name}
              onChange={(_, value) =>
                handleSelectPlacement(admobApp.appId, value)
              }
              renderInput={(params) => (
                <TextField {...params} label="Mintegral Placement" />
              )}
              isOptionEqualToValue={(o, v) => o.placement_id === v.placement_id}
              disabled={!sel?.app}
            />
          </Box>
        );
      })}
    </Paper>
  );
}
