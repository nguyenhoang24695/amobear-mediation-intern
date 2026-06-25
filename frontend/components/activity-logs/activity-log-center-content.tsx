"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import {
  Activity,
  Check,
  ChevronsUpDown,
  Eye,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  activityLogsApi,
  type ActivityLogDetail,
  type ActivityLogDomainOption,
  type ActivityLogEventTypeOption,
  type ActivityLogListItem,
  type PagedResult,
} from "@/lib/api/services";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/shared/pagination";
import { cn } from "@/lib/utils";
import { ActivityLogDetailDialog } from "./activity-log-detail-dialog";

const ALL_DOMAIN_OPTION = { value: "all", label: "All Domains" };

// Fallback khi endpoint /filter-options chưa trả về (lỗi mạng / đang load).
// Nguồn chuẩn là backend ActivityLogEventCatalog — danh sách này chỉ để UI không trống.
const FALLBACK_DOMAIN_OPTIONS = [
  ALL_DOMAIN_OPTION,
  { value: "waterfall", label: "Waterfall" },
  { value: "job", label: "Jobs" },
  { value: "app", label: "App" },
  { value: "organization", label: "Organization" },
  { value: "user", label: "User" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "success", label: "Success" },
  { value: "failed", label: "Failed" },
  { value: "pending", label: "Pending" },
];

const TARGET_TYPE_OPTIONS = [
  { value: "all", label: "All Targets" },
  { value: "app", label: "App" },
  { value: "mediation_group", label: "Mediation Group" },
  { value: "organization", label: "Organization" },
  { value: "user", label: "User" },
  { value: "team", label: "Team" },
  { value: "job_schedule", label: "Job Schedule" },
];

const JOB_NAME_OPTIONS = [
  { value: "all", label: "All Jobs" },
  { value: "structure-sync-job", label: "Structure Sync" },
  { value: "token-refresh-job", label: "Token Refresh" },
  { value: "waterfall-recommendation-job", label: "Waterfall Recommendation" },
  { value: "dashboard-cache-job", label: "Dashboard Cache" },
];

const FALLBACK_EVENT_TYPE_OPTIONS = [
  {
    value: "waterfall.apply.succeeded",
    label: "Waterfall Apply Succeeded",
    domain: "waterfall",
  },
  {
    value: "waterfall.apply.failed",
    label: "Waterfall Apply Failed",
    domain: "waterfall",
  },
  {
    value: "waterfall.sync.succeeded",
    label: "Waterfall Sync Succeeded",
    domain: "waterfall",
  },
  {
    value: "waterfall.sync.failed",
    label: "Waterfall Sync Failed",
    domain: "waterfall",
  },
  {
    value: "waterfall.cleanup.succeeded",
    label: "Waterfall Cleanup Succeeded",
    domain: "waterfall",
  },
  {
    value: "waterfall.cleanup.failed",
    label: "Waterfall Cleanup Failed",
    domain: "waterfall",
  },
  {
    value: "job.structure_sync.started",
    label: "Structure Sync Started",
    domain: "job",
  },
  {
    value: "job.structure_sync.completed",
    label: "Structure Sync Completed",
    domain: "job",
  },
  {
    value: "job.structure_sync.failed",
    label: "Structure Sync Failed",
    domain: "job",
  },
  {
    value: "job.token_refresh.started",
    label: "Token Refresh Started",
    domain: "job",
  },
  {
    value: "job.token_refresh.completed",
    label: "Token Refresh Completed",
    domain: "job",
  },
  {
    value: "job.token_refresh.failed",
    label: "Token Refresh Failed",
    domain: "job",
  },
  {
    value: "job.waterfall_recommendation.started",
    label: "Waterfall Recommendation Started",
    domain: "job",
  },
  {
    value: "job.waterfall_recommendation.completed",
    label: "Waterfall Recommendation Completed",
    domain: "job",
  },
  {
    value: "job.waterfall_recommendation.failed",
    label: "Waterfall Recommendation Failed",
    domain: "job",
  },
  {
    value: "job.dashboard_cache.started",
    label: "Dashboard Cache Started",
    domain: "job",
  },
  {
    value: "job.dashboard_cache.completed",
    label: "Dashboard Cache Completed",
    domain: "job",
  },
  {
    value: "job.dashboard_cache.failed",
    label: "Dashboard Cache Failed",
    domain: "job",
  },
  {
    value: "organization.created",
    label: "Organization Created",
    domain: "organization",
  },
  {
    value: "organization.updated",
    label: "Organization Updated",
    domain: "organization",
  },
  {
    value: "organization.deleted",
    label: "Organization Deleted",
    domain: "organization",
  },
  {
    value: "organization.activated",
    label: "Organization Activated",
    domain: "organization",
  },
  {
    value: "organization.deactivated",
    label: "Organization Deactivated",
    domain: "organization",
  },
  {
    value: "organization.personnel_chart.saved",
    label: "Organization Chart Saved",
    domain: "organization",
  },
  { value: "user.created", label: "User Created", domain: "user" },
  { value: "user.invited", label: "User Invited", domain: "user" },
  { value: "user.updated", label: "User Updated", domain: "user" },
  { value: "user.role_changed", label: "User Role Changed", domain: "user" },
  { value: "user.deactivated", label: "User Deactivated", domain: "user" },
  {
    value: "user.permissions_updated",
    label: "User Permissions Updated",
    domain: "user",
  },
  { value: "user.team_added", label: "User Team Added", domain: "user" },
  { value: "user.team_removed", label: "User Team Removed", domain: "user" },
  {
    value: "app.alert_status.updated",
    label: "App alert rules toggled",
    domain: "app",
  },
];

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return format(date, "PPpp");
}

function formatRelativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return formatDistanceToNow(date, { addSuffix: true });
}

function statusBadgeClass(status: string, severity: string) {
  if (status === "failed" || severity === "error") {
    return "border-red-200 bg-red-50 text-red-700 hover:bg-red-50";
  }

  if (status === "pending" || severity === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50";
  }

  return "border-green-200 bg-green-50 text-green-700 hover:bg-green-50";
}

function statusBadgeLabel(status: string, severity: string) {
  return status === "success" && severity === "warning" ? "warning" : status;
}

function formatStageLabel(stage?: string | null) {
  if (!stage) return "Event";

  return stage
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function resolveStartedAt(log: ActivityLogListItem) {
  return log.startedAt ?? log.milestones[0]?.occurredAt ?? log.occurredAt;
}

function resolveCompletedAt(log: ActivityLogListItem) {
  return (
    log.completedAt ??
    (log.milestones.length > 1
      ? log.milestones[log.milestones.length - 1]?.occurredAt
      : null)
  );
}

function hasFailedMilestone(log: ActivityLogListItem) {
  return (
    log.status === "failed" ||
    log.severity === "error" ||
    log.milestones.some(
      (milestone) =>
        milestone.status === "failed" || milestone.severity === "error",
    )
  );
}

function hasWarningSignal(log: ActivityLogListItem) {
  return (
    log.severity === "warning" ||
    log.milestones.some((milestone) => milestone.severity === "warning")
  );
}

function domainBadgeClass(domain: string) {
  switch (domain) {
    case "waterfall":
      return "border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-50";
    case "job":
      return "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-50";
    case "organization":
      return "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50";
    case "user":
      return "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-100";
    case "app":
      return "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-50";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-50";
  }
}

function buildDateParam(dateValue: string, isEndOfDay = false) {
  if (!dateValue) return undefined;

  const localDateTime = new Date(
    `${dateValue}T${isEndOfDay ? "23:59:59.999" : "00:00:00.000"}`,
  );
  if (Number.isNaN(localDateTime.getTime())) return undefined;

  return localDateTime.toISOString();
}

function normalizeDateInput(value?: string | null) {
  if (!value) return "";

  const trimmed = value.trim();
  if (!trimmed) return "";

  return trimmed.length >= 10 ? trimmed.slice(0, 10) : trimmed;
}

function parsePositiveInt(value?: string | null, fallback = 1) {
  if (!value) return fallback;

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

type ActivityLogTextFilters = {
  q: string;
  actor: string;
  appId: string;
  mediationGroupId: string;
  targetId: string;
};

function sameTextFilters(a: ActivityLogTextFilters, b: ActivityLogTextFilters) {
  return (
    a.q === b.q &&
    a.actor === b.actor &&
    a.appId === b.appId &&
    a.mediationGroupId === b.mediationGroupId &&
    a.targetId === b.targetId
  );
}

function ActivityLogsTableSkeleton() {
  return (
    <div className="space-y-3 p-6">
      {Array.from({ length: 7 }).map((_, index) => (
        <div
          key={index}
          className="grid grid-cols-[180px_180px_minmax(260px,1fr)_180px_180px_120px] gap-3"
        >
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  );
}

interface EventTypeFilterComboboxProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (next: string) => void;
}

function EventTypeFilterCombobox({
  options,
  value,
  onChange,
}: EventTypeFilterComboboxProps) {
  const [open, setOpen] = useState(false);

  const selectedLabel =
    value === "all"
      ? "All Event Types"
      : (options.find((option) => option.value === value)?.label ??
        "All Event Types");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          className="h-10 w-full justify-between bg-white px-3 text-left font-normal"
        >
          <span className="min-w-0 flex-1 truncate text-left">
            {selectedLabel}
          </span>
          <ChevronsUpDown
            className="ml-2 h-4 w-4 shrink-0 opacity-50"
            aria-hidden
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] min-w-[min(100vw-2rem,320px)] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Search event type..." />
          <CommandList>
            <CommandEmpty>No event type found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__all__ All Event Types"
                onSelect={() => {
                  onChange("all");
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4 shrink-0",
                    value === "all" ? "opacity-100" : "opacity-0",
                  )}
                />
                <span className="text-slate-700">All Event Types</span>
              </CommandItem>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  // Cho cmdk search được cả label lẫn raw event type (vd "policy", "waterfall.policy.updated").
                  value={`${option.label} ${option.value}`}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      value === option.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="truncate">{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function ActivityLogCenterContent() {
  return <ActivityLogCenterBody />;
}

function ActivityLogCenterBody() {
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const filtersFromUrl = useMemo(
    () => ({
      q: searchParams.get("q") ?? "",
      domain: searchParams.get("domain") ?? "all",
      eventType: searchParams.get("eventType") ?? "all",
      status: searchParams.get("status") ?? "all",
      actor: searchParams.get("actor") ?? "",
      targetType: searchParams.get("targetType") ?? "all",
      targetId: searchParams.get("targetId") ?? "",
      jobName: searchParams.get("jobName") ?? "all",
      appId: searchParams.get("appId") ?? "",
      mediationGroupId: searchParams.get("mediationGroupId") ?? "",
      fromDate: normalizeDateInput(searchParams.get("from")),
      toDate: normalizeDateInput(searchParams.get("to")),
      page: parsePositiveInt(searchParams.get("page"), 1),
      pageSize: parsePositiveInt(searchParams.get("pageSize"), 20),
    }),
    [searchParams],
  );

  const [searchQuery, setSearchQuery] = useState(filtersFromUrl.q);
  const [domainFilter, setDomainFilter] = useState(filtersFromUrl.domain);
  const [eventTypeFilter, setEventTypeFilter] = useState(
    filtersFromUrl.eventType,
  );
  const [statusFilter, setStatusFilter] = useState(filtersFromUrl.status);
  const [actorFilter, setActorFilter] = useState(filtersFromUrl.actor);
  const [targetTypeFilter, setTargetTypeFilter] = useState(
    filtersFromUrl.targetType,
  );
  const [targetIdFilter, setTargetIdFilter] = useState(filtersFromUrl.targetId);
  const [jobNameFilter, setJobNameFilter] = useState(filtersFromUrl.jobName);
  const [appIdFilter, setAppIdFilter] = useState(filtersFromUrl.appId);
  const [mediationGroupIdFilter, setMediationGroupIdFilter] = useState(
    filtersFromUrl.mediationGroupId,
  );
  const [fromDate, setFromDate] = useState(filtersFromUrl.fromDate);
  const [toDate, setToDate] = useState(filtersFromUrl.toDate);
  const [currentPage, setCurrentPage] = useState(filtersFromUrl.page);
  const [pageSize, setPageSize] = useState(filtersFromUrl.pageSize);
  const [filtersReady, setFiltersReady] = useState(false);

  const [debouncedTextFilters, setDebouncedTextFilters] =
    useState<ActivityLogTextFilters>({
      q: filtersFromUrl.q,
      actor: filtersFromUrl.actor,
      appId: filtersFromUrl.appId,
      mediationGroupId: filtersFromUrl.mediationGroupId,
      targetId: filtersFromUrl.targetId,
    });

  const [result, setResult] = useState<PagedResult<ActivityLogListItem>>({
    items: [],
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Catalog filter lấy động từ backend (ActivityLogEventCatalog); fallback tĩnh nếu fetch lỗi.
  const [domainOptions, setDomainOptions] = useState<ActivityLogDomainOption[]>(
    FALLBACK_DOMAIN_OPTIONS,
  );
  const [eventTypeOptions, setEventTypeOptions] = useState<
    ActivityLogEventTypeOption[]
  >(FALLBACK_EVENT_TYPE_OPTIONS);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedPreview, setSelectedPreview] =
    useState<ActivityLogListItem | null>(null);
  const [selectedDetail, setSelectedDetail] =
    useState<ActivityLogDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const next = {
        q: searchQuery.trim(),
        actor: actorFilter.trim(),
        appId: appIdFilter.trim(),
        mediationGroupId: mediationGroupIdFilter.trim(),
        targetId: targetIdFilter.trim(),
      };
      setDebouncedTextFilters((prev) =>
        sameTextFilters(prev, next) ? prev : next,
      );
    }, 300);

    return () => clearTimeout(timer);
  }, [
    searchQuery,
    actorFilter,
    appIdFilter,
    mediationGroupIdFilter,
    targetIdFilter,
  ]);

  useEffect(() => {
    let cancelled = false;
    activityLogsApi
      .getFilterOptions()
      .then((options) => {
        if (cancelled) return;
        if (options.domains?.length) {
          setDomainOptions([ALL_DOMAIN_OPTION, ...options.domains]);
        }
        if (options.eventTypes?.length) {
          setEventTypeOptions(options.eventTypes);
        }
      })
      .catch((err) => {
        // Giữ fallback tĩnh nếu lỗi — không chặn UI.
        console.error("Failed to load activity log filter options:", err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setSearchQuery(filtersFromUrl.q);
    setDomainFilter(filtersFromUrl.domain);
    setEventTypeFilter(filtersFromUrl.eventType);
    setStatusFilter(filtersFromUrl.status);
    setActorFilter(filtersFromUrl.actor);
    setTargetTypeFilter(filtersFromUrl.targetType);
    setTargetIdFilter(filtersFromUrl.targetId);
    setJobNameFilter(filtersFromUrl.jobName);
    setAppIdFilter(filtersFromUrl.appId);
    setMediationGroupIdFilter(filtersFromUrl.mediationGroupId);
    setFromDate(filtersFromUrl.fromDate);
    setToDate(filtersFromUrl.toDate);
    setCurrentPage(filtersFromUrl.page);
    setPageSize(filtersFromUrl.pageSize);
    const nextDebouncedTextFilters = {
      q: filtersFromUrl.q,
      actor: filtersFromUrl.actor,
      appId: filtersFromUrl.appId,
      mediationGroupId: filtersFromUrl.mediationGroupId,
      targetId: filtersFromUrl.targetId,
    };
    setDebouncedTextFilters((prev) =>
      sameTextFilters(prev, nextDebouncedTextFilters)
        ? prev
        : nextDebouncedTextFilters,
    );
    setFiltersReady(true);
  }, [filtersFromUrl]);

  const filteredEventTypes = useMemo(() => {
    if (domainFilter === "all") return eventTypeOptions;
    return eventTypeOptions.filter((option) => option.domain === domainFilter);
  }, [domainFilter, eventTypeOptions]);

  useEffect(() => {
    if (
      eventTypeFilter !== "all" &&
      !filteredEventTypes.some((option) => option.value === eventTypeFilter)
    ) {
      setEventTypeFilter("all");
    }
  }, [eventTypeFilter, filteredEventTypes]);

  const fetchActivityLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await activityLogsApi.list({
        q: debouncedTextFilters.q || undefined,
        actor: debouncedTextFilters.actor || undefined,
        domain: domainFilter !== "all" ? domainFilter : undefined,
        eventType: eventTypeFilter !== "all" ? eventTypeFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        targetType: targetTypeFilter !== "all" ? targetTypeFilter : undefined,
        targetId: debouncedTextFilters.targetId || undefined,
        jobName: jobNameFilter !== "all" ? jobNameFilter : undefined,
        appId: /^\d+$/.test(debouncedTextFilters.appId)
          ? Number(debouncedTextFilters.appId)
          : undefined,
        mediationGroupId: debouncedTextFilters.mediationGroupId || undefined,
        from: buildDateParam(fromDate),
        to: buildDateParam(toDate, true),
        page: currentPage,
        pageSize,
      });

      setResult(response);
    } catch (err) {
      console.error("Failed to fetch activity logs:", err);
      setError("Failed to load activity logs");
      toast({
        title: "Error",
        description: "Failed to load activity logs. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    debouncedTextFilters,
    domainFilter,
    eventTypeFilter,
    fromDate,
    jobNameFilter,
    pageSize,
    statusFilter,
    targetTypeFilter,
    toDate,
    toast,
  ]);

  useEffect(() => {
    if (!filtersReady) return;
    fetchActivityLogs();
  }, [fetchActivityLogs, filtersReady]);

  const handleOpenDetails = async (log: ActivityLogListItem) => {
    setSelectedPreview(log);
    setSelectedDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    setDetailsOpen(true);

    try {
      const detail = await activityLogsApi.getById(log.id);
      setSelectedDetail(detail);
    } catch (err) {
      console.error("Failed to load activity log detail:", err);
      setDetailError("Failed to load activity log detail.");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setDomainFilter("all");
    setEventTypeFilter("all");
    setStatusFilter("all");
    setActorFilter("");
    setTargetTypeFilter("all");
    setTargetIdFilter("");
    setJobNameFilter("all");
    setAppIdFilter("");
    setMediationGroupIdFilter("");
    setFromDate("");
    setToDate("");
    setCurrentPage(1);
    setPageSize(20);
  };

  const hasActiveFilters = Boolean(
    searchQuery ||
    domainFilter !== "all" ||
    eventTypeFilter !== "all" ||
    statusFilter !== "all" ||
    actorFilter ||
    targetTypeFilter !== "all" ||
    targetIdFilter ||
    jobNameFilter !== "all" ||
    appIdFilter ||
    mediationGroupIdFilter ||
    fromDate ||
    toDate,
  );

  const currentPageFailureCount = result.items.filter((item) =>
    hasFailedMilestone(item),
  ).length;
  const currentPageWarningCount = result.items.filter((item) =>
    hasWarningSignal(item),
  ).length;
  const currentPageDomainCount = new Set(
    result.items.map((item) => item.domain),
  ).size;
  const latestOccurredAt = result.items[0]?.occurredAt;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <Activity className="h-6 w-6 text-slate-700" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold  lg:text-3xl">
                Global Activity Center
              </h1>
              <Badge variant="secondary" className="rounded-full">
                Admin Only
              </Badge>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Unified timeline for waterfall actions, jobs, and organization or
              user audit events.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="gap-2 bg-transparent"
            onClick={fetchActivityLogs}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            className="gap-2 bg-transparent"
            onClick={handleClearFilters}
            disabled={!hasActiveFilters}
          >
            Clear Filters
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card className="border-slate-200 bg-slate-50">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-slate-500">
              Matched Activities
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {result.total}
            </p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-red-700">Failures On Page</p>
            <p className="mt-1 text-2xl font-bold text-red-600">
              {currentPageFailureCount}
            </p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-amber-700">
              Warnings On Page
            </p>
            <p className="mt-1 text-2xl font-bold text-amber-600">
              {currentPageWarningCount}
            </p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-slate-50">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-slate-500">
              Domains On Page
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {currentPageDomainCount}
            </p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-emerald-700">
              Latest Activity
            </p>
            <p className="mt-1 text-sm font-semibold text-emerald-700">
              {latestOccurredAt
                ? formatRelativeTime(latestOccurredAt)
                : "No activity"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200">
        <CardHeader className="gap-4 border-b border-slate-100 pb-6">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="text-base">Filters</CardTitle>
              <CardDescription>
                Search across summary, actor, and target name, then narrow by
                domain or exact entity identifiers.
              </CardDescription>
            </div>
            <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <ShieldCheck className="h-4 w-4 text-slate-500" />
              Restricted to admin and super admin roles
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-3 xl:grid-cols-[minmax(240px,1.4fr)_200px_220px_180px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search summary, actor, or target..."
                className="pl-9"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <Select
              value={domainFilter}
              onValueChange={(value) => {
                setDomainFilter(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Domain" />
              </SelectTrigger>
              <SelectContent>
                {domainOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <EventTypeFilterCombobox
              options={filteredEventTypes}
              value={eventTypeFilter}
              onChange={(value) => {
                setEventTypeFilter(value);
                setCurrentPage(1);
              }}
            />

            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-8">
            <Input
              placeholder="Actor name"
              value={actorFilter}
              onChange={(event) => {
                setActorFilter(event.target.value);
                setCurrentPage(1);
              }}
            />

            <Select
              value={targetTypeFilter}
              onValueChange={(value) => {
                setTargetTypeFilter(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Target Type" />
              </SelectTrigger>
              <SelectContent>
                {TARGET_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              placeholder="Target ID"
              value={targetIdFilter}
              onChange={(event) => {
                setTargetIdFilter(event.target.value);
                setCurrentPage(1);
              }}
            />

            <Select
              value={jobNameFilter}
              onValueChange={(value) => {
                setJobNameFilter(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Job Name" />
              </SelectTrigger>
              <SelectContent>
                {JOB_NAME_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              placeholder="App ID"
              inputMode="numeric"
              value={appIdFilter}
              onChange={(event) => {
                setAppIdFilter(event.target.value);
                setCurrentPage(1);
              }}
            />

            <Input
              placeholder="Mediation Group ID"
              value={mediationGroupIdFilter}
              onChange={(event) => {
                setMediationGroupIdFilter(event.target.value);
                setCurrentPage(1);
              }}
            />

            <Input
              type="date"
              value={fromDate}
              onChange={(event) => {
                setFromDate(event.target.value);
                setCurrentPage(1);
              }}
            />

            <Input
              type="date"
              value={toDate}
              onChange={(event) => {
                setToDate(event.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-base">Activity Timeline</CardTitle>
              <CardDescription>
                Grouped by activity correlation so each run stays on one row
                with its timeline and milestones.
              </CardDescription>
            </div>
            <div className="text-sm text-slate-500">
              Page{" "}
              <span className="font-semibold text-slate-900">
                {result.page}
              </span>
              {result.totalPages > 0 ? ` of ${result.totalPages}` : ""}
            </div>
          </div>
        </CardHeader>

        {loading ? (
          <ActivityLogsTableSkeleton />
        ) : error ? (
          <CardContent className="pt-6">
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          </CardContent>
        ) : result.items.length === 0 ? (
          <CardContent className="pt-6">
            <Empty className="border border-dashed border-slate-200">
              <EmptyMedia variant="icon">
                <Activity className="size-6 text-slate-500" />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>No activities found</EmptyTitle>
                <EmptyDescription>
                  {hasActiveFilters
                    ? "Try relaxing your filters or searching a different target."
                    : "No activity has been recorded for the selected scope yet."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        ) : (
          <>
            <CardContent className="p-0">
              <Table className="min-w-[1440px] table-fixed">
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="w-[180px] px-4">
                      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Window
                      </span>
                    </TableHead>
                    <TableHead className="w-[220px]">
                      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Event
                      </span>
                    </TableHead>
                    <TableHead className="w-[400px]">
                      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Summary
                      </span>
                    </TableHead>
                    <TableHead className="w-[170px]">
                      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Actor
                      </span>
                    </TableHead>
                    <TableHead className="w-[260px]">
                      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Target
                      </span>
                    </TableHead>
                    <TableHead className="w-[280px]">
                      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Status
                      </span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.items.map((log) => {
                    const startedAt = resolveStartedAt(log);
                    const completedAt = resolveCompletedAt(log);
                    const showCompletedAt = Boolean(
                      completedAt && completedAt !== startedAt,
                    );

                    return (
                      <TableRow
                        key={log.id}
                        className="group cursor-pointer outline-none hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring/40"
                        tabIndex={0}
                        onClick={() => handleOpenDetails(log)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleOpenDetails(log);
                          }
                        }}
                      >
                        <TableCell className="px-4 py-3 align-top">
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                {showCompletedAt ? "Start" : "At"}
                              </p>
                              <p className="text-sm font-medium text-foreground">
                                {formatRelativeTime(startedAt)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatDateTime(startedAt)}
                              </p>
                            </div>
                            {showCompletedAt && completedAt ? (
                              <div className="space-y-1 border-t border-border pt-3">
                                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                  End
                                </p>
                                <p className="text-sm font-medium text-foreground">
                                  {formatRelativeTime(completedAt)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDateTime(completedAt)}
                                </p>
                              </div>
                            ) : null}
                          </div>
                        </TableCell>

                        <TableCell className="py-3 align-top">
                          <div className="min-w-0 space-y-2">
                            <Badge
                              variant="outline"
                              className={domainBadgeClass(log.domain)}
                            >
                              {log.domain}
                            </Badge>
                            <p className="text-xs font-medium text-foreground">
                              {log.eventCount} event
                              {log.eventCount > 1 ? "s" : ""}
                            </p>
                            <p className="break-all font-mono text-xs text-muted-foreground">
                              {log.eventType}
                            </p>
                          </div>
                        </TableCell>

                        <TableCell className="py-3 align-top">
                          <div className="min-w-0 space-y-1">
                            <p className="whitespace-normal break-words font-medium text-foreground [overflow-wrap:anywhere]">
                              {log.summary}
                            </p>
                            {log.correlationId && (
                              <p className="break-all font-mono text-xs text-muted-foreground">
                                Correlation: {log.correlationId}
                              </p>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="py-3 align-top">
                          <div className="min-w-0 space-y-1">
                            <p className="truncate text-sm font-medium text-foreground">
                              {log.actorName || "System"}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {log.actorRole || log.source}
                            </p>
                          </div>
                        </TableCell>

                        <TableCell className="py-3 align-top">
                          <div className="min-w-0 space-y-1">
                            <p className="whitespace-normal break-words text-sm font-medium text-foreground [overflow-wrap:anywhere]">
                              {log.targetName ||
                                log.jobName ||
                                log.targetId ||
                                "-"}
                            </p>
                            <p className="break-all text-xs text-muted-foreground">
                              {log.targetType || "unknown"}
                              {log.appId ? ` | app ${log.appId}` : ""}
                              {log.mediationGroupId
                                ? ` | ${log.mediationGroupId}`
                                : ""}
                            </p>
                          </div>
                        </TableCell>

                        <TableCell className="py-3 align-top">
                          <div className="min-w-0 space-y-2">
                            {log.milestones.map((milestone) => (
                              <div
                                key={milestone.id}
                                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2 transition-colors group-hover:bg-background"
                              >
                                <div className="min-w-0 space-y-1">
                                  <p className="truncate text-xs font-medium text-foreground">
                                    {formatStageLabel(milestone.stage)}
                                  </p>
                                  <p className="truncate text-[11px] text-muted-foreground">
                                    {formatDateTime(milestone.occurredAt)}
                                  </p>
                                </div>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "shrink-0",
                                    statusBadgeClass(
                                      milestone.status,
                                      milestone.severity,
                                    ),
                                  )}
                                >
                                  {statusBadgeLabel(
                                    milestone.status,
                                    milestone.severity,
                                  )}
                                </Badge>
                              </div>
                            ))}
                            <div className="flex justify-end">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleOpenDetails(log);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                                <span className="sr-only">
                                  View log details
                                </span>
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>

            {result.total > 0 && (
              <Pagination
                currentPage={result.page}
                totalPages={Math.max(result.totalPages, 1)}
                totalItems={result.total}
                pageSize={result.pageSize}
                itemName="activities"
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
              />
            )}
          </>
        )}
      </Card>

      <ActivityLogDetailDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        preview={selectedPreview}
        log={selectedDetail}
        loading={detailLoading}
        error={detailError}
      />
    </div>
  );
}
