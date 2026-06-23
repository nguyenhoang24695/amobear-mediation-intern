import AdMobAbExperiment from "../AdMobAbExperiment";

export default interface ListABExperimentsResponse {
  admobAbExperiments: AdMobAbExperiment[];
  nextPageToken: string;
}
