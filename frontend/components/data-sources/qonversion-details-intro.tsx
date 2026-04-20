"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

/** Giải thích pipeline Qonversion trên tab Details (API health + backfill đã map trong DataSourceHealthRegistry). */
export function QonversionDetailsIntro() {
  return (
    <Card className="border-fuchsia-200 bg-fuchsia-50/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-fuchsia-900">Qonversion — luồng dữ liệu</CardTitle>
        <p className="text-sm text-fuchsia-800/90 leading-relaxed">
          <span className="font-medium">Ingestion:</span> webhook (real-time), GCS export hàng ngày,{" "}
          <span className="font-medium">web crawler</span> dash.qonversion.io (cookie tổ chức trong Data Accounts + project key theo app), và
          reconciliation API — ghi <span className="font-mono text-xs">bronze.qonversion_events_raw</span> (`source_channel` phân biệt kênh).
        </p>
      </CardHeader>
      <CardContent className="pt-0 space-y-2 text-sm text-fuchsia-900/90">
        <p>
          <span className="font-medium">Transform:</span> Bronze → <span className="font-mono text-xs">silver.qonversion_events_clean</span> →{" "}
          <span className="font-mono text-xs">gold.app_iap_daily</span> (khóa <span className="font-mono text-xs">report_date</span> +{" "}
          <span className="font-mono text-xs">app_id</span> = AdMob). Cột IAP gộp vào{" "}
          <span className="font-mono text-xs">gold.fact_daily_app_metrics</span>;{" "}
          <span className="font-mono text-xs">gold.daily_overview</span> nhận IAP + engagement (Firebase) cùng AdMob app id.
        </p>
        <p className="text-xs text-fuchsia-800/80">
          Backfill: thử các nút <span className="font-medium">Qonversion full transform</span> hoặc từng bước load MinIO / Bronze→Silver / Silver→Gold trên
          JobsTest.
        </p>
      </CardContent>
    </Card>
  )
}
