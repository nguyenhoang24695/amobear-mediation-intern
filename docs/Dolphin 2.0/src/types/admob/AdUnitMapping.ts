export default interface AdUnitMapping {
  name?: string;
  adapterId?: string;
  state?: State;
  adUnitConfigurations?: { [key: string]: string };
  displayName?: string;
}

export enum State {
  STATE_UNSPECIFIED,
  ENABLED,
}
