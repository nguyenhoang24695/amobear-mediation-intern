"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  invalidateCache,
  invalidateCachePrefix,
  useApi,
} from "@/hooks/use-api";
import { getCurrentUser, hasScreenFunction } from "@/lib/auth";
import { metaIntegrationsApi } from "@/lib/api/meta-ads";
import type {
  CreateMetaIntegrationRequestDto,
  MetaIntegrationDto,
  MetaIntegrationTestResultDto,
  UpdateMetaIntegrationRequestDto,
} from "@/types/meta-ads";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  MoreHorizontal,
  Edit,
  Power,
  Link2,
  Eye,
  EyeOff,
  ChevronRight,
  XCircle,
  Download,
  Loader2,
  ExternalLink,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Building2,
  Check,
  ChevronsUpDown,
} from "lucide-react";

const SCREEN_META_ACCOUNTS = "s-meta-accounts";

const AUTH_MODE_OPTIONS = [
  {
    value: "system_user_token",
    label: "SYSTEM_USER",
    helper: "Recommended for production",
  },
  { value: "oauth_user", label: "USER_TOKEN", helper: "Dev/test only" },
] as const;

const REQUIRED_SCOPES = ["ads_management", "ads_read"] as const;
const RECOMMENDED_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
] as const;
const STABLE_SCOPE_HINT = [...REQUIRED_SCOPES, ...RECOMMENDED_SCOPES].join(
  ", ",
);
// Default scopes pre-selected for a new USER_TOKEN OAuth integration.
const OAUTH_REQUEST_SCOPES = [
  "pages_show_list",
  "ads_management",
  "ads_read",
  "business_management",
  "pages_read_engagement",
  "pages_manage_ads",
  "public_profile",
] as const;

// Full catalog of scopes the user can pick from the multi-select.
const AVAILABLE_OAUTH_SCOPES = [
  "catalog_management",
  "threads_business_basic",
  "pages_show_list",
  "ads_management",
  "ads_read",
  "business_management",
  "pages_read_engagement",
  "pages_manage_ads",
  "public_profile",
] as const;

const emptyForm: CreateMetaIntegrationRequestDto = {
  displayName: "",
  authMode: "system_user_token",
  metaAppId: "",
  oauthConfigId: "",
  appSecret: "",
  accessToken: "",
  tokenType: "Bearer",
  tokenExpiresAt: "",
  scopes: [...REQUIRED_SCOPES],
  isDefault: false,
  isEnabled: true,
};

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function scopesToString(scopes: string[] | undefined) {
  return (scopes ?? []).join(", ");
}

function formatNumericTotal(value?: number | null) {
  if (value === null || value === undefined) return "-";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatAuthMode(value: string) {
  return (
    AUTH_MODE_OPTIONS.find((option) => option.value === value)?.label ?? value
  );
}

function getBusinessPortfolioSummary(integration: MetaIntegrationDto) {
  const businesses = integration.businesses ?? [];
  const count = integration.businessCount ?? businesses.length;
  if (count <= 0)
    return {
      title: "No verified BM found",
      subtitle: integration.hasAccessToken
        ? "Token valid, no verified portfolio"
        : "Connect token to refresh",
    };

  const names = businesses
    .map((business) => business.name || business.id)
    .filter(Boolean)
    .slice(0, 2);
  const extra = count > names.length ? ` +${count - names.length}` : "";
  return {
    title: `${count.toLocaleString()} verified`,
    subtitle:
      names.length > 0
        ? `${names.join(", ")}${extra}`
        : "Verified Business Portfolios",
  };
}
function getAuthModeHelper(value: string) {
  return (
    AUTH_MODE_OPTIONS.find((option) => option.value === value)?.helper ?? ""
  );
}

function formatTokenStatus(value?: string | null) {
  const normalized = value?.toUpperCase() ?? "NOT_TESTED";
  if (normalized === "NO_TOKEN") return "No token connected";
  return normalized.replaceAll("_", " ");
}

function getTokenStatusMessageClass(value?: string | null) {
  switch (value?.toUpperCase() ?? "NOT_TESTED") {
    case "VALID":
      return "text-green-700";
    case "EXPIRED":
    case "NOT_TESTED":
    case "NO_TOKEN":
      return "text-amber-700";
    case "MISSING_SCOPES":
    case "ACCESS_DENIED":
    case "INVALID":
      return "text-red-700";
    default:
      return "text-muted-foreground";
  }
}

function getConnectionTestToast(result: MetaIntegrationTestResultDto): {
  title: string;
  description: string;
  variant: "default" | "destructive";
} {
  const hasWarnings = result.warningMessages.length > 0;
  return {
    title: result.success
      ? hasWarnings
        ? "Connection valid with warnings"
        : "Connection valid"
      : "Connection failed",
    description: hasWarnings
      ? result.warningMessages.join(" ")
      : result.message,
    variant: result.success ? "default" : "destructive",
  };
}

function deriveTokenBadge(integration: MetaIntegrationDto) {
  if (!integration.isEnabled) {
    return {
      label: "Disabled",
      className: "bg-muted text-muted-foreground",
      icon: <Power className="w-3 h-3" />,
    };
  }

  switch (integration.tokenStatus) {
    case "VALID":
      return {
        label: "Valid",
        className: "bg-green-100 text-green-700",
        icon: <ShieldCheck className="w-3 h-3" />,
      };
    case "EXPIRED":
      return {
        label: "Expired",
        className: "bg-amber-100 text-amber-700",
        icon: <ShieldAlert className="w-3 h-3" />,
      };
    case "MISSING_SCOPES":
      return {
        label: "Missing Scopes",
        className: "bg-red-100 text-red-700",
        icon: <ShieldX className="w-3 h-3" />,
      };
    case "ACCESS_DENIED":
      return {
        label: "Access Denied",
        className: "bg-red-100 text-red-700",
        icon: <ShieldX className="w-3 h-3" />,
      };
    case "INVALID":
      return {
        label: "Invalid",
        className: "bg-red-100 text-red-700",
        icon: <XCircle className="w-3 h-3" />,
      };
    case "NO_TOKEN":
      return {
        label: "No token connected",
        className: "bg-muted text-muted-foreground",
        icon: <AlertTriangle className="w-3 h-3" />,
      };
    default:
      return {
        label: "Not Tested",
        className: "bg-amber-100 text-amber-700",
        icon: <AlertTriangle className="w-3 h-3" />,
      };
  }
}

function MaskedInput({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string | null;
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-foreground/80">{label}</Label>
      <div className="relative">
        <Input
          type={show ? "text" : "password"}
          className="h-9 text-sm pr-9 font-mono"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => setShow((current) => !current)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {hint ? (
        <p className="text-[11px] text-muted-foreground">
          Current hint: {hint}
        </p>
      ) : null}
    </div>
  );
}

interface IntegrationsContentProps {
  embedded?: boolean;
}

export function IntegrationsContent({
  embedded = false,
}: IntegrationsContentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const currentUser = getCurrentUser();
  const canViewAll = hasScreenFunction(SCREEN_META_ACCOUNTS, "view");
  const canCreate = hasScreenFunction(SCREEN_META_ACCOUNTS, "create");
  const canEdit = hasScreenFunction(SCREEN_META_ACCOUNTS, "edit");
  const canDisableEnable = hasScreenFunction(
    SCREEN_META_ACCOUNTS,
    "disable-enable",
  );
  const canManageOwn = canCreate && canEdit;
  const integrationsCacheKey = `meta-integrations:list:${currentUser?.id ?? "anonymous"}:${canViewAll ? "all" : "own"}`;

  const {
    data: integrations,
    loading,
    error,
    refetch,
  } = useApi(() => metaIntegrationsApi.list(), {
    cacheKey: integrationsCacheKey,
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<MetaIntegrationDto | null>(null);
  const [form, setForm] = useState<CreateMetaIntegrationRequestDto>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] =
    useState<MetaIntegrationTestResultDto | null>(null);
  const [connectionStateDirty, setConnectionStateDirty] = useState(true);
  const [oauthLoadingId, setOauthLoadingId] = useState<number | null>(null);
  const [rowActionLoadingId, setRowActionLoadingId] = useState<number | null>(
    null,
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [scopePickerOpen, setScopePickerOpen] = useState(false);
  const oauthNoticeRef = useRef<string | null>(null);

  const isOwnedByCurrentUser = useCallback(
    (integration: MetaIntegrationDto | null | undefined) =>
      !!integration?.createdBy &&
      !!currentUser?.id &&
      integration.createdBy.toLowerCase() === currentUser.id.toLowerCase(),
    [currentUser?.id],
  );
  const canUseIntegration = (
    integration: MetaIntegrationDto | null | undefined,
  ) => canEdit || (canManageOwn && isOwnedByCurrentUser(integration));
  const visibleIntegrations = useMemo(
    () =>
      canViewAll
        ? (integrations ?? [])
        : (integrations ?? []).filter((integration) =>
            isOwnedByCurrentUser(integration),
          ),
    [canViewAll, integrations, isOwnedByCurrentUser],
  );
  const defaultIntegration = useMemo(
    () =>
      visibleIntegrations.find((integration) => integration.isDefault) ??
      visibleIntegrations[0] ??
      null,
    [visibleIntegrations],
  );
  useEffect(() => {
    const oauthStatus = searchParams.get("oauth");
    if (!oauthStatus) return;

    const marker = searchParams.toString();
    if (oauthNoticeRef.current === marker) return;
    oauthNoticeRef.current = marker;

    const message = searchParams.get("message");
    if (oauthStatus === "success") {
      invalidateCachePrefix("meta-integrations:list");
      void refetch();
      toast({
        title: "Dev OAuth completed",
        description:
          message ?? "Meta user token exchange completed successfully.",
      });
    } else {
      toast({
        title: "Dev OAuth failed",
        description: message ?? "Meta user token flow did not complete.",
        variant: "destructive",
      });
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("oauth");
    nextParams.delete("message");
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  }, [pathname, refetch, router, searchParams, toast]);

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setTestResult(null);
    setConnectionStateDirty(true);
    setShowAdvanced(false);
    setDrawerOpen(true);
  };

  const openEdit = (integration: MetaIntegrationDto) => {
    setEditTarget(integration);
    setForm({
      displayName: integration.displayName,
      authMode: integration.authMode,
      metaAppId: integration.metaAppId ?? "",
      oauthConfigId: integration.oauthConfigId ?? "",
      appSecret: "",
      accessToken: "",
      tokenType: integration.tokenType ?? "Bearer",
      tokenExpiresAt: integration.tokenExpiresAt
        ? integration.tokenExpiresAt.slice(0, 16)
        : "",
      scopes:
        integration.scopes.length > 0
          ? integration.scopes
          : [...REQUIRED_SCOPES],
      isDefault: integration.isDefault,
      isEnabled: integration.isEnabled,
    });
    setTestResult(null);
    setConnectionStateDirty(false);
    setShowAdvanced(false);
    setDrawerOpen(true);
  };

  const redirectToOAuth = async (integration: MetaIntegrationDto) => {
    try {
      setOauthLoadingId(integration.id);
      const redirectUri = `${window.location.origin}/meta-ads/integrations/callback`;
      const response = await metaIntegrationsApi.getAuthorizeUrl(
        integration.id,
        redirectUri,
      );
      window.location.href = response.authorizationUrl;
    } catch (apiError) {
      const message =
        apiError instanceof Error
          ? apiError.message
          : "Unable to start Meta user token OAuth.";
      toast({
        title: "Dev OAuth failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setOauthLoadingId(null);
    }
  };

  const updateConnectionForm = (
    patch: Partial<CreateMetaIntegrationRequestDto>,
  ) => {
    setForm((current) => ({ ...current, ...patch }));
    setTestResult(null);
    setConnectionStateDirty(true);
  };

  const toggleOAuthScope = (scope: string) => {
    const current = form.scopes ?? [];
    const next = current.includes(scope)
      ? current.filter((value) => value !== scope)
      : [...current, scope];
    updateConnectionForm({ scopes: next });
  };

  const validateForm = () => {
    const errors: string[] = [];

    if (!form.displayName.trim()) errors.push("Display Name is required.");

    if (form.authMode !== "oauth_user") {
      if (!form.accessToken?.trim() && !editTarget?.hasAccessToken) {
        errors.push("Access Token is required.");
      }
    }

    const scopes = new Set(
      (form.scopes ?? []).map((scope) => scope.toLowerCase()),
    );
    for (const scope of REQUIRED_SCOPES) {
      if (!scopes.has(scope)) {
        errors.push(`Scopes must include ${REQUIRED_SCOPES.join(", ")}.`);
        break;
      }
    }

    return errors;
  };

  const buildTestRequest = () => ({
    integrationId: editTarget?.id ?? null,
    authMode: form.authMode,
    accessToken: form.accessToken || null,
    tokenType: form.tokenType || null,
    tokenExpiresAt: form.tokenExpiresAt
      ? new Date(form.tokenExpiresAt).toISOString()
      : null,
    scopes: form.scopes ?? [],
  });

  const handleTestConnection = async () => {
    try {
      setTestingConnection(true);
      const result = await metaIntegrationsApi.test(buildTestRequest());
      setTestResult(result);
      setConnectionStateDirty(false);
      setForm((current) => ({
        ...current,
        tokenType: result.tokenType ?? current.tokenType,
        tokenExpiresAt: result.tokenExpiresAt
          ? result.tokenExpiresAt.slice(0, 16)
          : current.tokenExpiresAt,
        scopes: result.scopes.length > 0 ? result.scopes : current.scopes,
      }));
      toast(getConnectionTestToast(result));
    } catch (apiError) {
      const message =
        apiError instanceof Error
          ? apiError.message
          : "Unable to test the Meta integration.";
      toast({
        title: "Test failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const validationErrors = validateForm();
      if (validationErrors.length > 0) {
        toast({
          title: "Validation failed",
          description: validationErrors[0],
          variant: "destructive",
        });
        return;
      }

      let saved: MetaIntegrationDto;
      const requestPayload = {
        ...form,
        metaAppId: form.metaAppId || null,
        oauthConfigId: form.oauthConfigId || null,
        appSecret: form.appSecret || null,
        accessToken: form.accessToken || null,
        tokenType: form.tokenType || null,
        tokenExpiresAt: form.tokenExpiresAt
          ? new Date(form.tokenExpiresAt).toISOString()
          : null,
        scopes: form.scopes ?? [],
      };

      if (editTarget) {
        const request: UpdateMetaIntegrationRequestDto = {
          ...requestPayload,
        };
        saved = await metaIntegrationsApi.update(editTarget.id, request);
      } else {
        saved = await metaIntegrationsApi.create(requestPayload);
      }

      if (testResult) {
        try {
          await metaIntegrationsApi.testSaved(saved.id);
        } catch (apiError) {
          const message =
            apiError instanceof Error
              ? apiError.message
              : "Saved, but unable to persist the latest connection test.";
          toast({
            title: "Saved with warning",
            description: message,
            variant: "destructive",
          });
        }
      }

      invalidateCachePrefix("meta-integrations:list");
      await refetch();

      if (form.authMode === "oauth_user") {
        setDrawerOpen(false);
        await redirectToOAuth(saved);
        return;
      }

      setDrawerOpen(false);
      toast({
        title: editTarget ? "Integration updated" : "Integration created",
      });
    } catch (apiError) {
      const message =
        apiError instanceof Error
          ? apiError.message
          : "Unable to save integration.";
      toast({
        title: "Save failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleEnabled = async (integration: MetaIntegrationDto) => {
    try {
      setRowActionLoadingId(integration.id);
      if (integration.isEnabled) {
        await metaIntegrationsApi.disable(integration.id);
      } else {
        await metaIntegrationsApi.enable(integration.id);
      }

      invalidateCachePrefix("meta-integrations:list");
      await refetch();
      toast({
        title: integration.isEnabled
          ? "Integration disabled"
          : "Integration enabled",
      });
    } catch (apiError) {
      const message =
        apiError instanceof Error
          ? apiError.message
          : "Unable to update integration.";
      toast({
        title: "Update failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setRowActionLoadingId(null);
    }
  };

  const handleTestSavedConnection = async (integration: MetaIntegrationDto) => {
    try {
      setRowActionLoadingId(integration.id);
      const result = await metaIntegrationsApi.testSaved(integration.id);
      invalidateCachePrefix("meta-integrations:list");
      await refetch();
      toast(getConnectionTestToast(result));
    } catch (apiError) {
      const message =
        apiError instanceof Error
          ? apiError.message
          : "Unable to test the integration.";
      toast({
        title: "Test failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setRowActionLoadingId(null);
    }
  };

  const handleSyncAdAccounts = async (integration: MetaIntegrationDto) => {
    try {
      setRowActionLoadingId(integration.id);
      await metaIntegrationsApi.syncAdAccounts(integration.id);
      invalidateCachePrefix("meta-integrations:list");
      invalidateCache("meta-ad-accounts:list");
      await refetch();
      toast({ title: "Ad accounts synced" });
    } catch (apiError) {
      const message =
        apiError instanceof Error
          ? apiError.message
          : "Unable to sync ad accounts.";
      toast({
        title: "Sync failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setRowActionLoadingId(null);
    }
  };

  const handleRefreshBusinesses = async (integration: MetaIntegrationDto) => {
    try {
      setRowActionLoadingId(integration.id);
      const businesses = await metaIntegrationsApi.getBusinesses(
        integration.id,
      );
      invalidateCachePrefix("meta-integrations:list");
      await refetch();
      toast({
        title: "Business Portfolios refreshed",
        description:
          businesses.length > 0
            ? `${businesses.length} verified Business Portfolio${businesses.length === 1 ? "" : "s"} found.`
            : "No verified Business Portfolio found.",
      });
    } catch (apiError) {
      const message =
        apiError instanceof Error
          ? apiError.message
          : "Unable to refresh Meta Business Portfolios.";
      toast({
        title: "Refresh businesses failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setRowActionLoadingId(null);
    }
  };

  const displayedTokenStatus =
    testResult?.tokenStatus ??
    (connectionStateDirty
      ? "NOT_TESTED"
      : (editTarget?.tokenStatus ?? "NOT_TESTED"));
  const displayedLastCheckedAt =
    testResult?.checkedAt ??
    (connectionStateDirty ? null : (editTarget?.lastCheckedAt ?? null));
  const displayedMessage =
    testResult?.message ??
    (connectionStateDirty
      ? editTarget
        ? "Connection test needs to be rerun after recent credential or permission changes."
        : null
      : (editTarget?.lastCheckMessage ?? null));
  const displayedScopes = testResult?.scopes.length
    ? testResult.scopes
    : (form.scopes ?? []);
  const displayedWarnings = testResult?.warningMessages ?? [];
  const showUserTokenWarning = form.authMode === "oauth_user";
  const canOpenDefaultDevOAuth = defaultIntegration?.authMode === "oauth_user";
  const canUseDefaultIntegration = canUseIntegration(defaultIntegration);

  return (
    <div className="space-y-5 rounded-2xl border border-border bg-gradient-to-b from-background via-background to-muted/30 p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {!embedded ? (
            <nav className="mb-1.5 flex items-center gap-1 text-xs text-muted-foreground">
              <span>Meta Ads</span>
              <ChevronRight className="w-3 h-3" />
              <span className="font-medium text-foreground">Integrations</span>
            </nav>
          ) : null}
          <div className="flex items-center gap-3">
            <div className="shrink-0 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 p-2.5 shadow-sm">
              <Link2 className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-foreground">
                Meta Integrations
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage Meta Marketing API credentials and business account
                connections
              </p>
            </div>
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          {canUseDefaultIntegration ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full border-border bg-background text-foreground shadow-sm hover:bg-muted sm:w-auto"
              onClick={() =>
                defaultIntegration && void redirectToOAuth(defaultIntegration)
              }
              disabled={
                !defaultIntegration ||
                !canOpenDefaultDevOAuth ||
                oauthLoadingId !== null
              }
            >
              {oauthLoadingId !== null ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ExternalLink className="w-4 h-4 mr-2" />
              )}
              Open Dev OAuth
            </Button>
          ) : null}
          {canCreate ? (
            <Button
              className="w-full  sm:w-auto"
              size="sm"
              onClick={openCreate}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Integration
            </Button>
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/60">
              <TableHead className="text-xs font-medium text-muted-foreground">
                Name
              </TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground w-32">
                Auth Mode
              </TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground min-w-56">
                Business Portfolios
              </TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground w-24">
                Ad Accounts
              </TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">
                Total Spent
              </TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">
                Total Balance
              </TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">
                Total Spend Cap
              </TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground w-36">
                Token Status
              </TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">
                Scopes
              </TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground w-20">
                Default
              </TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground w-20">
                Enabled
              </TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground w-32">
                Last Checked
              </TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={13} className="py-12">
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading integrations...
                  </div>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell
                  colSpan={13}
                  className="text-center py-12 text-sm text-red-600"
                >
                  {error.message}
                </TableCell>
              </TableRow>
            ) : visibleIntegrations.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={13}
                  className="text-center py-12 text-sm text-muted-foreground"
                >
                  No integrations configured yet.
                </TableCell>
              </TableRow>
            ) : (
              visibleIntegrations.map((integration) => {
                const badge = deriveTokenBadge(integration);
                const isBusy = rowActionLoadingId === integration.id;
                const canUseRowIntegration = canUseIntegration(integration);
                const canRefreshBusinesses =
                  canUseRowIntegration && integration.hasAccessToken;
                const businessSummary =
                  getBusinessPortfolioSummary(integration);

                return (
                  <TableRow key={integration.id} className="text-sm">
                    <TableCell className="font-medium text-foreground">
                      <div className="space-y-1">
                        <div>{integration.displayName}</div>
                        {!integration.isProductionSafe ? (
                          <Badge className="bg-amber-100 text-amber-700 text-[10px] w-fit">
                            Dev/Test Only
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div className="font-mono">
                        {formatAuthMode(integration.authMode)}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {getAuthModeHelper(integration.authMode)}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div className="flex items-start gap-2">
                        <Building2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <div className="font-medium text-foreground">
                            {businessSummary.title}
                          </div>
                          <div className="truncate text-[11px] text-muted-foreground">
                            {businessSummary.subtitle}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {integration.syncedAdAccountCount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatNumericTotal(integration.totalAmountSpent)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatNumericTotal(integration.totalBalance)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatNumericTotal(integration.totalSpendCap)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`text-[11px] flex items-center gap-1 w-fit ${badge.className}`}
                      >
                        {badge.icon}
                        {badge.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {integration.scopes.length > 0
                        ? scopesToString(integration.scopes.slice(0, 2))
                        : "-"}
                      {integration.scopes.length > 2
                        ? ` +${integration.scopes.length - 2}`
                        : ""}
                    </TableCell>
                    <TableCell>
                      {integration.isDefault ? (
                        <Badge className="bg-indigo-500/10 text-indigo-700 text-[11px]">
                          Default
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={integration.isEnabled}
                        onCheckedChange={() =>
                          canDisableEnable && void toggleEnabled(integration)
                        }
                        disabled={!canDisableEnable || isBusy}
                      />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(integration.lastCheckedAt)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            disabled={isBusy}
                          >
                            {isBusy ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <MoreHorizontal className="w-4 h-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          {canUseRowIntegration ? (
                            <DropdownMenuItem
                              onClick={() => openEdit(integration)}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                          ) : null}
                          {canDisableEnable ? (
                            <DropdownMenuItem
                              onClick={() => void toggleEnabled(integration)}
                            >
                              <Power className="w-4 h-4 mr-2" />
                              {integration.isEnabled ? "Disable" : "Enable"}
                            </DropdownMenuItem>
                          ) : null}
                          {canUseRowIntegration ? (
                            <DropdownMenuSeparator />
                          ) : null}
                          {canUseRowIntegration ? (
                            <DropdownMenuItem
                              onClick={() =>
                                void handleTestSavedConnection(integration)
                              }
                            >
                              <ShieldCheck className="w-4 h-4 mr-2" />
                              Test Connection
                            </DropdownMenuItem>
                          ) : null}
                          {canUseRowIntegration ? (
                            <DropdownMenuItem
                              onClick={() =>
                                void handleSyncAdAccounts(integration)
                              }
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Sync Ad Accounts
                            </DropdownMenuItem>
                          ) : null}
                          {canUseRowIntegration &&
                          integration.authMode === "oauth_user" ? (
                            <DropdownMenuItem
                              onClick={() => void redirectToOAuth(integration)}
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Open Dev OAuth
                            </DropdownMenuItem>
                          ) : null}
                          {canRefreshBusinesses ? (
                            <DropdownMenuItem
                              onClick={() =>
                                void handleRefreshBusinesses(integration)
                              }
                            >
                              <Building2 className="w-4 h-4 mr-2" />
                              Refresh Businesses
                            </DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:w-[min(1160px,calc(100vw-3rem))] sm:!max-w-[1160px] p-0 gap-0 rounded-xl overflow-hidden max-h-[90vh] flex flex-col">
          <DialogHeader className="border-b border-border bg-muted/30 px-6 pt-6 pb-4 flex-shrink-0">
            <DialogTitle className="text-base font-semibold text-foreground">
              {editTarget ? "Edit Integration" : "Create Integration"}
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2.5 text-sm text-indigo-900">
              This integration is used by backend services to call Meta
              Marketing API for request execution and data sync.
            </div>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_400px] xl:grid-cols-[minmax(0,1.25fr)_430px]">
              <div className="rounded-xl border border-border bg-card px-4 py-4 space-y-4 shadow-sm">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Integration Setup
                  </h3>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Configure the business and application context used for Meta
                    Marketing API access.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground/80">
                    Display Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    className="h-9 text-sm"
                    value={form.displayName}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        displayName: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground/80">
                    Auth Mode
                  </Label>
                  <Select
                    value={form.authMode}
                    onValueChange={(value) =>
                      updateConnectionForm(
                        value === "oauth_user"
                          ? {
                              authMode: value,
                              scopes: [...OAUTH_REQUEST_SCOPES],
                            }
                          : { authMode: value },
                      )
                    }
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AUTH_MODE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex flex-col">
                            <span>{option.label}</span>
                            <span className="text-[11px] text-muted-foreground">
                              {option.helper}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    For production Meta Ads integrations, use a System User
                    token from Meta Business Manager.
                  </p>
                </div>
                {showUserTokenWarning ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                    USER_TOKEN should only be used for development or testing.
                    It is not recommended for production request execution.
                  </div>
                ) : null}
                {form.authMode !== "oauth_user" && (
                  <>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-foreground/80">
                          Meta App ID
                        </Label>
                        <Input
                          className="h-9 text-sm font-mono"
                          value={form.metaAppId ?? ""}
                          onChange={(event) =>
                            updateConnectionForm({
                              metaAppId: event.target.value,
                            })
                          }
                          placeholder="966021639087771"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-foreground/80">
                          Business Login Config ID
                        </Label>
                        <Input
                          className="h-9 text-sm font-mono"
                          value={form.oauthConfigId ?? ""}
                          onChange={(event) =>
                            updateConnectionForm({
                              oauthConfigId: event.target.value,
                            })
                          }
                          placeholder="1370633118256507"
                        />
                        <p className="text-[11px] text-muted-foreground">
                          For Facebook Login for Business, OAuth uses config_id
                          instead of scope when this is set.
                        </p>
                      </div>
                    </div>
                    <MaskedInput
                      label="Meta App Secret"
                      value={form.appSecret ?? ""}
                      onChange={(value) =>
                        updateConnectionForm({ appSecret: value })
                      }
                      placeholder="Leave blank to keep current value"
                      hint={editTarget?.appSecretHint ?? null}
                    />
                  </>
                )}
              </div>

              <div className="rounded-xl border border-border bg-muted/30 px-4 py-4 space-y-4 h-fit shadow-sm">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Access &amp; Permissions
                  </h3>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {form.authMode === "oauth_user"
                      ? "OAuth Connect is recommended for USER_TOKEN."
                      : "Meta Marketing API does not use a standard refresh token flow like Google OAuth."}
                  </p>
                </div>

                {form.authMode === "oauth_user" && (
                  <div className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-indigo-600" />
                      <p className="text-xs font-semibold text-indigo-900">
                        App permissions requested via OAuth
                      </p>
                    </div>
                    <p className="text-[11px] text-indigo-700">
                      Connecting will open Facebook Login and request the
                      selected permissions:
                    </p>
                    <Popover
                      open={scopePickerOpen}
                      onOpenChange={setScopePickerOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          aria-expanded={scopePickerOpen}
                          className="h-9 w-full justify-between bg-background text-xs font-normal"
                        >
                          <span className="truncate text-muted-foreground">
                            {(form.scopes?.length ?? 0) > 0
                              ? `${form.scopes!.length} permission${form.scopes!.length === 1 ? "" : "s"} selected`
                              : "Select permissions"}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[--radix-popover-trigger-width] p-0"
                        align="start"
                      >
                        <Command shouldFilter={false}>
                          <CommandList>
                            <CommandGroup>
                              {AVAILABLE_OAUTH_SCOPES.map((scope) => {
                                const isSelected = (form.scopes ?? []).includes(
                                  scope,
                                );
                                return (
                                  <CommandItem
                                    key={scope}
                                    value={scope}
                                    onSelect={() => toggleOAuthScope(scope)}
                                    className="font-mono text-xs"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4 shrink-0",
                                        isSelected
                                          ? "opacity-100"
                                          : "opacity-0",
                                      )}
                                    />
                                    <span>{scope}</span>
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {(form.scopes?.length ?? 0) > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {(form.scopes ?? []).map((scope) => (
                          <Badge
                            key={scope}
                            variant="secondary"
                            className="font-mono text-[10px] bg-background"
                          >
                            {scope}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-amber-700">
                        No permission selected.
                      </p>
                    )}
                  </div>
                )}

                {form.authMode === "oauth_user" && (
                  <div className="space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                    >
                      {showAdvanced
                        ? "Hide Advanced Config"
                        : "Advanced: paste token manually"}
                    </Button>
                    {!showAdvanced && (
                      <p className="text-[11px] text-muted-foreground text-center">
                        Use only for debugging. OAuth Connect is recommended for
                        USER_TOKEN.
                      </p>
                    )}
                  </div>
                )}

                {(form.authMode !== "oauth_user" || showAdvanced) && (
                  <>
                    <MaskedInput
                      label="Access Token"
                      value={form.accessToken ?? ""}
                      onChange={(value) =>
                        updateConnectionForm({ accessToken: value })
                      }
                      placeholder="Leave blank to keep current value"
                      hint={editTarget?.accessTokenHint ?? null}
                    />
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-foreground/80">
                          Token Type
                        </Label>
                        <Input
                          className="h-9 text-sm"
                          value={form.tokenType ?? ""}
                          onChange={(event) =>
                            updateConnectionForm({
                              tokenType: event.target.value,
                            })
                          }
                          placeholder="Bearer"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-foreground/80">
                          Token Expires At
                        </Label>
                        <Input
                          type="datetime-local"
                          className="h-9 text-sm"
                          value={form.tokenExpiresAt ?? ""}
                          onChange={(event) =>
                            updateConnectionForm({
                              tokenExpiresAt: event.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-foreground/80">
                        Scopes (comma-separated)
                      </Label>
                      <Input
                        className="h-9 text-sm"
                        value={scopesToString(form.scopes ?? [])}
                        onChange={(event) =>
                          updateConnectionForm({
                            scopes: event.target.value
                              .split(",")
                              .map((value) => value.trim())
                              .filter(Boolean),
                          })
                        }
                        placeholder={STABLE_SCOPE_HINT}
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Recommended stable scopes: {STABLE_SCOPE_HINT}
                      </p>
                    </div>
                  </>
                )}

                <div className="grid gap-3 rounded-md border border-border bg-background px-3 py-3 text-xs md:grid-cols-2">
                  <div>
                    <p className="mb-1 text-muted-foreground">Token Status</p>
                    <p className="font-medium text-foreground">
                      {formatTokenStatus(displayedTokenStatus)}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-muted-foreground">
                      Last Checked At
                    </p>
                    <p className="font-medium text-foreground">
                      {formatDateTime(displayedLastCheckedAt)}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="mb-1 text-muted-foreground">
                      Resolved Scopes
                    </p>
                    <p className="font-mono break-all text-foreground/80">
                      {displayedScopes.length > 0
                        ? scopesToString(displayedScopes)
                        : "-"}
                    </p>
                  </div>
                  {displayedMessage ? (
                    <div className="md:col-span-2">
                      <p className="mb-1 text-muted-foreground">
                        Last Check Message
                      </p>
                      <p
                        className={`text-sm ${getTokenStatusMessageClass(displayedTokenStatus)}`}
                      >
                        {displayedMessage}
                      </p>
                    </div>
                  ) : null}
                  {displayedWarnings.length > 0 ? (
                    <div className="md:col-span-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5">
                      <p className="mb-1 text-xs font-medium text-amber-900">
                        Warnings
                      </p>
                      <p className="text-sm text-amber-800">
                        {displayedWarnings.join(" ")}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-4">
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground/80">
                  <Switch
                    checked={form.isDefault}
                    onCheckedChange={(value) =>
                      setForm((current) => ({ ...current, isDefault: value }))
                    }
                  />
                  Set as Default
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground/80">
                  <Switch
                    checked={form.isEnabled}
                    onCheckedChange={(value) =>
                      setForm((current) => ({ ...current, isEnabled: value }))
                    }
                  />
                  Enabled
                </label>
              </div>
            </div>
          </div>
          <DialogFooter className="flex flex-col gap-2 border-t border-border bg-muted/30 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <Button
              variant="ghost"
              className="w-full text-muted-foreground sm:w-auto"
              onClick={() => setDrawerOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <Button
                className="w-full sm:w-auto"
                variant="outline"
                onClick={() => void handleTestConnection()}
                disabled={submitting || testingConnection}
              >
                {testingConnection ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4 mr-2" />
                )}
                Test Connection
              </Button>
              <Button
                className="w-full bg-slate-900 text-white hover:bg-slate-800 sm:w-auto"
                onClick={() => void handleSubmit()}
                disabled={submitting || !form.displayName.trim()}
              >
                {submitting
                  ? "Saving..."
                  : form.authMode === "oauth_user"
                    ? editTarget
                      ? editTarget.hasAccessToken
                        ? "Reconnect Meta"
                        : "Connect Meta"
                      : "Create & Connect Meta"
                    : editTarget
                      ? "Save Changes"
                      : "Create Integration"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
