export function AppendixDataSources({ sources }: { sources: { name: string; layer: string }[] }) {
  return (
    <div className="space-y-1 text-sm">
      <h4 className="font-semibold">Data sources</h4>
      <ul className="text-muted-foreground list-disc pl-5">
        {sources.map((s) => (
          <li key={s.name}>
            <span className="text-foreground">{s.name}</span> — {s.layer}
          </li>
        ))}
      </ul>
    </div>
  )
}
