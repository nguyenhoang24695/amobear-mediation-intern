import { NetworkOptions } from "../components/AdTypeOptions";
import { MintegralOptions } from "../components/MintegralSpecificConfigurations";
import AdapterConfigMetadata from "../types/admob/AdapterConfigMetadata";
import AdSource from "../types/admob/AdSource";
import MediationGroup from "../types/admob/MediationGroup";
import MediationGroupLine from "../types/admob/MediationGroupLine";
import App from "../types/App";
import Builder from "./Builder";
import providers from "./providers";
import { CreatedUnit } from "./providers/NetworkProvider";
import {
  DeleteCall,
  DraftChanges,
  EditCall,
  NewCall,
} from "./useWaterfallChanges";

export default class Helper {
  static classifyChanges = (changes: DraftChanges) => {
    const newCalls: NewCall[] = Object.values(changes).filter(
      (c): c is NewCall => c.type === "new"
    );
    const editCalls: EditCall[] = Object.values(changes).filter(
      (c): c is EditCall => c.type === "edit"
    );
    const deleteCalls: DeleteCall[] = Object.values(changes).filter(
      (c): c is DeleteCall => c.type === "delete"
    );
    return { newCalls, editCalls, deleteCalls };
  };

  static prepareAppMaps = async (
    newCalls: NewCall[],
    editCalls: EditCall[],
    targetedApps: Record<string, { app: App; primaries: string[] }>,
    mintegralOptions?: MintegralOptions | null
  ) => {
    const adSourceIds = [
      ...newCalls.map((c) => c.adSourceId),
      ...editCalls.map((e) => e.originalLine.adSourceId!),
    ];
    const networksToPrep = Array.from(new Set(adSourceIds)).filter(
      (id) => providers[id]?.getAppMap
    );
    const appMaps: Record<string, Record<string, unknown>> = {};
    await Promise.all(
      networksToPrep.map(async (id) => {
        appMaps[id] = await providers[id]!.getAppMap!(
          targetedApps,
          mintegralOptions
        );
      })
    );
    return appMaps;
  };

  static buildCreatePayload = (
    newCalls: NewCall[],
    targetedApps: Record<string, { app: App; primaries: string[] }>,
    appMaps: Record<string, Record<string, unknown>>
  ) => {
    return newCalls.flatMap((call) => {
      const provider = providers[call.adSourceId];
      const appMap = appMaps[call.adSourceId] ?? {};
      return provider.getCreatePayload(call, targetedApps, appMap);
    });
  };

  static buildUpdatePayload = async (
    editCalls: EditCall[],
    accountName: string,
    selectedMG: MediationGroup,
    appMaps: Record<string, Record<string, unknown>>,
    targetedApps: Record<string, { app: App; primaries: string[] }>
  ) => {
    const edits = await Promise.all(
      editCalls.flatMap(async (edit) => {
        const provider = providers[edit.originalLine.adSourceId!];
        return await provider.buildUpdateEdits(edit, {
          accountName,
          mg: selectedMG,
          appMaps,
          targetedApps,
        });
      })
    );
    return edits.flat();
  };

  static createOrUpdateUnits = async (
    accountName: string,
    selectedMG: MediationGroup,
    targetedApps: Record<string, { app: App; primaries: string[] }>,
    createPayload: {
      adSourceId: string;
      displayName: string;
      cpm?: number;
      extra?: Record<string, unknown> | undefined;
    }[],
    updatePayload: {
      adSourceId: string;
      resourceName: string;
      cpm: number;
      displayName: string;
      originalLine: MediationGroupLine; // 🆕
      extra?: Record<string, unknown>;
    }[],
    logger?: (msg: string, data: any) => void,
    networkOptions?: NetworkOptions | undefined,
    mintegralOptions?: MintegralOptions | null
  ) => {
    return Promise.all([
      Builder.createUnits({
        accountName,
        mg: selectedMG,
        targetedApps,
        calls: createPayload,
        logger,
        networkOptions,
        mintegralOptions,
      }),
      Builder.updateUnits({
        accountName,
        edits: updatePayload,
        logger,
      }),
    ]);
  };

  static fetchAdapterConfigs = async (
    format: string,
    platform: string,
    accountName: string,
    involvedNetworks: string[]
  ) => {
    return await Builder.getAdapterConfigurations(
      format,
      platform,
      accountName,
      involvedNetworks
    );
  };

  static prepareUnitsToMap = (
    units: CreatedUnit[],
    adapterConfigs: Record<
      string,
      { adapterId: string; configurations: AdapterConfigMetadata[] }
    >,
    adSources: Record<string, AdSource>,
    targetedApps: Record<string, { app: App; primaries: string[] }>,
    logger?: (msg: string, data: any) => void
  ): {
    ecpmDollar: string;
    adSourceName: string;
    adSourceId: string;
    adapterId: string;
    configurations: AdapterConfigMetadata[];
  }[] => {
    console.log("Preparing units to map:", {
      units,
      adapterConfigs,
      adSources,
      targetedApps,
    });

    return units.reduce((acc, unit) => {
      const base = adapterConfigs[unit.adSourceId];
      if (!base) return acc;
      const provider = providers[unit.adSourceId];

      const configs = provider.fillAdapterConfigs(base.configurations, unit);

      if (
        configs.some((c) => c.value === undefined || c.value === "undefined")
      ) {
        logger?.("❌ skipped unit – missing adapter config", { unit });
        return acc; // skip this bad unit
      }

      acc.push({
        ecpmDollar: unit.cpm ? String(unit.cpm) : undefined,
        adSourceName: adSources[unit.adSourceId].title,
        adSourceId: unit.adSourceId,
        adapterId: base.adapterId,
        configurations: configs,
      });
      return acc;
    }, [] as any[]);
  };

  static collectMappings = (canonicalId: string, mappedUnits: any[]) => {
    const out: Record<string, string> = {};
    mappedUnits.forEach((mu) => {
      const cfg =
        (mu as any).adUnitConfigurations ??
        (mu as any).adUnitMapping?.adUnitConfigurations;
      if (cfg) {
        Object.values(cfg).forEach((v) => {
          if (v === canonicalId && mu.name) out[mu.name] = mu.name;
        });
      }
      if (Object.keys(out).length === 0 && mu.name) {
        out[mu.name] = mu.name;
      }
    });
    return out;
  };

  static buildPatchArrays = (
    newCalls: NewCall[],
    editCalls: EditCall[],
    deleteCalls: DeleteCall[],
    createdUnits: CreatedUnit[],
    updatedUnits: CreatedUnit[],
    mappedUnits: any[]
  ) => {
    /* ------------------------------------------------------------ */
    /* 1️⃣  ── NEW LINES – group by network + eCPM                   */
    /* ------------------------------------------------------------ */
    const groupedNew: Record<
      string,
      {
        adSourceId: string;
        ecpmDollar?: string;
        displayName: string;
        mappings: Record<string, string>;
      }
    > = {};

    createdUnits.forEach((u) => {
      const key = `${u.adSourceId}|${u.cpm}`; // network + eCPM
      const src = newCalls.find(
        (c) => c.adSourceId === u.adSourceId && c.cpm === u.cpm
      );

      if (!groupedNew[key]) {
        groupedNew[key] = {
          adSourceId: u.adSourceId,
          ecpmDollar: u.cpm ? String(u.cpm) : undefined,
          displayName: src?.displayName ?? "",
          mappings: {},
        };
      }

      // merge mappings coming from this concrete unit
      Object.assign(
        groupedNew[key].mappings,
        this.collectMappings(u.canonicalId, mappedUnits)
      );
    });

    const newMappingsToPatch = Object.values(groupedNew);

    /* ------------------------------------------------------------ */
    /* 2️⃣  ── EDIT LINES – collapse duplicates by identifier        */
    /* ------------------------------------------------------------ */
    const tmpEdits: Record<
      string,
      {
        identifier: string;
        adSourceId: string;
        ecpmDollar: string;
        displayName: string;
        mappings: Record<string, string>;
      }
    > = {};

    updatedUnits.forEach((u) => {
      const id = u.originalLine?.id ?? "";
      if (!id) return;

      if (!tmpEdits[id]) {
        const src = editCalls.find((e) => e.originalLine === u.originalLine);
        tmpEdits[id] = {
          identifier: id,
          adSourceId: u.adSourceId,
          ecpmDollar: String(u.cpm),
          displayName:
            src?.changes.displayName ?? u.originalLine!.displayName ?? "",
          mappings: {},
        };
      }

      Object.assign(
        tmpEdits[id].mappings,
        this.collectMappings(u.canonicalId, mappedUnits)
      );
    });

    const editMappingsToPatch = Object.values(tmpEdits);

    /* ------------------------------------------------------------ */
    /* 3️⃣  ── DELETE LINES – unchanged                              */
    /* ------------------------------------------------------------ */
    const deleteMappingsToPatch = deleteCalls.map((d) => ({
      identifier: d.originalLine.id ?? "",
    }));

    return { newMappingsToPatch, editMappingsToPatch, deleteMappingsToPatch };
  };

  static safeStringify(value: unknown, indent = 2): string {
    const seen = new WeakSet();
    return JSON.stringify(
      value,
      (key, val) => {
        if (typeof val === "object" && val !== null) {
          if (seen.has(val)) return "[Circular]";
          seen.add(val);
        }
        // skip functions – they blow up stringify & aren't useful in UI
        if (typeof val === "function")
          return `[Function ${val.name || "anon"}]`;
        return val;
      },
      indent
    );
  }
}
