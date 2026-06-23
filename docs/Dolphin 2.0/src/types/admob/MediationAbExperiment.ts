import MediationGroupLine from "./MediationGroupLine";

export default interface MediationAbExperiment {
  name: string;
  displayName: string;
  experimentId: string;
  treatmentTrafficPercentage: string;
  treatmentMediationLines: [ExperimentMediationLine];
  controlMediationLines: [ExperimentMediationLine];
  state: ExperimentState;
  startTime: string;
  endTime: string;
  mediationGroupId: string;
  variantLeader: VariantLeader;
}

interface ExperimentMediationLine {
  mediationGroupLine: MediationGroupLine;
}

export enum ExperimentState {
  EXPERIMENT_STATE_UNSPECIFIED = "EXPERIMENT_STATE_UNSPECIFIED",
  EXPIRED = "EXPIRED",
  RUNNING = "RUNNING",
  ENDED = "ENDED",
}

export enum VariantLeader {
  VARIANT_LEADER_UNSPECIFIED = "VARIANT_LEADER_UNSPECIFIED",
  CONTROL = "CONTROL",
  TREATMENT = "TREATMENT",
}
