export type ActionItem = { id: string; title: string; owner?: string; due?: string }

export function ActionPlan({ items }: { items: ActionItem[] }) {
  return (
    <ol className="list-decimal space-y-2 pl-5 text-sm">
      {items.map((a) => (
        <li key={a.id}>
          <span className="font-medium">{a.title}</span>
          {(a.owner || a.due) && (
            <span className="text-muted-foreground">
              {" "}
              ({[a.owner, a.due].filter(Boolean).join(" · ")})
            </span>
          )}
        </li>
      ))}
    </ol>
  )
}
