import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  eyebrow: string;
  title: string;
  description?: string;
  ready?: boolean;
  children: ReactNode;
  aside?: ReactNode;
}

export function SectionShell({
  eyebrow,
  title,
  description,
  ready,
  children,
  aside,
}: Props) {
  return (
    <section className="rounded-lg border bg-card p-3 text-card-foreground shadow-sm sm:p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {eyebrow}
          </p>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <Badge
          className={cn(
            "gap-1",
            ready
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "bg-muted text-muted-foreground",
          )}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          {ready ? "Ready" : "Needs input"}
        </Badge>
      </div>
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div>{children}</div>
        {aside ? <div>{aside}</div> : null}
      </div>
    </section>
  );
}

export function FieldHint({ children }: { children: ReactNode }) {
  return <p className="mt-1 text-xs text-muted-foreground">{children}</p>;
}
