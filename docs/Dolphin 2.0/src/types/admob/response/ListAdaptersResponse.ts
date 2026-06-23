import Adapter from "../Adapter";

export default interface ListAdaptersResponse {
  adapters: [Adapter];
  nextPageToken: string;
}
