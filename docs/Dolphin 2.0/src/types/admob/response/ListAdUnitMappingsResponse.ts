import AdUnitMapping from "../AdUnitMapping";

export default interface ListAdUnitMappingsResponse {
  adUnitMappings: [AdUnitMapping];
  nextPageToken: string;
}
