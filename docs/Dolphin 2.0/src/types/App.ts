export default interface App {
  name: string;
  appId: string;
  platform: string;
  manualAppInfo: ManualAppInfo;
  linkedAppInfo: LinkedAppInfo;
  appApprovalState: AppApprovalState;
}

interface ManualAppInfo {
  displayName: string;
}

interface LinkedAppInfo {
  appStoreId: string;
  displayName: string;
  iconUri?: string;
}

enum AppApprovalState {
  APP_APPROVAL_STATE_UNSPECIFIED,
  ACTION_REQUIRED,
  IN_REVIEW,
  APPROVED,
}
