import MediationGroupLine from "./MediationGroupLine";

export default interface MediationGroup {
  name?: string;
  mediationGroupId?: string;
  displayName?: string;
  targeting?: MediationGroupTargeting;
  state?: State;
  mediationGroupLines?: { [key: string]: MediationGroupLine };
  mediationAbExperimentState?: ExperimentState;
}

interface MediationGroupTargeting {
  platform?: string;
  format?: string;
  adUnitIds?: [string];
  targetedRegionCodes?: [string];
  excludedRegionCodes?: [string];
  idfaTargeting?: IdfaTargeting;
}

export enum IdfaTargeting {
  IDFA_TARGETING_UNSPECIFIED = "IDFA_TARGETING_UNSPECIFIED",
  ALL = "ALL",
  AVAILABLE = "AVAILABLE",
  NOT_AVAILABLE = "NOT_AVAILABLE",
}

export enum State {
  STATE_UNSPECIFIED = "STATE_UNSPECIFIED",
  ENABLED = "ENABLED",
  DISABLED = "DISABLED",
  REMOVE = "REMOVE",
}

export enum ExperimentState {
  EXPERIMENT_STATE_UNSPECIFIED = "EXPERIMENT_STATE_UNSPECIFIED",
  RUNNING = "RUNNING",
  NOT_RUNNING = "NOT_RUNNING",
}
