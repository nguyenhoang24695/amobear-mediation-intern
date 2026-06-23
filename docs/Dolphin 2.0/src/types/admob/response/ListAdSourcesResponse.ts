import AdSource from "../AdSource";

export default interface ListAdSourcesResponse {
  adSources: [AdSource];
  nextPageToken: string;
}
