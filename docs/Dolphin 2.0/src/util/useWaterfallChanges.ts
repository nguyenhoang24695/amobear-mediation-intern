// src/hooks/useWaterfallChanges.ts
import { useCallback, useState } from "react";
import Builder from "../util/Builder";
import MediationGroup from "../types/admob/MediationGroup";
import MediationGroupLine from "../types/admob/MediationGroupLine";
import PublisherAccount from "../types/admob/PublisherAccount";
import App from "../types/App";
import AdSource from "../types/admob/AdSource";
import Helper from "./Helper";
import LogLine from "../types/LogLine";
import { NetworkOptions } from "../components/AdTypeOptions";
import { TestOptionsType } from "../components/TestOptions";
import { MintegralOptions } from "../components/MintegralSpecificConfigurations";

/* ---------- explicit union variants -------------------------------- */
export type NewCall = {
  type: "new";
  adSourceId: string;
  cpm?: number;
  displayName: string;
};
export type EditCall = {
  type: "edit";
  originalLine: MediationGroupLine;
  changes: { displayName: string; cpm: number };
};
export type DeleteCall = { type: "delete"; originalLine: MediationGroupLine };
export type DraftChanges = Record<string, NewCall | EditCall | DeleteCall>;

/* ---------- progress state ---------------------------------------- */
interface Progress {
  step: string;
  percent: number;
}

/* ================================================================== */
/*  HOOK                                                              */
/* ================================================================== */
export function useWaterfallChanges(
  selectedMG: MediationGroup | null,
  account: PublisherAccount | null | undefined,
  targetedApps: Record<string, { app: App; primaries: string[] }>,

  adSources: Record<string, AdSource>
) {
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [progress, setProgress] = useState<Progress>({
    step: "idle",
    percent: 0,
  });
  const [error, setError] = useState<Error | null>(null);

  const pushLog = useCallback((msg: string, data: Record<any, any>) => {
    const safe = data ? JSON.parse(Helper.safeStringify(data)) : undefined;
    setLogs((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), msg, data: safe },
    ]);
  }, []);

  /* -------------------------------------------------------------- */
  /* Main mutation handler                                          */
  /* -------------------------------------------------------------- */
  const applyChanges = useCallback(
    async (
      changes: DraftChanges,
      networkOptions: NetworkOptions | undefined,
      testOptions?: TestOptionsType,
      mintegralOptions?: MintegralOptions | null
    ) => {
      try {
        pushLog("▶️ applyChanges called with:", { changes });
        if (!selectedMG || !account) {
          throw new Error("⛔ No mediation-group or account – aborting.");
        }
        if (!selectedMG.targeting?.format || !selectedMG.targeting?.platform) {
          throw new Error(
            "⛔ MediationGroup is missing format/platform – aborting."
          );
        }

        setError(null);
        setProgress({ step: "Preparing inputs", percent: 5 });

        /* 1️⃣ classify -------------------------------------------------- */
        const { newCalls, editCalls, deleteCalls } =
          Helper.classifyChanges(changes);
        pushLog("📊 Classified calls:", { newCalls, editCalls, deleteCalls });

        setProgress({
          step: `Classified changes (new: ${newCalls.length}, edit: ${editCalls.length}, delete: ${deleteCalls.length})`,
          percent: 10,
        });

        const primaries = selectedMG.targeting.adUnitIds ?? [];

        /* 2️⃣ prepare maps --------------------------------------------- */
        const appMaps = await Helper.prepareAppMaps(
          newCalls,
          editCalls,
          targetedApps,
          mintegralOptions
        );

        console.log("App Maps:", appMaps);

        /* 3️⃣ build payloads ------------------------------------------- */
        const createPayload = Helper.buildCreatePayload(
          newCalls,
          targetedApps,
          appMaps
        );

        console.log("Create Payload:", createPayload);

        const updatePayload = await Helper.buildUpdatePayload(
          editCalls,
          account.name,
          selectedMG,
          appMaps,
          targetedApps
        );

        setProgress({ step: "Creating and updating ad units", percent: 20 });

        /* 4️⃣ create / update units ----------------------------------- */
        const [createdRaw, updatedRaw] = await Helper.createOrUpdateUnits(
          account.name,
          selectedMG,
          targetedApps,
          createPayload,
          updatePayload,
          pushLog,
          networkOptions,
          mintegralOptions
        );

        const createdUnits = createdRaw.filter(Boolean);
        const updatedUnits = updatedRaw.filter(Boolean);

        pushLog("✅ createUnits result:", createdUnits);
        pushLog("✅ updateUnits result:", updatedUnits);

        /* 5️⃣ adapter-config ------------------------------------------ */
        const involvedNetworks = Array.from(
          new Set([...createdUnits, ...updatedUnits].map((u) => u.adSourceId))
        );

        setProgress({ step: "Fetching adapter configs", percent: 35 });

        const adapterConfigs = await Helper.fetchAdapterConfigs(
          selectedMG.targeting.format,
          selectedMG.targeting.platform,
          account.name,
          involvedNetworks
        );

        /* 6️⃣ prepare units to map ------------------------------------ */
        const unitsToMap = Helper.prepareUnitsToMap(
          [...createdUnits, ...updatedUnits],
          adapterConfigs,
          adSources,
          targetedApps
        );

        console.log("Units to Map:", unitsToMap);

        /* 7️⃣ map ------------------------------------------------------ */
        setProgress({
          step: `Mapping ${unitsToMap.length} ad units`,
          percent: 45,
        });

        const mappedUnits = await Builder.mapUnits(
          account.name,
          primaries,
          unitsToMap
        ).catch((err) => {
          console.error("❌ mapUnits failed:", err);
          return [];
        });

        console.log("Mapped Units:", mappedUnits);

        pushLog("✅ mappedUnits result:", mappedUnits);
        setProgress({
          step: `Mapped ${mappedUnits.length} ad units`,
          percent: 60,
        });

        /* 8️⃣ patch mediation group ----------------------------------- */
        setProgress({ step: "Patching mediation group", percent: 75 });
        const {
          newMappingsToPatch,
          editMappingsToPatch,
          deleteMappingsToPatch,
        } = Helper.buildPatchArrays(
          newCalls,
          editCalls,
          deleteCalls,
          createdUnits,
          updatedUnits,
          mappedUnits
        );

        console.log("Mappings to Patch:", {
          newMappingsToPatch,
          editMappingsToPatch,
          deleteMappingsToPatch,
        });

        const patchRes = await Builder.patchMediationGroup(
          account.name,
          selectedMG.mediationGroupId!,
          newMappingsToPatch,
          editMappingsToPatch,
          deleteMappingsToPatch,
          selectedMG,
          testOptions
        );
        pushLog("✅ patchMediationGroup response:", patchRes);

        setProgress({ step: "Completed", percent: 100 });
      } catch (e) {
        console.error("💥 Error in applyChanges:", e);
        setError(e as Error);
        setProgress({ step: "idle", percent: 0 });
      }
    },
    [selectedMG, account, targetedApps, adSources, pushLog]
  );

  return { applyChanges, progress, error, logs };
}
