import AdUnitMapping from "../AdUnitMapping";

export default interface CreateAdUnitMappingRequest {
  parent: string;
  adUnitMapping: AdUnitMapping;
}
