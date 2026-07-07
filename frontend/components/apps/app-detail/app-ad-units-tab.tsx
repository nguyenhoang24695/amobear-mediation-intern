"use client";

import type React from "react";

import { useState, useMemo, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Search,
  MoreHorizontal,
  Eye,
  Copy,
  Pause,
  Play,
  Pencil,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RectangleHorizontal,
  Square,
  Gift,
  LayoutGrid,
  Smartphone,
  Check,
  Info,
  Sparkles,
  Layers3,
} from "lucide-react";
import { cn, copyTextToClipboard } from "@/lib/utils";
import { useApi } from "@/hooks/use-api";
import { structureApi } from "@/lib/api/services";
import { Pagination } from "@/components/shared/pagination";
import type { AdUnit } from "@/types/api";
import { DEPRECATED_METRICS_MAX_YMD } from "@/lib/constants/deprecated-app-metrics";

const formatIcons: Record<string, React.ElementType> = {
  BANNER: RectangleHorizontal,
  INTERSTITIAL: Square,
  REWARDED: Gift,
  REWARDED_INTERSTITIAL: Gift,
  NATIVE: LayoutGrid,
  APP_OPEN: Smartphone,
  Banner: RectangleHorizontal,
  Interstitial: Square,
  Rewarded: Gift,
  Native: LayoutGrid,
  "App Open": Smartphone,
};

const formatColors: Record<string, string> = {
  BANNER:
    "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/70 dark:bg-sky-950/40 dark:text-sky-300",
  INTERSTITIAL:
    "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/70 dark:bg-violet-950/40 dark:text-violet-300",
  REWARDED:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300",
  REWARDED_INTERSTITIAL:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300",
  NATIVE:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300",
  APP_OPEN:
    "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900/70 dark:bg-cyan-950/40 dark:text-cyan-300",
  Banner:
    "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/70 dark:bg-sky-950/40 dark:text-sky-300",
  Interstitial:
    "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/70 dark:bg-violet-950/40 dark:text-violet-300",
  Rewarded:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300",
  Native:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300",
  "App Open":
    "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900/70 dark:bg-cyan-950/40 dark:text-cyan-300",
};

const formatAdFormat = (format?: string): string => {
  if (!format) return "Unknown";
  return format
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

function ymdUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getDefaultDeprecatedMetricRange(): {
  startDate: string;
  endDate: string;
} {
  let end = ymdUtc(new Date());
  if (end > DEPRECATED_METRICS_MAX_YMD) end = DEPRECATED_METRICS_MAX_YMD;
  const endD = new Date(`${end}T00:00:00.000Z`);
  const startD = new Date(endD);
  startD.setUTCDate(startD.getUTCDate() - 6);
  return { startDate: ymdUtc(startD), endDate: end };
}

type SortField = "name" | "ecpm" | "impressions" | "revenue" | "fillRate";
type SortDirection = "asc" | "desc";

export function AppAdUnitsTab() {
  const params = useParams();
  const appIdFromParams = (params as any)?.id as string | undefined;
  const hasValidAppId = !!appIdFromParams;

  const initialMetricRange = useMemo(
    () => getDefaultDeprecatedMetricRange(),
    [],
  );
  const [startDate, setStartDate] = useState(initialMetricRange.startDate);
  const [endDate, setEndDate] = useState(initialMetricRange.endDate);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>("revenue");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data: app } = useApi(
    () => structureApi.getAppByAppId(appIdFromParams!),
    {
      enabled: hasValidAppId,
      cacheKey: hasValidAppId ? `app_detail_${appIdFromParams}` : undefined,
    },
  );

  const { data: adUnits, loading } = useApi<AdUnit[]>(
    () => structureApi.getAppAdUnits(app!.id, { startDate, endDate }),
    {
      enabled: !!app,
      cacheKey: app
        ? `app_ad_units_${app.appId}_${startDate}_${endDate}`
        : undefined,
    },
  );

  const filteredUnits = useMemo(() => {
    if (!adUnits) return [];
    return adUnits.filter((unit) => {
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const name = (unit.displayName || unit.name || "").toLowerCase();
        const adUnitId = (unit.adUnitId || "").toLowerCase();
        if (!name.includes(searchLower) && !adUnitId.includes(searchLower)) {
          return false;
        }
      }
      return true;
    });
  }, [adUnits, searchQuery]);

  const sortedUnits = useMemo(() => {
    const multiplier = sortDirection === "asc" ? 1 : -1;
    return [...filteredUnits].sort((a, b) => {
      switch (sortField) {
        case "name": {
          const nameA = (a.displayName || a.name || "").toLowerCase();
          const nameB = (b.displayName || b.name || "").toLowerCase();
          return multiplier * nameA.localeCompare(nameB);
        }
        case "ecpm":
          return multiplier * ((a.ecpm || 0) - (b.ecpm || 0));
        case "impressions":
          return multiplier * ((a.impressions || 0) - (b.impressions || 0));
        case "revenue":
          return multiplier * ((a.revenue || 0) - (b.revenue || 0));
        case "fillRate":
          return multiplier * ((a.fillRate || 0) - (b.fillRate || 0));
        default:
          return 0;
      }
    });
  }, [filteredUnits, sortField, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedUnits.length / pageSize));
  const paginatedUnits = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return sortedUnits.slice(startIndex, endIndex);
  }, [sortedUnits, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortField, sortDirection, startDate, endDate]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const toggleSelectAll = () => {
    const paginatedUnitIds = paginatedUnits.map((u) => u.id.toString());
    const allPaginatedSelected = paginatedUnitIds.every((id) =>
      selectedUnits.includes(id),
    );

    if (allPaginatedSelected) {
      setSelectedUnits(
        selectedUnits.filter((id) => !paginatedUnitIds.includes(id)),
      );
    } else {
      const newSelection = [...selectedUnits];
      paginatedUnitIds.forEach((id) => {
        if (!newSelection.includes(id)) {
          newSelection.push(id);
        }
      });
      setSelectedUnits(newSelection);
    }
  };

  const toggleSelectUnit = (unitId: number) => {
    const idStr = unitId.toString();
    if (selectedUnits.includes(idStr)) {
      setSelectedUnits(selectedUnits.filter((id) => id !== idStr));
    } else {
      setSelectedUnits([...selectedUnits, idStr]);
    }
  };

  const copyAdUnitId = async (id: number, adUnitId: string) => {
    try {
      const copiedText = await copyTextToClipboard(adUnitId);
      if (!copiedText) return;

      setCopiedId(id.toString());
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error("Failed to copy ad unit ID", error);
    }
  };

  const SortHeader = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 transition-colors hover:text-foreground"
    >
      {children}
      {sortField === field ? (
        sortDirection === "asc" ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-50" />
      )}
    </button>
  );

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-5 rounded-2xl bg-gradient-to-b from-background via-background to-muted/20">
        <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/70 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Layers3 className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground">
                Ad Units
              </h2>
              <p className="text-sm text-muted-foreground">
                Search, sort, and inspect ad unit performance in a cleaner,
                denser view.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Theme updated for better contrast and hierarchy
            </div>
            <div className="flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-800 dark:text-amber-300">
              <Info className="h-3.5 w-3.5" />
              Metrics available only up to{" "}
              <strong>{DEPRECATED_METRICS_MAX_YMD}</strong>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/70 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label
                htmlFor="deprecated-adu-start"
                className="text-xs text-muted-foreground"
              >
                Start date
              </Label>
              <Input
                id="deprecated-adu-start"
                type="date"
                max={DEPRECATED_METRICS_MAX_YMD}
                value={startDate}
                onChange={(e) => {
                  const v = e.target.value;
                  const c =
                    v > DEPRECATED_METRICS_MAX_YMD
                      ? DEPRECATED_METRICS_MAX_YMD
                      : v;
                  setStartDate(c);
                  if (c > endDate) setEndDate(c);
                }}
                className="h-10 w-[168px] border-border/70 bg-background/70 shadow-sm transition-colors focus-visible:bg-background"
              />
            </div>
            <div className="space-y-1">
              <Label
                htmlFor="deprecated-adu-end"
                className="text-xs text-muted-foreground"
              >
                End date
              </Label>
              <Input
                id="deprecated-adu-end"
                type="date"
                max={DEPRECATED_METRICS_MAX_YMD}
                value={endDate}
                onChange={(e) => {
                  const v = e.target.value;
                  const c =
                    v > DEPRECATED_METRICS_MAX_YMD
                      ? DEPRECATED_METRICS_MAX_YMD
                      : v;
                  setEndDate(c);
                  if (startDate > c) setStartDate(c);
                }}
                className="h-10 w-[168px] border-border/70 bg-background/70 shadow-sm transition-colors focus-visible:bg-background"
              />
            </div>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search ad units..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 border-border/70 bg-background/70 pl-9 shadow-sm transition-colors focus-visible:bg-background"
              />
            </div>
          </div>
        </div>

        <Card className="overflow-hidden border-border/70 bg-card/90 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border/70 bg-muted/40 backdrop-blur">
                <tr className="text-xs font-medium text-muted-foreground">
                  <th className="w-10 px-4 py-3 text-left">
                    <Checkbox
                      checked={
                        paginatedUnits.length > 0 &&
                        paginatedUnits.every((u) =>
                          selectedUnits.includes(u.id.toString()),
                        )
                      }
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  <th className="min-w-[180px] px-4 py-3 text-left">
                    <SortHeader field="name">Name</SortHeader>
                  </th>
                  <th className="px-4 py-3 text-left">Format</th>
                  <th className="min-w-[220px] px-4 py-3 text-left">
                    Ad Unit ID
                  </th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">
                    <SortHeader field="ecpm">eCPM</SortHeader>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <SortHeader field="impressions">Impressions</SortHeader>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <SortHeader field="revenue">Revenue</SortHeader>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <SortHeader field="fillRate">Fill Rate</SortHeader>
                  </th>
                  <th className="w-16 px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {loading ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-4 py-8 text-center text-sm text-muted-foreground"
                    >
                      Loading ad units...
                    </td>
                  </tr>
                ) : sortedUnits.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-4 py-8 text-center text-sm text-muted-foreground"
                    >
                      {searchQuery
                        ? "No ad units found matching your search."
                        : "No ad units found for this app."}
                    </td>
                  </tr>
                ) : (
                  paginatedUnits.map((unit) => {
                    const format = unit.adFormat || "Unknown";
                    const FormatIcon =
                      formatIcons[format] || RectangleHorizontal;
                    const formatDisplay = formatAdFormat(format);
                    const unitIdStr = unit.id.toString();
                    const fillRate = unit.fillRate || 0;
                    return (
                      <tr
                        key={unit.id}
                        className={cn(
                          "transition-colors hover:bg-muted/40",
                          selectedUnits.includes(unitIdStr) &&
                            "bg-primary/5 hover:bg-primary/5",
                          unit.status === "Paused" && "opacity-70",
                        )}
                      >
                        <td className="px-4 py-3">
                          <Checkbox
                            checked={selectedUnits.includes(unitIdStr)}
                            onCheckedChange={() => toggleSelectUnit(unit.id)}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-foreground">
                            {unit.displayName || unit.name || "Unnamed Ad Unit"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={cn(
                              "gap-1",
                              formatColors[format] || formatColors.BANNER,
                            )}
                          >
                            <FormatIcon className="h-3 w-3" />
                            {formatDisplay}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <code className="rounded-md border border-border/70 bg-muted/50 px-2 py-0.5 font-mono text-xs text-muted-foreground">
                              {unit.adUnitId}
                            </code>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() =>
                                    void copyAdUnitId(unit.id, unit.adUnitId)
                                  }
                                  className="rounded-md p-1 transition-colors hover:bg-muted"
                                >
                                  {copiedId === unitIdStr ? (
                                    <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                                  )}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {copiedId === unitIdStr ? "Copied!" : "Copy ID"}
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {unit.status === "Active" || !unit.status ? (
                            <Badge className="border-0 bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                              Active
                            </Badge>
                          ) : (
                            <Badge className="border-0 bg-muted/70 text-muted-foreground">
                              Paused
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-medium text-foreground">
                            ${(unit.ecpm || 0).toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm text-muted-foreground">
                            {(unit.impressions || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-medium text-foreground">
                            ${(unit.revenue || 0).toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={cn(
                              "text-sm font-medium",
                              fillRate >= 95
                                ? "text-green-600 dark:text-green-400"
                                : fillRate >= 90
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-red-600 dark:text-red-400",
                            )}
                          >
                            {fillRate > 0 ? `${fillRate.toFixed(2)}%` : "-"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                className="h-8 w-8 rounded-md p-0 text-muted-foreground hover:bg-muted hover:text-foreground"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-48 border-border/70 bg-popover/95 shadow-lg backdrop-blur"
                            >
                              <DropdownMenuItem className="gap-2">
                                <Eye className="h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2">
                                <Pencil className="h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="gap-2"
                                onClick={() =>
                                  void copyAdUnitId(unit.id, unit.adUnitId)
                                }
                              >
                                <Copy className="h-4 w-4" />
                                Copy ID
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="gap-2 text-amber-600 dark:text-amber-400">
                                {unit.status === "Active" || !unit.status ? (
                                  <>
                                    <Pause className="h-4 w-4" />
                                    Pause
                                  </>
                                ) : (
                                  <>
                                    <Play className="h-4 w-4" />
                                    Resume
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2 text-destructive">
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {sortedUnits.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={sortedUnits.length}
              pageSize={pageSize}
              onPageChange={(page) => setCurrentPage(page)}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
              itemName="ad units"
            />
          )}
        </Card>
      </div>
    </TooltipProvider>
  );
}
