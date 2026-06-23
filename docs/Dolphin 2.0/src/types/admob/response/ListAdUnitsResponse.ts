import AdUnit from "../AdUnit";

export default interface ListAdUnitsResponse {
  adUnits: AdUnit[];
  nextPageToken: string;
}
