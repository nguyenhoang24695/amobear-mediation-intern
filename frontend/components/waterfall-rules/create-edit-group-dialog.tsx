"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import type { RuleGroup } from "./waterfall-rule-types";

const PRESET_COLORS = [
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#84cc16", // lime
  "#f97316", // orange
  "#6366f1", // indigo
];

interface CreateEditGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: RuleGroup | null;
  onSave: (data: {
    name: string;
    description: string | null;
    displayOrder: number;
    isActive: boolean;
    color: string | null;
  }) => Promise<void>;
  saving?: boolean;
  nextDisplayOrder?: number;
}

export function CreateEditGroupDialog({
  open,
  onOpenChange,
  group,
  onSave,
  saving = false,
  nextDisplayOrder = 0,
}: CreateEditGroupDialogProps) {
  const isEditing = !!group;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [displayOrder, setDisplayOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const [color, setColor] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      if (group) {
        setName(group.name);
        setDescription(group.description || "");
        setDisplayOrder(String(group.displayOrder));
        setIsActive(group.isActive);
        setColor(group.color);
      } else {
        setName("");
        setDescription("");
        setDisplayOrder(String(nextDisplayOrder));
        setIsActive(true);
        setColor(PRESET_COLORS[0]);
      }
      setErrors({});
    }
  }, [open, group, nextDisplayOrder]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "Group name is required";
    }

    const order = parseInt(displayOrder, 10);
    if (isNaN(order) || order < 0) {
      newErrors.displayOrder = "Display order must be a non-negative number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    await onSave({
      name: name.trim(),
      description: description.trim() || null,
      displayOrder: parseInt(displayOrder, 10),
      isActive,
      color,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] max-h-[92vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Group" : "Create Group"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the group details"
              : "Create a new group to organize your rules"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="group-name">
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="group-name"
              placeholder="e.g., High Priority Rules"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && (
              <p className="text-xs text-red-500">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="group-description">Description</Label>
            <Textarea
              id="group-description"
              placeholder="Optional description for this group"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="group-order">Display Order</Label>
            <Input
              id="group-order"
              type="number"
              min="0"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(e.target.value)}
              className={errors.displayOrder ? "border-red-500" : ""}
            />
            {errors.displayOrder && (
              <p className="text-xs text-red-500">{errors.displayOrder}</p>
            )}
            <p className="text-xs text-slate-500">
              Groups are displayed in ascending order (lower numbers first)
            </p>
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setColor(null)}
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                  color === null ? "border-slate-900" : "border-slate-300"
                } bg-white hover:border-slate-400 transition-colors`}
              >
                <span className="text-xs text-slate-400">-</span>
              </button>
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 ${
                    color === c
                      ? "border-slate-900 ring-2 ring-offset-1 ring-slate-400"
                      : "border-transparent"
                  } hover:scale-110 transition-transform`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="group-active">Active</Label>
              <p className="text-xs text-slate-500">
                Inactive groups and their rules won&apos;t be processed
              </p>
            </div>
            <Switch
              id="group-active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            className="w-full sm:w-auto"
            onClick={handleSave}
            disabled={saving}
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEditing ? "Save Changes" : "Create Group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
