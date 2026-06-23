import App from "../../App";

export default interface ListAppsResponse {
  apps: [App];
  nextPageToken: string;
}
