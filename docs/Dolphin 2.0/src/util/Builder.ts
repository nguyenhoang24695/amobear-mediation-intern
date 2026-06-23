/* ------------------------------------------------------------------ */
/*  util/Builder.ts                                                   */
/* ------------------------------------------------------------------ */

import AdMobAPI from "./api/AdMobAPI";
import {
  CreateUnitInput,
  UpdateUnitInput,
  CreatedUnit,
} from "./providers/NetworkProvider";
import providers from "./providers"; // the registry
import AdapterConfigMetadata from "../types/admob/AdapterConfigMetadata";
import AdSource from "../types/admob/AdSource";
import MediationGroup from "../types/admob/MediationGroup";
import AdUnitMapping from "../types/admob/AdUnitMapping";
import PublisherAccount from "../types/admob/PublisherAccount";
import MediationReportSpec, {
  Dimension,
  Metric,
} from "../types/admob/MediationReport";
import MediationGroupLine from "../types/admob/MediationGroupLine";
import Helper from "./Helper";
import App from "../types/App";
import { NetworkOptions } from "../components/AdTypeOptions";
import { TestOptionsType } from "../components/TestOptions";
import { MintegralOptions } from "../components/MintegralSpecificConfigurations";

/* ------------------------------------------------------------------ */
/*  Utility helpers – unchanged                                       */
/* ------------------------------------------------------------------ */

// util/Builder.ts  (top of the file)

// util/Builder.ts
type Safe<T> = { ok: true; value: T } | { ok: false; error: unknown };

export async function safe<T>(
  label: string,
  work: () => Promise<T>,
  log?: (msg: string, data?: any) => void
): Promise<Safe<T>> {
  try {
    return { ok: true, value: await work() };
  } catch (e) {
    log?.(`❌ ${label}`, { error: Helper.safeStringify(e) });
    console.error(label, e);
    return { ok: false, error: e };
  }
}
export default class Builder {
  /* ---------- price helpers ---------- */

  static dollarToMicros(dollars: number): string {
    return String(Math.round(dollars * 1_000_000));
  }

  static microsToDollar(micros: number): string {
    return (micros / 1_000_000).toString();
  }

  /* ---------- misc filters ---------- */

  static filterWaterfallSources(adSources: AdSource[]) {
    return adSources.filter(
      (s) =>
        !s.title.toLowerCase().includes("bidding") &&
        s.title !== "AdMob Network" &&
        s.title !== "Custom Event"
    );
  }

  /* ------------------------------------------------------------------ */
  /*  1.  Create ad-units across networks                               */
  /* ------------------------------------------------------------------ */

  /**
   * @param calls one object per NEW waterfall line the UI collected
   *              (all calls belonging to the same network may have different
   *               primary ad-units – we handle that inside the provider).
   */
  static async createUnits(params: {
    accountName: string;
    mg: MediationGroup;
    targetedApps: Record<string, { app: App; primaries: string[] }>;
    calls: {
      adSourceId: string;
      displayName: string;
      cpm?: number;
      extra?: Record<string, unknown>;
    }[];
    logger?: (msg: string, data: any) => void;
    networkOptions?: NetworkOptions | undefined;
    mintegralOptions?: MintegralOptions | null;
  }): Promise<CreatedUnit[]> {
    if (!params.calls.length) return [];

    /* group calls by network and fan-out to their providers */
    const grouped = params.calls.reduce<Record<string, typeof params.calls>>(
      (acc, c) => {
        const key = c.adSourceId;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(c);
        return acc;
      },
      {}
    );

    const out: CreatedUnit[] = [];

    for (const [networkId, calls] of Object.entries(grouped)) {
      const provider = providers[networkId];

      const inputs: CreateUnitInput[] = calls.map((c) => ({
        accountName: params.accountName,
        mg: params.mg,
        targetedApps: params.targetedApps,
        ecpm: c.cpm,
        displayName: c.displayName,
        extra: c.extra,
      }));

      const res = await safe(
        `createUnits(${provider.id})`,
        () =>
          provider.createUnits(
            inputs,
            params.networkOptions,
            params.mintegralOptions
          ),
        params.logger // <- NEW (see hook)
      );

      if (res.ok) out.push(...res.value);
    }

    return out;
  }

  /* ------------------------------------------------------------------ */
  /*  2.  Update existing ad-units (optional per provider)              */
  /* ------------------------------------------------------------------ */

  static async updateUnits(params: {
    accountName: string;
    edits: {
      adSourceId: string;
      resourceName: string;
      cpm: number;
      displayName: string;
      originalLine: MediationGroupLine; // 🆕
      extra?: Record<string, unknown>;
    }[];
    logger?: (msg: string, data: any) => void;
  }): Promise<CreatedUnit[]> {
    if (!params.edits.length) return [];

    const grouped = params.edits.reduce<Record<string, typeof params.edits>>(
      (acc, e) => {
        const key = e.adSourceId;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(e);
        return acc;
      },
      {}
    );

    const out: CreatedUnit[] = [];

    for (const [networkId, edits] of Object.entries(grouped)) {
      const provider = providers[networkId];

      const inputs: UpdateUnitInput[] = edits.map((e) => ({
        accountName: params.accountName,
        resourceName: e.resourceName,
        ecpm: e.cpm,
        displayName: e.displayName,
        originalLine: e.originalLine, // ✅,
        extra: e.extra,
      }));

      const res = await safe(
        `updateUnits(${provider.id})`,
        () => provider.updateUnits(inputs),
        params.logger // <- NEW (see hook)
      );

      if (res.ok) out.push(...res.value);
    }

    return out;
  }

  /* ------------------------------------------------------------------ */
  /*  3.  Adapter-config lookup for mapping                             */
  /* ------------------------------------------------------------------ */

  /**
   * Returns a dict keyed by `adSourceId` containing `{ adapterId, configs }`
   * These are required when we later call `mapUnits`.
   */
  static async getAdapterConfigurations(
    format: string,
    platform: string,
    accountName: string,
    adSourceIds: string[]
  ): Promise<
    Record<
      string,
      { adapterId: string; configurations: AdapterConfigMetadata[] }
    >
  > {
    const entries = await Promise.all(
      adSourceIds.map(async (id) => {
        const p = providers[id];
        if (!p)
          throw new Error(
            `No provider registered for '${id}' (needed for adapter config)`
          );

        const { adapterId, configs } = await p.getAdapterConfig(
          format,
          platform,
          accountName
        );
        return [id, { adapterId, configurations: configs }] as const;
      })
    );

    return Object.fromEntries(entries);
  }

  /* ------------------------------------------------------------------ */
  /*  4.  Batch-map (AdMob API)                                         */
  /* ------------------------------------------------------------------ */

  /**
   * Wraps the `accounts/.../adUnitMappings:batchCreate` endpoint so that the
   * UI can link third-party placements / AdMob units to primary ad-units.
   */
  /* ------------------------------------------------------------------ */
  /* util/Builder.ts – only the mapUnits() function                      */
  /* ------------------------------------------------------------------ */

  static async mapUnits(
    accountName: string,
    primaries: string[],
    adUnitsToBeMapped: {
      ecpmDollar: string;
      adSourceName: string;
      adSourceId: string;
      adapterId: string;
      configurations: AdapterConfigMetadata[];
    }[],
    logger?: (msg: string, data: any) => void
  ): Promise<AdUnitMapping[]> {
    /* The old implementation already did a correct round-robin distribution;
       we keep that but with shorter code. */
    const requests = adUnitsToBeMapped.map((item, idx) => {
      const mappingAccount = `${accountName}/adUnits/${
        primaries[idx % primaries.length].split("/")[1]
      }`;

      const configs: Record<string, string> = {};
      item.configurations.forEach((c) => {
        if (c.adapterConfigMetadataId !== undefined && c.value !== undefined) {
          configs[c.adapterConfigMetadataId] = c.value;
        }
      });

      return {
        parent: mappingAccount,
        adUnitMapping: {
          adUnitConfigurations: configs,
          adapterId: item.adapterId,
          displayName: item.ecpmDollar
            ? `${item.adSourceName} $${item.ecpmDollar}`
            : item.adSourceName,
        },
      };
    });

    const result = await safe(
      "mapUnits",
      () => AdMobAPI.batchCreateAdUnitMappings(accountName, { requests }),
      logger // the one passed in createUnits
    );

    return result.ok ? result.value.adUnitMappings : [];
  }

  /* ------------------------------------------------------------------ */
  /*  5.  Mediation-group patch                                         */
  /*      (same algorithm you already had – omitted for brevity)        */
  /* ------------------------------------------------------------------ */
  /*   ... keep your existing patchMediationGroup implementation here   */
  /* ------------------------------------------------------------------ */
  static patchMediationGroup = async (
    accountName: string,
    mediationGroupId: string,
    newCalls: {
      adSourceId: string;
      ecpmDollar?: string;
      displayName: string;
      mappings: { [primaryUnitId: string]: string };
    }[],
    editCalls: {
      identifier: string;

      adSourceId: string;
      ecpmDollar: string;
      displayName: string;
      mappings: { [primaryUnitId: string]: string };
    }[],
    deleteCalls: { identifier: string }[],
    mediationGroup: MediationGroup,
    testOptions?: TestOptionsType
  ) => {
    console.log("Patch Mediation Group:", {
      accountName,
      mediationGroupId,
      newCalls,
      editCalls,
      deleteCalls,
    });

    const newCallsToBePatched = newCalls.map((item, index) => {
      const mappings = Object.values(item.mappings).reduce(
        (acc: { [key: string]: string }, item) => {
          // Extract the ad unit key (ca-app-pub-[publisher_id]/[ad_unit_id])
          const match = item.match(/accounts\/(pub-\d+)\/adUnits\/(\d+)/);

          if (match) {
            const adUnitKey = `ca-app-${match[1]}/${match[2]}`;
            acc[adUnitKey] = item;
          }

          return acc;
        },
        {}
      );

      const identifier = `-${String(index + 1)}`;
      const mask = `mediationGroupLines["${identifier}"]`;
      const setup = {
        displayName: item.displayName,
        adSourceId: item.adSourceId,
        cpmMode: item.ecpmDollar ? "MANUAL" : "LIVE",
        state: "ENABLED",
        cpmMicros: item.ecpmDollar
          ? String(Builder.dollarToMicros(parseFloat(item.ecpmDollar)))
          : undefined,
        adUnitMappings: mappings,
      };

      return { identifier, setup, mask };
    });

    const editCallsToBePatched = editCalls.map((item, index) => {
      const identifier = item.identifier;
      const creationCounter = `-${String(index + 50)}`;
      const mask = `mediationGroupLines["${identifier}"].state,mediationGroupLines["${creationCounter}"]`;

      const mappings = Object.values(item.mappings).reduce(
        (acc: { [key: string]: string }, item) => {
          // Extract the ad unit key (ca-app-pub-[publisher_id]/[ad_unit_id])
          const match = item.match(/accounts\/(pub-\d+)\/adUnits\/(\d+)/);

          if (match) {
            const adUnitKey = `ca-app-${match[1]}/${match[2]}`;
            acc[adUnitKey] = item;
          }

          return acc;
        },
        {}
      );

      const setups = {
        [identifier]: { state: "REMOVED" },
        [creationCounter]: {
          displayName: item.displayName,
          adSourceId: item.adSourceId,
          cpmMode: "MANUAL",
          state: "ENABLED",
          cpmMicros: String(
            Builder.dollarToMicros(parseFloat(item.ecpmDollar))
          ),
          adUnitMappings: mappings,
        },
      };

      return { identifier, setups, mask };
    });

    const deleteCallsToBePatched = deleteCalls.map((item, index) => {
      const identifier = item.identifier;
      const mask = `mediationGroupLines["${identifier}"].state`;

      const setups = { [identifier]: { state: "REMOVED" } };

      return { identifier, setups, mask };
    });

    // Output for {identifier: setup}
    const identifierSetupPairsNew = Object.fromEntries(
      newCallsToBePatched.map(({ identifier, setup }) => [identifier, setup])
    );

    const identifierSetupPairsEdit = Object.fromEntries(
      editCallsToBePatched.flatMap(
        ({ setups }) => Object.entries(setups) // Extract each [identifier, setup] pair from setups
      )
    );

    const identifierSetupPairsDelete = Object.fromEntries(
      deleteCallsToBePatched.flatMap(
        ({ setups }) => Object.entries(setups) // Extract each [identifier, setup] pair from setups
      )
    );

    const combinedIdentifierSetupPairs = {
      ...identifierSetupPairsNew,
      ...identifierSetupPairsEdit,
      ...identifierSetupPairsDelete,
    };

    // Output for comma-separated mask
    const maskListNew = newCallsToBePatched.map(({ mask }) => mask).join(",");
    const maskListEdit = editCallsToBePatched.map(({ mask }) => mask).join(",");
    const maskListDelete = deleteCallsToBePatched
      .map(({ mask }) => mask)
      .join(",");

    const combinedMaskList = [maskListNew, maskListEdit, maskListDelete]
      .filter(Boolean)
      .join(",");

    if (testOptions) {
      const currentLinesArr = Object.values(
        mediationGroup.mediationGroupLines ?? {}
      ).map((item) => ({ mediationGroupLine: item }));

      const deletedIds = deleteCallsToBePatched.map((d) => d.identifier);
      const withDeleted = currentLinesArr.filter((line) => {
        if (line && line.mediationGroupLine.id) {
          return !deletedIds.includes(line.mediationGroupLine.id);
        }
      });

      const added = Object.values(identifierSetupPairsNew).map((item) => ({
        mediationGroupLine: item,
      }));

      const withAll = [...withDeleted, ...added].map((item: any) => {
        delete item.mediationGroupLine.id;
        return item;
      });

      const patchResponse = await AdMobAPI.createABExperiment(
        accountName,
        mediationGroupId,
        testOptions.testName,
        testOptions.userAllocation,
        withAll
      );
      return patchResponse;
    } else {
      const patchResponse = await AdMobAPI.patchMediationGroup(
        accountName,
        mediationGroupId,
        combinedMaskList,
        combinedIdentifierSetupPairs
      );
      return patchResponse;
    }
  };

  /* ------------------------------------------------------------------ */
  /*  6.  Mediation report helper (unchanged)                           */
  /* ------------------------------------------------------------------ */

  static async generateMediationReport(
    account: PublisherAccount,
    mediationGroupId: string
  ): Promise<{ earnings: string; matchRate: string; cpm: string }> {
    const today = new Date(Date.now() - 24 * 60 * 60 * 1000); // yesterday
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const spec: MediationReportSpec = {
      dimensionFilters: [
        {
          dimension: Dimension.MEDIATION_GROUP,
          matchesAny: {
            values: [`ca-app-${account.publisherId}:mg:${mediationGroupId}`],
          },
        },
      ],
      dateRange: {
        startDate: {
          year: sevenDaysAgo.getFullYear(),
          month: sevenDaysAgo.getMonth() + 1, // Month is 1-based in API
          day: sevenDaysAgo.getDate(),
        },
        endDate: {
          year: today.getFullYear(),
          month: today.getMonth() + 1,
          day: today.getDate(),
        },
      },
      dimensions: [],
      metrics: [
        Metric.OBSERVED_ECPM,
        Metric.MATCH_RATE,
        Metric.ESTIMATED_EARNINGS,
      ],
      localizationSettings: { currencyCode: "USD", languageCode: "en-US" },
    };

    const rows = await AdMobAPI.generateMediationReport(account.name, spec);
    const row = rows.find((r) => r.row)?.row?.metricValues;

    const earnings = row?.ESTIMATED_EARNINGS?.microsValue
      ? "$" +
        Number(
          this.microsToDollar(+row.ESTIMATED_EARNINGS.microsValue)
        ).toFixed(2)
      : "Unavailable";

    const matchRate =
      row?.MATCH_RATE?.doubleValue != null
        ? (row.MATCH_RATE.doubleValue * 100).toFixed(2) + "%"
        : "Unavailable";

    const cpm = row?.OBSERVED_ECPM?.microsValue
      ? "$" +
        Number(this.microsToDollar(+row.OBSERVED_ECPM.microsValue)).toFixed(2)
      : "Unavailable";

    return { earnings, matchRate, cpm };
  }
}
