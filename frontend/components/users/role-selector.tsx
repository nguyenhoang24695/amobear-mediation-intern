"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface RoleSelectorProps {
  value: "admin" | "editor" | "viewer";
  onValueChange: (value: "admin" | "editor" | "viewer") => void;
  label?: string;
  idPrefix?: string;
  adminDescription?: string;
  editorDescription?: string;
  viewerDescription?: string;
}

export function RoleSelector({
  value,
  onValueChange,
  label = "Role",
  idPrefix = "role",
  adminDescription = "Full access to all features including user management",
  editorDescription = "Can view and edit apps, mediation groups, and reports",
  viewerDescription = "Read-only access to assigned apps and reports",
}: RoleSelectorProps) {
  const roles: Array<{
    value: "admin" | "editor" | "viewer";
    label: string;
    description: string;
  }> = [
    { value: "admin", label: "Admin", description: adminDescription },
    { value: "editor", label: "Editor", description: editorDescription },
    { value: "viewer", label: "Viewer", description: viewerDescription },
  ];

  return (
    <div className="space-y-3">
      {label ? (
        <Label className="text-muted-foreground text-xs uppercase tracking-wide">
          {label}
        </Label>
      ) : null}
      <Select
        value={value}
        onValueChange={(v) => onValueChange(v as "admin" | "editor" | "viewer")}
      >
        <SelectTrigger
          id={idPrefix ? `${idPrefix}-select` : undefined}
          className="w-full [&_.role-item-desc]:hidden"
        >
          <SelectValue placeholder="Select role" />
        </SelectTrigger>
        <SelectContent
          className="w-[min(320px,calc(100vw-2rem))] max-w-[calc(100vw-2rem)]"
          align="start"
        >
          {roles.map((r) => (
            <SelectItem key={r.value} value={r.value} className="py-3">
              <span className="flex flex-col items-start gap-0.5 text-left">
                <span className="font-medium">{r.label}</span>
                <span
                  className={cn(
                    "role-item-desc text-xs font-normal text-muted-foreground",
                  )}
                >
                  {r.description}
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
