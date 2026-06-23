import Builder from "../util/Builder";
import MediationGroup from "../types/admob/MediationGroup";
import PublisherAccount from "../types/admob/PublisherAccount";
import App from "../types/App";
import AdSource from "../types/admob/AdSource";
import Helper from "./Helper";
import { DraftChanges } from "./useWaterfallChanges";
import { NetworkOptions } from "../components/AdTypeOptions";
import { TestOptionsType } from "../components/TestOptions";
import { MintegralOptions } from "../components/MintegralSpecificConfigurations";

/**
 * Non‑hook utility to run the Waterfall mutation flow for _one_ mediation group.
 * Returns only on success; throws on any error so callers can surface row‑level feedback.
 */
export async function applyWaterfallChanges(params: {
  account: PublisherAccount;
  mediationGroup: MediationGroup;
  targetedApps: Record<string, { app: App; primaries: string[] }>;
  adSources: Record<string, AdSource>;
  changes: DraftChanges;
  networkOptions?: NetworkOptions;
  testOptions?: TestOptionsType;
  mintegralOptions?: MintegralOptions | null;
  log?: (msg: string, data?: any) => void;
}): Promise<void> {
  const {
    account,
    mediationGroup,
    targetedApps,
    adSources,
    changes,
    networkOptions,
    testOptions,
    mintegralOptions,
    log = () => {},
  } = params;

  if (
    !mediationGroup.targeting?.format ||
    !mediationGroup.targeting?.platform
  ) {
    throw new Error("Mediation group is missing format/platform.");
  }

  /* 1️⃣ classify */
  const { newCalls, editCalls, deleteCalls } = Helper.classifyChanges(changes);
  log("Classified", { newCalls, editCalls, deleteCalls });

  const primaries = mediationGroup.targeting.adUnitIds ?? [];

  /* 2️⃣ prepare maps */
  const appMaps = await Helper.prepareAppMaps(
    newCalls,
    editCalls,
    targetedApps,
    mintegralOptions
  );

  /* 3️⃣ build payloads */
  const createPayload = Helper.buildCreatePayload(
    newCalls,
    targetedApps,
    appMaps
  );
  const updatePayload = await Helper.buildUpdatePayload(
    editCalls,
    account.name,
    mediationGroup,
    appMaps,
    targetedApps
  );

  /* 4️⃣ create / update units */
  const [createdRaw, updatedRaw] = await Helper.createOrUpdateUnits(
    account.name,
    mediationGroup,
    targetedApps,
    createPayload,
    updatePayload,
    log,
    networkOptions,
    mintegralOptions
  );
  const createdUnits = createdRaw.filter(Boolean);
  const updatedUnits = updatedRaw.filter(Boolean);

  /* 5️⃣ adapter‑config */
  const involvedNetworks = Array.from(
    new Set([...createdUnits, ...updatedUnits].map((u) => u.adSourceId))
  );
  const adapterConfigs = await Helper.fetchAdapterConfigs(
    mediationGroup.targeting.format,
    mediationGroup.targeting.platform,
    account.name,
    involvedNetworks
  );

  /* 6️⃣ prepare units to map */
  const unitsToMap = Helper.prepareUnitsToMap(
    [...createdUnits, ...updatedUnits],
    adapterConfigs,
    adSources,
    targetedApps
  );

  /* 7️⃣ map */
  await Builder.mapUnits(account.name, primaries, unitsToMap);

  /* 8️⃣ patch mediation group */
  const { newMappingsToPatch, editMappingsToPatch, deleteMappingsToPatch } =
    Helper.buildPatchArrays(
      newCalls,
      editCalls,
      deleteCalls,
      createdUnits,
      updatedUnits,
      []
    );

  await Builder.patchMediationGroup(
    account.name,
    mediationGroup.mediationGroupId!,
    newMappingsToPatch,
    editMappingsToPatch,
    deleteMappingsToPatch,
    mediationGroup,
    testOptions
  );
}

export default applyWaterfallChanges;
