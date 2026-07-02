"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const PERSONAS = [
  { id: "product-owner", label: "Product Owner" },
  { id: "data-analyst", label: "Data Analyst" },
  { id: "ua-marketing", label: "UA Marketing" },
  { id: "mediation", label: "Mediation" },
  { id: "devops", label: "DevOps" },
  { id: "qa", label: "QA" },
  { id: "bod", label: "BOD" },
];

export function PersonaSwitcherDropdown({ appId }: { appId?: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Persona switcher</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {PERSONAS.map((p) => (
          <DropdownMenuItem key={p.id} asChild>
            <Link href={`/ai-hub/${p.id}${appId ? `/${appId}` : ""}`}>
              {p.label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
