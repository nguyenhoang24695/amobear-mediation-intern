"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppPerformanceTodayGrowthTab } from "./app-performance-today-growth-tab";
import { AppPerformanceHistoricalTab } from "./app-performance-historical-tab";

interface AppPerformanceTabProps {
  appId: string;
  publisherTimezoneOffsetHours?: number | null;
}

export function AppPerformanceTab({
  appId,
  publisherTimezoneOffsetHours,
}: AppPerformanceTabProps) {
  const [subTab, setSubTab] = useState<"today-growth" | "historical">(
    "today-growth",
  );

  return (
    <Tabs
      value={subTab}
      onValueChange={(v) => setSubTab(v as "today-growth" | "historical")}
      className="w-full"
    >
      <TabsList className="h-10 w-fit bg-muted p-1">
        <TabsTrigger
          value="today-growth"
          className="px-4 data-[state=active]:bg-background data-[state=active]:text-foreground"
        >
          Today Growth
        </TabsTrigger>

        <TabsTrigger
          value="historical"
          className="px-4 data-[state=active]:bg-background data-[state=active]:text-foreground"
        >
          Historical Data
        </TabsTrigger>
      </TabsList>
      

      <TabsContent value="today-growth" className="mt-6">
        <AppPerformanceTodayGrowthTab appId={appId} />
      </TabsContent>

      <TabsContent value="historical" className="mt-6">
        <AppPerformanceHistoricalTab
          appId={appId}
          publisherTimezoneOffsetHours={publisherTimezoneOffsetHours}
        />
      </TabsContent>
    </Tabs>
  );
}
