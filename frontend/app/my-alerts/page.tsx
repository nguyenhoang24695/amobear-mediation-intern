import { redirect } from "next/navigation"

export default function MyAlertsPage() {
  redirect("/alert-center?tab=my-alerts")
}
