/**
 * 100 % generic contract that every network module must follow.
 * Nothing here is AdMob- or Network-specific.
 */

import AdapterConfigMetadata from "../../types/admob/AdapterConfigMetadata";
import App from "../../types/App";
import ChartboostPlacementResponse from "../../types/chartboost/ChartboostPlacementResponse";
import InMobiPlacementResponse from "../../types/inmobi/InMobiPlacementResponse";
import LiftoffPlacementResponse from "../../types/liftoff/LiftoffPlacementResponse";
import MediationGroup from "../../types/admob/MediationGroup";
import MediationGroupLine from "../../types/admob/MediationGroupLine";
import { EditCall, NewCall } from "../useWaterfallChanges";
import PanglePlacementResponse from "../../types/pangle/PanglePlacementResponse";
import MintegralUnitResponse from "../../types/mintegral/MintegralUnitResponse";
import MintegralPlacementResponse from "../../types/mintegral/MintegralPlacementResponse";
import { NetworkOptions } from "../../components/AdTypeOptions";
import { MintegralOptions } from "../../components/MintegralSpecificConfigurations";

export interface CreateUnitInput {
  accountName: string;
  mg: MediationGroup;
  /**  primary ad-unit ids (for mapping later) */
  targetedApps: Record<string, { app: App; primaries: string[] }>;
  ecpm?: number;
  displayName: string;
  extra?: Record<string, unknown>;
}

export interface UpdateUnitInput {
  accountName: string;
  resourceName: string;
  ecpm: number;
  displayName: string;
  originalLine: MediationGroupLine;
  extra?: Record<string, unknown>; // ← add
}

export interface CreatedUnit {
  canonicalId: string;
  networkId: string;
  cpm?: number;
  adSourceId: string;
  originalLine?: MediationGroupLine;
  /* NEW */ extra?: Record<string, unknown>; // 🆕
  primaryAdUnit?: string;
}

export interface AdapterConfigInfo {
  adapterId: string;
  configs: AdapterConfigMetadata[];
}

export interface NetworkProvider {
  readonly id: string; // NetworkID

  createUnits(
    inputs: CreateUnitInput[],
    networkOptions?: NetworkOptions | undefined,
    mintegralOptions?: MintegralOptions | null
  ): Promise<CreatedUnit[]>;
  updateUnits(inputs: UpdateUnitInput[]): Promise<CreatedUnit[]>;
  /** Boiler-plate config that Builder needs when mapping */
  getAdapterConfig(
    format: string,
    platform: string,
    accountName: string
  ): Promise<AdapterConfigInfo>;

  resolvePlacementId?(
    accountName: string,
    line: MediationGroupLine,
    appId: string,
    format: string,
    platform: string
  ): Promise<
    | LiftoffPlacementResponse
    | InMobiPlacementResponse
    | ChartboostPlacementResponse
    | PanglePlacementResponse
    | MintegralUnitResponse
    | undefined
  >;

  getAppMap?(
    targetedApps: Record<string, { app: App; primaries: string[] }>,
    mintegralOptions?: MintegralOptions | null
  ): Promise<Record<string, unknown>>;

  getCreatePayload(
    call: NewCall,
    targetedApps: Record<string, { app: App; primaries: string[] }>,
    appMap: Record<string, unknown>
  ): {
    adSourceId: string;
    displayName: string;
    cpm?: number;
    extra?: Record<string, unknown>;
  }[];

  buildUpdateEdits(
    edit: EditCall,
    ctx: {
      accountName: string;
      mg: MediationGroup;
      appMaps: Record<string, unknown>;
      targetedApps: Record<string, { app: App; primaries: string[] }>;
    }
  ): Promise<
    {
      adSourceId: string;
      resourceName: string;
      cpm: number;
      displayName: string;
      originalLine: MediationGroupLine;
      extra?: Record<string, unknown>;
    }[]
  >;

  fillAdapterConfigs(
    template: AdapterConfigMetadata[],
    unit: CreatedUnit
  ): AdapterConfigMetadata[];
}
