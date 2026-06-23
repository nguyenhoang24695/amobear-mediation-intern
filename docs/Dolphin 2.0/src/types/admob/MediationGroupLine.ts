export default interface MediationGroupLine {
  id?: string;
  displayName?: string;
  adSourceId?: string;
  cpmMode?: CpmMode;
  cpmMicros?: string;
  adUnitMappings?: { [key: string]: string };
  state?: State;
  experimentVariant?: Variant;
}

export enum CpmMode {
  CPM_MODE_UNSPECIFIED,
  LIVE,
  MANUAL,
  ANO,
}

export enum State {
  STATE_UNSPECIFIED,
  ENABLED,
  DISABLED,
  REMOVED,
}

export enum Variant {
  VARIANT_UNSPECIFIED,
  VARIANT_A,
  VARIANT_B,
  ORIGINAL,
}
