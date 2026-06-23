import MediationGroup from "../MediationGroup";

export default interface ListMediationGroupsResponse {
  mediationGroups: [MediationGroup];
  nextPageToken: string;
}
