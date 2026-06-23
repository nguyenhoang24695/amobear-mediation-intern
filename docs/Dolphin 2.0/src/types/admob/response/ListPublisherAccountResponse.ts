import PublisherAccount from "../PublisherAccount";

export default interface ListPublisherAccountsResponse {
  account: [PublisherAccount];
  nextPageToken: string;
}
