import { gapi } from "gapi-script";
import ListAppsResponse from "../../types/admob/response/ListAppsResponse";
import ListPublisherAccountsResponse from "../../types/admob/response/ListPublisherAccountResponse";
import MediationGroup from "../../types/admob/MediationGroup";
import { State as MediationGroupState } from "../../types/admob/MediationGroup";
import ListAdUnitsResponse from "../../types/admob/response/ListAdUnitsResponse";
import ListMediationGroupsResponse from "../../types/admob/response/ListMediationGroupsResponse";
import MediationReportSpec from "../../types/admob/MediationReport";
import { MediationReportResponse } from "../../types/admob/response/MediationReportResponse";
import ListAdUnitMappingsResponse from "../../types/admob/response/ListAdUnitMappingsResponse";
import StopMediationAbExperimentsRequest from "../../types/admob/request/StopMediationAbExperimentsRequest";
import MediationAbExperiment from "../../types/admob/MediationAbExperiment";
import ListABExperimentsResponse from "../../types/admob/response/ListABExperimentsResponse";
import ListAdSourcesResponse from "../../types/admob/response/ListAdSourcesResponse";
import BatchCreateAdUnitMappingsRequest from "../../types/admob/request/BatchCreateAdUnitMappingsRequest";
import BatchCreateAdUnitMappingsResponse from "../../types/admob/response/BatchCreateAdUnitMappingsResponse";
import ListAdaptersResponse from "../../types/admob/response/ListAdaptersResponse";
import Builder from "../Builder";
import BatchCreateAdMobNetworkWaterfallAdUnitsResponse from "../../types/admob/response/BatchCreateAdMobNetworkWaterfallAdUnitsResponse";
import BatchUpdateAdMobNetworkWaterfallAdUnitsResponse from "../../types/admob/response/BatchUpdateAdMobNetworkWaterfallAdUnitsResponse";
import { NetworkOptions } from "../../components/AdTypeOptions";
import MediationGroupLine from "../../types/admob/MediationGroupLine";
import AdUnit from "../../types/admob/AdUnit";

export default class AdMobAPI {
  private static getUrl() {
    return "https://admob.googleapis.com";
  }

  // 🔐 A promise that’s set while we’re refreshing

  static tokenProvider: () => Promise<string>;
  static setTokenProvider(fn: () => Promise<string>) {
    this.tokenProvider = fn;
  }
  private static getAccessToken() {
    return this.tokenProvider();
  }

  private static async createOptions(
    method: string,
    body?: string
  ): Promise<RequestInit> {
    const token = await this.getAccessToken();
    return {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body,
    };
  }

  private static async doRequest<T>(
    url: string,
    options: RequestInit
  ): Promise<T> {
    const resp = await fetch(url, options);
    if (!resp.ok) {
      const errBody = await resp.text();
      throw new Error(`AdMob API error ${resp.status}: ${errBody}`);
    }
    return resp.json();
  }

  static async batchCreateAdMobNetworkWaterfallAdUnits(
    accountName: string,
    appIds: string[],
    format: string,
    calls: { cpm: number; displayName: string }[],
    networkOptions?: NetworkOptions | undefined
  ): Promise<BatchCreateAdMobNetworkWaterfallAdUnitsResponse> {
    const url = `${this.getUrl()}/v1alpha/${accountName}/adMobNetworkWaterfallAdUnits:batchCreate`;
    const flatUnits = appIds.flatMap((appId) =>
      calls.map((call) => ({
        adMobNetworkWaterfallAdUnit: {
          appId,
          displayName: call.displayName,
          format,
          adTypes: networkOptions
            ? networkOptions.adTypes
            : format === "REWARDED" || format === "REWARDED_INTERSTITIAL"
              ? ["VIDEO"]
              : ["RICH_MEDIA", "VIDEO"],
          cpmFloorSettings: {
            globalFloorMicros: Builder.dollarToMicros(call.cpm),
          },
        },
      }))
    );

    const opts = await this.createOptions(
      "POST",
      JSON.stringify({ requests: flatUnits })
    );
    return this.doRequest<BatchCreateAdMobNetworkWaterfallAdUnitsResponse>(
      url,
      opts
    );
  }

  static async batchUpdateAdMobNetworkWaterfallAdUnits(
    accountName: string,
    calls: { cpm: number; displayName: string; batchUpdateNames: string[] }[]
  ): Promise<BatchUpdateAdMobNetworkWaterfallAdUnitsResponse> {
    const url = `${this.getUrl()}/v1alpha/${accountName}/adMobNetworkWaterfallAdUnits:batchUpdate`;
    const updates = calls.flatMap((item) =>
      item.batchUpdateNames.map((name) => ({
        adMobNetworkWaterfallAdUnit: {
          name,
          displayName: item.displayName,
          cpmFloorSettings: {
            globalFloorMicros: parseInt(Builder.dollarToMicros(item.cpm), 10),
          },
        },
      }))
    );

    const opts = await this.createOptions(
      "POST",
      JSON.stringify({
        requests: updates,
        updateMask: "displayName,cpmFloorSettings",
      })
    );
    return this.doRequest<BatchUpdateAdMobNetworkWaterfallAdUnitsResponse>(
      url,
      opts
    );
  }

  static async batchCreateAdUnitMappings(
    accountName: string,
    body: BatchCreateAdUnitMappingsRequest
  ): Promise<BatchCreateAdUnitMappingsResponse> {
    const url = `${this.getUrl()}/v1alpha/${accountName}/adUnitMappings:batchCreate`;
    const opts = await this.createOptions("POST", JSON.stringify(body));
    return this.doRequest<BatchCreateAdUnitMappingsResponse>(url, opts);
  }

  static async listAdSources(
    accountName: string
  ): Promise<ListAdSourcesResponse> {
    const url = `${this.getUrl()}/v1alpha/${accountName}/adSources`;
    const opts = await this.createOptions("GET");
    return this.doRequest<ListAdSourcesResponse>(url, opts);
  }

  static async listABExperiments(
    accountName: string
  ): Promise<ListABExperimentsResponse> {
    const url = `${this.getUrl()}/v1alpha/${accountName}/adMobAbExperiments`;
    const opts = await this.createOptions("GET");
    return this.doRequest<ListABExperimentsResponse>(url, opts);
  }

  static async stopMediationAbExperiments(
    accountName: string,
    mediationGroupId: string,
    body: StopMediationAbExperimentsRequest
  ): Promise<MediationAbExperiment> {
    const url = `${this.getUrl()}/v1alpha/${accountName}/mediationGroups/${mediationGroupId}/mediationAbExperiments:stop`;
    const opts = await this.createOptions("POST", JSON.stringify(body));
    return this.doRequest<MediationAbExperiment>(url, opts);
  }

  static async patchMediationGroup(
    accountName: string,
    mediationGroupId: string,
    mask: string,
    mediationGroupLines: MediationGroup
  ): Promise<MediationGroup> {
    const url = `${this.getUrl()}/v1alpha/${accountName}/mediationGroups/${mediationGroupId}?updateMask=${mask}`;
    const opts = await this.createOptions(
      "PATCH",
      JSON.stringify({ mediationGroupLines })
    );
    return this.doRequest<MediationGroup>(url, opts);
  }

  static async createABExperiment(
    accountName: string,
    mediationGroupId: string,
    testName: string,
    treatmentTrafficPercentage: string,
    treatmentMediationLines: { mediationGroupLine: MediationGroupLine }[]
  ): Promise<MediationAbExperiment> {
    const url = `${this.getUrl()}/v1alpha/${accountName}/mediationGroups/${mediationGroupId}/mediationAbExperiments`;

    const opts = await this.createOptions(
      "POST",
      JSON.stringify({
        displayName: testName,
        treatmentTrafficPercentage,
        treatmentMediationLines,
      })
    );
    return this.doRequest<MediationAbExperiment>(url, opts);
  }

  static async generateMediationReport(
    accountName: string,
    mediationReportSpec: MediationReportSpec
  ): Promise<MediationReportResponse[]> {
    const url = `${this.getUrl()}/v1alpha/${accountName}/mediationReport:generate`;
    const opts = await this.createOptions(
      "POST",
      JSON.stringify({ reportSpec: mediationReportSpec })
    );
    return this.doRequest<MediationReportResponse[]>(url, opts);
  }

  static async listAccounts(): Promise<ListPublisherAccountsResponse> {
    const url = `${this.getUrl()}/v1alpha/accounts`;
    const opts = await this.createOptions("GET");
    return this.doRequest<ListPublisherAccountsResponse>(url, opts);
  }

  static async listMediationGroups(
    accountName: string,
    filter?: { appIds: string[]; state: MediationGroupState }
  ): Promise<ListMediationGroupsResponse> {
    let url = `${this.getUrl()}/v1alpha/${accountName}/mediationGroups`;
    if (filter) {
      const f = `CONTAINS_ANY(APP_IDS,${filter.appIds.join(",")})`;
      url += `?filter=${encodeURIComponent(f)}`;
    }
    const opts = await this.createOptions("GET");
    return this.doRequest<ListMediationGroupsResponse>(url, opts);
  }

  static async listAdapters(
    accountName: string,
    adSourceId: string
  ): Promise<ListAdaptersResponse> {
    const url = `${this.getUrl()}/v1alpha/${accountName}/adSources/${adSourceId}/adapters`;
    const opts = await this.createOptions("GET");

    return await this.doRequest<ListAdaptersResponse>(url, opts);
  }

  static async listApps(accountName: string): Promise<ListAppsResponse> {
    const url = `${this.getUrl()}/v1alpha/${accountName}/apps`;
    const opts = await this.createOptions("GET");
    return this.doRequest<ListAppsResponse>(url, opts);
  }

  // static async listAdUnits(accountName: string): Promise<ListAdUnitsResponse> {
  //   const url = `${this.getUrl()}/v1alpha/${accountName}/adUnits?pageSize=20000`;
  //   const opts = await this.createOptions("GET");
  //   return this.doRequest<ListAdUnitsResponse>(url, opts);
  // }

  static async listAdUnits(accountName: string): Promise<ListAdUnitsResponse> {
    // Array to accumulate all ad units from every page.
    const allAdUnits: AdUnit[] = [];
    let pageToken: string | undefined;

    // Get shared options for all requests.
    const opts = await this.createOptions("GET");
    const baseUrl = `${this.getUrl()}/v1alpha/${accountName}/adUnits?pageSize=20000`;

    do {
      // Append the page token to the URL if it exists.
      const url = pageToken ? `${baseUrl}&pageToken=${pageToken}` : baseUrl;

      // Make the API request for the current page.
      const response = await this.doRequest<ListAdUnitsResponse>(url, opts);

      // Add the ad units from the current page to our main array.
      if (response?.adUnits?.length) {
        allAdUnits.push(...response.adUnits);
      }

      // Set the token for the next iteration.
      pageToken = response.nextPageToken;
    } while (pageToken); // Continue looping as long as the API provides a next page token.

    // Return the complete list.
    return {
      adUnits: allAdUnits,
      nextPageToken: "", // No more pages, so we return an empty token.
    };
  }

  static async listAdUnitMappings(
    accountName: string,
    adUnitId: string
  ): Promise<ListAdUnitMappingsResponse> {
    const url = `${this.getUrl()}/v1alpha/${accountName}/adUnits/${adUnitId}/adUnitMappings`;
    const opts = await this.createOptions("GET");
    return this.doRequest<ListAdUnitMappingsResponse>(url, opts);
  }

  /** Helper */
  static hasDuplicates(array: any[]): boolean {
    return new Set(array).size !== array.length;
  }
}
