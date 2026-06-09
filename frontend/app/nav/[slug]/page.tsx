import { notFound } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { MobileNavHubContent } from "@/components/dashboard/mobile-nav-hub-content"
import { getMobileNavHub } from "@/lib/navigation/mobile-nav-hubs"

interface MobileNavHubPageProps {
  params: Promise<{ slug: string }>
}

export default async function MobileNavHubPage({ params }: MobileNavHubPageProps) {
  const { slug } = await params

  if (!getMobileNavHub(slug)) {
    notFound()
  }

  return (
    <DashboardLayout>
      <MobileNavHubContent slug={slug} />
    </DashboardLayout>
  )
}
