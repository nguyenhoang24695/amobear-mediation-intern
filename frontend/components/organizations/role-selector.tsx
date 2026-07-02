import React, { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { permissionApi, type PermissionRoleDto } from "@/lib/api/services";
import { cn } from "@/lib/utils";
export interface RoleSelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
  canManage?: boolean;
  availableRoles?: string[];
  disabled?: boolean;
}

export function RoleSelector({
  value,
  onChange,
  canManage = false,
  availableRoles,
  disabled = false,
}: RoleSelectorProps) {
  const [roles, setRoles] = useState<PermissionRoleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchRoles = async () => {
      setLoading(true);
      try {
        const fetchedRoles = await permissionApi.getRoles();
        if (isMounted) {
          setRoles(fetchedRoles);
          setError(false);
        }
      } catch (err) {
        console.error("Failed to fetch roles", err);
        if (isMounted) {
          setError(true);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    fetchRoles();
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-3 text-sm text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin" /> Fetching roles...
      </div>
    );
  }

  if (error || roles.length === 0) {
    return (
      <div className="p-3 text-sm text-red-500">Failed to load roles.</div>
    );
  }

  let filteredRoles = roles;

  if (availableRoles && availableRoles.length > 0) {
    filteredRoles = roles.filter((r) => availableRoles.includes(r.roleKey));
  } else if (!canManage) {
    filteredRoles = roles.filter(
      (r) => r.roleKey !== "super_admin" && r.roleKey !== "admin",
    );
  }

  const toggleRole = (roleKey: string, checked: boolean) => {
    if (disabled) return;

    if (checked) {
      if (!value.includes(roleKey)) {
        onChange([...value, roleKey]);
      }
      return;
    }

    const next = value.filter((role) => role !== roleKey);
    onChange(next.length > 0 ? next : value);
  };

  return (
    <div className="max-h-64 space-y-2 overflow-y-auto pr-2">
      {filteredRoles.map((role) => {
        const checked = value.includes(role.roleKey);

        return (
          <label
            key={role.roleKey}
            className={cn(
              "flex items-start gap-3 rounded-lg border border-border p-3 transition-colors",
              "hover:bg-muted/50",
              "has-[input:checked]:border-primary/50 has-[input:checked]:bg-primary/5",
              disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
            )}
          >
            <Checkbox
              checked={checked}
              disabled={disabled}
              onCheckedChange={(nextChecked) =>
                toggleRole(role.roleKey, nextChecked === true)
              }
              className="mt-0.5"
            />

            <div>
              <p className="text-sm font-medium text-foreground">{role.name}</p>
              <p className="text-xs text-muted-foreground">
                {role.description || "No description available"}
              </p>
            </div>
          </label>
        );
      })}
    </div>
  );
}
