"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { getCategoryProfiles, type AiCategoryProfile } from "@/lib/api/agent-specialized"
import { useToast } from "@/hooks/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function AgentAdminCategoriesPage() {
  const { toast } = useToast()
  const [rows, setRows] = useState<AiCategoryProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        const data = await getCategoryProfiles()
        setRows(data)
      } catch (e: unknown) {
        toast({
          title: "Failed to load categories",
          description: e instanceof Error ? e.message : "Unknown error",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    })()
  }, [toast])

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Category profiles</h1>
          <p className="text-muted-foreground text-sm">ai_category_profiles — YAML/JSON packs for cascade merge</p>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Display</TableHead>
                <TableHead>Sort</TableHead>
                <TableHead>Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.categoryId}>
                  <TableCell className="font-mono text-xs">{r.categoryId}</TableCell>
                  <TableCell>{r.displayName}</TableCell>
                  <TableCell>{r.sortOrder}</TableCell>
                  <TableCell>{r.isActive ? "yes" : "no"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </DashboardLayout>
  )
}
