import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export type DimensionRow = { key: string; label: string; score: number; note?: string }

export function DimensionTable({ rows }: { rows: DimensionRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Dimension</TableHead>
          <TableHead>Score</TableHead>
          <TableHead>Note</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.key}>
            <TableCell>{r.label}</TableCell>
            <TableCell className="tabular-nums">{r.score.toFixed(1)}</TableCell>
            <TableCell className="text-muted-foreground text-sm">{r.note ?? "—"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
