"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Eye,
  Percent,
  Calendar,
  Clock,
  Hash,
  Gift,
  Globe,
  Smartphone,
  ArrowRight,
  Pencil,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useApi } from "@/hooks/use-api";
import { structureApi } from "@/lib/api/services";
import { useMemo } from "react";

// Country flags
const countryFlags: Record<string, string> = {
  US: "🇺🇸",
  UK: "🇬🇧",
  GB: "🇬🇧",
  DE: "🇩🇪",
  FR: "🇫🇷",
  JP: "🇯🇵",
  CA: "🇨🇦",
  AU: "🇦🇺",
  IN: "🇮🇳",
  CN: "🇨🇳",
  KR: "🇰🇷",
  BR: "🇧🇷",
  MX: "🇲🇽",
  ES: "🇪🇸",
  IT: "🇮🇹",
  NL: "🇳🇱",
  SE: "🇸🇪",
  NO: "🇳🇴",
  DK: "🇩🇰",
  FI: "🇫🇮",
  PL: "🇵🇱",
  RU: "🇷🇺",
  TR: "🇹🇷",
  SA: "🇸🇦",
  AE: "🇦🇪",
  SG: "🇸🇬",
  MY: "🇲🇾",
  TH: "🇹🇭",
  ID: "🇮🇩",
  PH: "🇵🇭",
  VN: "🇻🇳",
};

// Network logos/images - map ad source IDs to image URLs or emoji
const networkLogos: Record<
  string,
  { image?: string; emoji?: string; color: string }
> = {
  admob: {
    emoji: "📱",
    color: "bg-yellow-400",
  },
  "ca-app-pub": {
    emoji: "📱",
    color: "bg-yellow-400",
  },
  unity: {
    emoji: "🎮",
    color: "bg-slate-800",
  },
  ironsource: {
    emoji: "⚡",
    color: "bg-purple-600",
  },
  applovin: {
    emoji: "🔴",
    color: "bg-red-500",
  },
  vungle: {
    emoji: "💎",
    color: "bg-blue-500",
  },
  meta: {
    emoji: "📘",
    color: "bg-blue-600",
  },
  facebook: {
    emoji: "📘",
    color: "bg-blue-600",
  },
  chartboost: {
    emoji: "📊",
    color: "bg-green-500",
  },
  mintegral: {
    emoji: "🌐",
    color: "bg-orange-500",
  },
  pangle: {
    emoji: "🇨🇳",
    color: "bg-red-600",
  },
  adcolony: {
    emoji: "🏢",
    color: "bg-indigo-500",
  },
  tapjoy: {
    emoji: "🎯",
    color: "bg-pink-500",
  },
};

// Helper to get network info from ad source ID
const getNetworkInfo = (
  adSourceId?: string,
): { emoji?: string; color: string; name: string } => {
  if (!adSourceId) {
    return { color: "bg-slate-400", name: "Unknown" };
  }
  const idLower = adSourceId.toLowerCase();
  for (const [key, info] of Object.entries(networkLogos)) {
    if (idLower.includes(key.toLowerCase())) {
      return {
        emoji: info.emoji,
        color: info.color,
        name: getNetworkName(adSourceId),
      };
    }
  }
  return { color: "bg-slate-400", name: "Unknown" };
};

// Helper to get network name from ad source ID
const getNetworkName = (adSourceId?: string, title?: string): string => {
  // Use title from database if available
  if (title) return title;

  if (!adSourceId) return "Unknown";
  const idLower = adSourceId.toLowerCase();
  if (idLower.includes("admob") || idLower.includes("ca-app-pub"))
    return "AdMob";
  if (idLower.includes("unity")) return "Unity Ads";
  if (idLower.includes("ironsource")) return "ironSource";
  if (idLower.includes("applovin")) return "AppLovin";
  if (idLower.includes("vungle")) return "Vungle";
  if (idLower.includes("meta") || idLower.includes("facebook"))
    return "Meta AN";
  if (idLower.includes("chartboost")) return "Chartboost";
  if (idLower.includes("pangle")) return "Pangle";
  if (idLower.includes("mintegral")) return "Mintegral";
  if (idLower.includes("adcolony")) return "AdColony";
  if (idLower.includes("tapjoy")) return "Tapjoy";
  return adSourceId;
};

// Helper to format number
const formatNumber = (num: number): string => {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toFixed(0);
};

export function MediationGroupOverviewTab() {
  const params = useParams();
  const groupId = Number((params as any)?.id);
  const hasValidId = !Number.isNaN(groupId);

  // Fetch mediation group detail from API (with cache)
  const { data: groupDetail, loading } = useApi(
    () => structureApi.getMediationGroup(groupId),
    {
      enabled: hasValidId,
      cacheKey: hasValidId ? `mediation_group_detail_${groupId}` : undefined,
    },
  );

  // Format dates
  const createdDate = useMemo(() => {
    if (!groupDetail?.createdAt) return "—";
    return new Date(groupDetail.createdAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }, [groupDetail?.createdAt]);

  const lastModifiedDate = useMemo(() => {
    if (!groupDetail?.updatedAt) return "—";
    return new Date(groupDetail.updatedAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }, [groupDetail?.updatedAt]);

  // Performance stats (7 days) with change percentages
  const performanceStats = useMemo(() => {
    if (!groupDetail) return [];

    const detail = groupDetail as any;

    // Calculate Fill Rate from AdRequests and MatchedRequests
    const fillRate7Days =
      detail.TotalAdRequests7Days > 0
        ? (detail.TotalMatchedRequests7Days / detail.TotalAdRequests7Days) * 100
        : 0;

    return [
      {
        label: "eCPM",
        value: detail.AverageEcpm7Days
          ? `$${detail.AverageEcpm7Days.toFixed(2)}`
          : "—",
        change: detail.EcpmChangePct ?? 0,
        icon: DollarSign,
      },
      {
        label: "Fill Rate",
        value: fillRate7Days > 0 ? `${fillRate7Days.toFixed(1)}%` : "—",
        change: detail.FillRateChangePct ?? 0,
        icon: Percent,
      },
      {
        label: "Impressions",
        value: detail.TotalImpressions7Days
          ? formatNumber(detail.TotalImpressions7Days)
          : "—",
        change: detail.ImpressionsChangePct ?? 0,
        icon: Eye,
      },
      {
        label: "Revenue (7D)",
        value: detail.TotalRevenue7Days
          ? `$${detail.TotalRevenue7Days.toFixed(2)}`
          : "—",
        change: detail.RevenueChangePct ?? 0,
        icon: DollarSign,
      },
    ];
  }, [groupDetail]);

  // Ad sources breakdown
  const adSourcesBreakdown = useMemo(() => {
    const detail = groupDetail as any;
    if (!detail?.AdSources) return { bidding: [], waterfall: [] };

    const bidding = detail.AdSources.filter(
      (ads: any) => ads.CpmMode === "BIDDING",
    ).map((ads: any) => {
      const networkInfo = getNetworkInfo(ads.AdSourceId);
      const displayName = getNetworkName(ads.AdSourceId, ads.Title);
      return {
        adSourceId: ads.AdSourceId,
        name: displayName,
        color: networkInfo.color,
        emoji: networkInfo.emoji,
      };
    });

    const waterfall = detail.AdSources.filter(
      (ads: any) => ads.CpmMode === "WATERFALL",
    )
      .sort((a: any, b: any) => (a.Order ?? 0) - (b.Order ?? 0))
      .map((ads: any) => {
        const networkInfo = getNetworkInfo(ads.AdSourceId);
        const displayName = getNetworkName(ads.AdSourceId, ads.Title);
        return {
          adSourceId: ads.AdSourceId,
          name: displayName,
          color: networkInfo.color,
          emoji: networkInfo.emoji,
          order: ads.Order,
        };
      });

    return { bidding, waterfall };
  }, [groupDetail]);

  // Format ad format
  const formatAdFormat = (format?: string): string => {
    if (!format) return "Unknown";
    return format
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!groupDetail) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-sm text-muted-foreground">
          Mediation group not found
        </p>
      </div>
    );
  }

  const countries = (groupDetail as any).Countries || [];
  const isGlobal = countries.length === 0 || countries.length > 10;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-6">
      {/* Left Column */}
      <div className="flex flex-col gap-6">
        {/* Basic Information Card */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-foreground">
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Group ID</p>
                <code className="rounded bg-muted px-2 py-0.5 text-sm font-mono text-foreground">
                  {groupDetail.id}
                </code>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">AdMob Group ID</p>
                <code className="block truncate rounded bg-muted px-2 py-0.5 text-sm font-mono text-foreground">
                  {groupDetail.mediationGroupId}
                </code>
              </div>
              <div className="space-y-1">
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  Created
                </p>
                <p className="text-sm font-medium text-foreground">
                  {createdDate}
                </p>
              </div>
              <div className="space-y-1">
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  Last Modified
                </p>
                <p className="text-sm font-medium text-foreground">
                  {lastModifiedDate}
                </p>
              </div>
              <div className="space-y-1">
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Gift className="w-3 h-3" />
                  Format
                </p>
                <Badge className="border-0 bg-amber-500/15 text-amber-700 dark:text-amber-300">
                  {formatAdFormat(groupDetail.adFormat)}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Hash className="w-3 h-3" />
                  App
                </p>
                {(groupDetail as any).AppAdMobId ? (
                  <Link
                    href={`/apps/${(groupDetail as any).AppAdMobId}`}
                    className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                  >
                    {(groupDetail as any).AppIconUri && (
                      <img
                        src={(groupDetail as any).AppIconUri}
                        alt=""
                        className="w-4 h-4 rounded"
                      />
                    )}
                    {(groupDetail as any).AppName || "Unknown App"}
                  </Link>
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Targeting Card */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-foreground">
                Targeting
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 text-muted-foreground"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              {/* Countries */}
              <div className="space-y-2">
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Globe className="w-3 h-3" />
                  Countries
                </p>
                {isGlobal ? (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Globe className="w-4 h-4" />
                    Global
                  </div>
                ) : countries.length > 0 ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    {countries.map((country: string) => (
                      <Badge
                        key={country}
                        variant="outline"
                        className="gap-1.5 border-border bg-muted/40"
                      >
                        <span>{countryFlags[country] || country}</span>
                        {country}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
              </div>

              {/* Devices */}
              <div className="space-y-2">
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Smartphone className="w-3 h-3" />
                  Devices
                </p>
                <p className="text-sm text-foreground">All devices</p>
              </div>

              {/* Platform */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Platform</p>
                <p className="text-sm text-foreground">
                  {groupDetail.platform || "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column */}
      <div className="flex flex-col gap-6">
        {/* Performance Summary Card */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-foreground">
              Performance (7D)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-4">
              {performanceStats.map((stat, idx) => (
                <div
                  key={idx}
                  className="flex flex-col gap-1 rounded-lg bg-muted/40 p-3"
                >
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <stat.icon className="w-3 h-3" />
                    {stat.label}
                  </div>
                  <p className="text-lg font-semibold text-foreground">
                    {stat.value}
                  </p>
                  {stat.change !== 0 && (
                    <div className="flex items-center gap-1">
                      {stat.change > 0 ? (
                        <TrendingUp className="w-3 h-3 text-emerald-600 dark:text-emerald-300" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-destructive" />
                      )}
                      <span
                        className={cn(
                          "text-xs font-medium",
                          stat.change > 0
                            ? "text-emerald-600 dark:text-emerald-300"
                            : "text-destructive",
                        )}
                      >
                        {stat.change > 0 ? "+" : ""}
                        {stat.change.toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Ad Sources Preview Card */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-foreground">
              Ad Sources
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              {/* Bidding Section */}
              {adSourcesBreakdown.bidding.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-foreground">
                      Bidding
                    </p>
                    <Badge
                      variant="secondary"
                      className="bg-primary/10 text-xs text-primary hover:bg-primary/10"
                    >
                      {adSourcesBreakdown.bidding.length} sources
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {adSourcesBreakdown.bidding.map(
                      (
                        source: {
                          adSourceId: string;
                          name: string;
                          color: string;
                          emoji?: string;
                        },
                        idx: number,
                      ) => (
                        <div
                          key={idx}
                          className={cn(
                            "w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold",
                            source.color,
                            source.emoji ? "text-base" : "text-white",
                          )}
                          title={source.name}
                        >
                          {source.emoji || source.name.charAt(0)}
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}

              {/* Waterfall Section */}
              {adSourcesBreakdown.waterfall.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-foreground">
                      Waterfall
                    </p>
                    <Badge
                      variant="secondary"
                      className="bg-muted text-xs text-muted-foreground hover:bg-muted"
                    >
                      {adSourcesBreakdown.waterfall.length} sources
                    </Badge>
                  </div>
                  <div className="flex flex-col gap-1">
                    {adSourcesBreakdown.waterfall
                      .slice(0, 5)
                      .map(
                        (
                          source: {
                            adSourceId: string;
                            name: string;
                            color: string;
                            emoji?: string;
                            order?: number;
                          },
                          idx: number,
                        ) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="w-4 text-xs text-muted-foreground">
                              {(source.order ?? idx) + 1}
                            </span>
                            <div
                              className={cn(
                                "w-6 h-6 rounded-sm flex items-center justify-center text-xs",
                                source.color,
                                source.emoji
                                  ? "text-base"
                                  : "text-white font-bold",
                              )}
                              title={source.name}
                            >
                              {source.emoji || source.name.charAt(0)}
                            </div>
                            <span className="text-sm text-foreground">
                              {source.name}
                            </span>
                          </div>
                        ),
                      )}
                    {adSourcesBreakdown.waterfall.length > 5 && (
                      <p className="ml-8 text-xs text-muted-foreground">
                        +{adSourcesBreakdown.waterfall.length - 5} more sources
                      </p>
                    )}
                  </div>
                </div>
              )}

              {adSourcesBreakdown.bidding.length === 0 &&
                adSourcesBreakdown.waterfall.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No ad sources configured
                  </p>
                )}

              <Button variant="link" className="h-auto gap-1 p-0 text-primary">
                Edit Waterfall
                <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
