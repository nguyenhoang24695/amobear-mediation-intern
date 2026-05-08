"use client"

import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { VCardGeneratorPageContent } from "@/components/settings-vcard/vcard-generator-page-content"

export default function VCardGeneratorPage() {
  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl">
        <VCardGeneratorPageContent />
      </div>
    </DashboardLayout>
  )
}

