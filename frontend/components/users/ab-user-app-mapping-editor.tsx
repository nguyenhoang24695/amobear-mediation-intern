"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, Loader2, Smartphone, X } from "lucide-react";
import { useApi, invalidateCache } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { teamMembersApi, structureApi } from "@/lib/api/services";
function formatMappingDate(value?: string | null) {
  if (value == null || value === "") return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** yyyy-mm-dd cho <input type="date" /> (theo lịch local của giá trị ISO từ API). */
function toDateInputValue(iso?: string | null): string {
  if (iso == null || iso === "") return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Đầu ngày 00:00:00.000 (local) → ISO UTC gửi API. */
function fromDateInputToStartDayIso(yyyyMmDd: string): string | null {
  const t = yyyyMmDd.trim();
  if (!t) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const day = Number(m[3]);
  const d = new Date(y, mo - 1, day, 0, 0, 0, 0);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

/** Cuối ngày 23:59:59.999 (local) → ISO UTC gửi API (khoảng phủ cả ngày đã chọn). */
function fromDateInputToEndDayIso(yyyyMmDd: string): string | null {
  const t = yyyyMmDd.trim();
  if (!t) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const day = Number(m[3]);
  const d = new Date(y, mo - 1, day, 23, 59, 59, 999);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export interface AbUserAppMappingEditorProps {
  userId: string;
  /** Admin / super_admin hoặc quyền manage user tương đương */
  canBulkEdit: boolean;
  /** Khóa cache useApi cho GET mapping (khớp modal vs user detail) */
  mappingCacheKey: string;
  /** Khi false, không gọi API (ví dụ modal đóng). Mặc định true. */
  fetchEnabled?: boolean;
}

export function AbUserAppMappingEditor({
  userId,
  canBulkEdit,
  mappingCacheKey,
  fetchEnabled = true,
}: AbUserAppMappingEditorProps) {
  const { toast } = useToast();
  const load = fetchEnabled && !!userId;
  const {
    data: mappingResp,
    loading: mappingLoading,
    refetch,
  } = useApi(() => teamMembersApi.getAbUserAppMapping(userId), {
    enabled: load,
    cacheKey: mappingCacheKey,
  });
  const { data: appsResp } = useApi(() => structureApi.getApps(), {
    enabled: load,
    cacheKey: `${mappingCacheKey}-apps`,
  });

  const rows = mappingResp?.data ?? [];
  const allApps = appsResp?.apps;

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const PAGE_SIZE = 5;
  const [page, setPage] = useState(1);
  const [patchStart, setPatchStart] = useState(false);
  const [patchEnd, setPatchEnd] = useState(false);
  const [clearEnd, setClearEnd] = useState(false);
  const [startLocal, setStartLocal] = useState("");
  const [endLocal, setEndLocal] = useState("");

  /** Sửa start date trực tiếp trên bảng (theo mapping id). */
  const [inlineStartEditId, setInlineStartEditId] = useState<number | null>(
    null,
  );
  const [inlineStartValue, setInlineStartValue] = useState("");
  const [inlineStartBaseline, setInlineStartBaseline] = useState("");
  const [inlineStartSaving, setInlineStartSaving] = useState(false);

  const [inlineEndEditId, setInlineEndEditId] = useState<number | null>(null);
  const [inlineEndValue, setInlineEndValue] = useState("");
  const [inlineEndBaseline, setInlineEndBaseline] = useState("");
  const [inlineEndSaving, setInlineEndSaving] = useState(false);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const visibleRows = useMemo(
    () => rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [rows, page],
  );

  const cancelInlineStartEdit = useCallback(() => {
    setInlineStartEditId(null);
    setInlineStartValue("");
    setInlineStartBaseline("");
  }, []);

  const cancelInlineEndEdit = useCallback(() => {
    setInlineEndEditId(null);
    setInlineEndValue("");
    setInlineEndBaseline("");
  }, []);

  useEffect(() => {
    setSelectedIds(new Set());
    cancelInlineStartEdit();
    cancelInlineEndEdit();
    setPage(1);
  }, [userId, cancelInlineStartEdit, cancelInlineEndEdit]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    if (inlineStartEditId == null && inlineEndEditId == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        cancelInlineStartEdit();
        cancelInlineEndEdit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    inlineStartEditId,
    inlineEndEditId,
    cancelInlineStartEdit,
    cancelInlineEndEdit,
  ]);

  const beginInlineStartEdit = useCallback(
    (rowId: number, startIso?: string | null) => {
      cancelInlineEndEdit();
      const v = toDateInputValue(startIso);
      setInlineStartEditId(rowId);
      setInlineStartValue(v);
      setInlineStartBaseline(v);
    },
    [cancelInlineEndEdit],
  );

  const beginInlineEndEdit = useCallback(
    (rowId: number, endIso?: string | null) => {
      cancelInlineStartEdit();
      const v = toDateInputValue(endIso);
      setInlineEndEditId(rowId);
      setInlineEndValue(v);
      setInlineEndBaseline(v);
    },
    [cancelInlineStartEdit],
  );

  const saveInlineStartEdit = useCallback(async () => {
    if (inlineStartEditId == null) return;
    const trimmed = inlineStartValue.trim();
    const iso =
      trimmed === "" ? null : fromDateInputToStartDayIso(inlineStartValue);
    if (trimmed !== "" && iso == null) {
      toast({ title: "Ngày bắt đầu không hợp lệ", variant: "destructive" });
      return;
    }
    const rowForStart = rows.find((r) => (r.id ?? 0) === inlineStartEditId);
    if (iso && rowForStart?.endDate) {
      if (new Date(iso).getTime() > new Date(rowForStart.endDate).getTime()) {
        toast({
          title: "Khoảng thời gian không hợp lệ",
          description: "Start phải ≤ End hiện tại.",
          variant: "destructive",
        });
        return;
      }
    }
    setInlineStartSaving(true);
    try {
      const res = await teamMembersApi.bulkUpdateAbUserAppMappingDates(userId, {
        mappingIds: [inlineStartEditId],
        patchStartDate: true,
        startDate: iso,
        patchEndDate: false,
        endDate: null,
      });
      if (!res.success) {
        toast({
          title: "Lưu thất bại",
          description: (res as { message?: string }).message ?? "Unknown error",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Đã cập nhật Start date" });
      invalidateCache(mappingCacheKey);
      invalidateCache(`ab-user-app-mapping-${userId}`);
      invalidateCache(`ab-user-app-mapping-modal-${userId}`);
      await refetch();
      cancelInlineStartEdit();
    } catch (e) {
      toast({
        title: "Lỗi mạng",
        description: e instanceof Error ? e.message : "Request failed",
        variant: "destructive",
      });
    } finally {
      setInlineStartSaving(false);
    }
  }, [
    inlineStartEditId,
    inlineStartValue,
    userId,
    mappingCacheKey,
    refetch,
    cancelInlineStartEdit,
    toast,
    rows,
  ]);

  const saveInlineEndEdit = useCallback(async () => {
    if (inlineEndEditId == null) return;
    const trimmed = inlineEndValue.trim();
    const endIso =
      trimmed === "" ? null : fromDateInputToEndDayIso(inlineEndValue);
    if (trimmed !== "" && endIso == null) {
      toast({ title: "Ngày kết thúc không hợp lệ", variant: "destructive" });
      return;
    }
    const rowForEnd = rows.find((r) => (r.id ?? 0) === inlineEndEditId);
    if (endIso && rowForEnd?.startDate) {
      if (
        new Date(rowForEnd.startDate).getTime() > new Date(endIso).getTime()
      ) {
        toast({
          title: "Khoảng thời gian không hợp lệ",
          description: "Start phải ≤ End.",
          variant: "destructive",
        });
        return;
      }
    }
    setInlineEndSaving(true);
    try {
      const res = await teamMembersApi.bulkUpdateAbUserAppMappingDates(userId, {
        mappingIds: [inlineEndEditId],
        patchStartDate: false,
        startDate: null,
        patchEndDate: true,
        endDate: endIso,
      });
      if (!res.success) {
        toast({
          title: "Lưu thất bại",
          description: (res as { message?: string }).message ?? "Unknown error",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Đã cập nhật End date" });
      invalidateCache(mappingCacheKey);
      invalidateCache(`ab-user-app-mapping-${userId}`);
      invalidateCache(`ab-user-app-mapping-modal-${userId}`);
      await refetch();
      cancelInlineEndEdit();
    } catch (e) {
      toast({
        title: "Lỗi mạng",
        description: e instanceof Error ? e.message : "Request failed",
        variant: "destructive",
      });
    } finally {
      setInlineEndSaving(false);
    }
  }, [
    inlineEndEditId,
    inlineEndValue,
    userId,
    mappingCacheKey,
    refetch,
    cancelInlineEndEdit,
    toast,
    rows,
  ]);

  const selectableRows = useMemo(
    () => rows.filter((r) => (r.id ?? 0) > 0),
    [rows],
  );
  const allSelectableSelected =
    selectableRows.length > 0 &&
    selectableRows.every((r) => selectedIds.has(r.id as number));
  const headerChecked: boolean | "indeterminate" =
    selectableRows.length === 0
      ? false
      : allSelectableSelected
        ? true
        : selectableRows.some((r) => selectedIds.has(r.id as number))
          ? "indeterminate"
          : false;

  const someSelected = selectedIds.size > 0;

  const toggleRow = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (selectableRows.length === 0) return new Set();
      if (selectableRows.every((r) => prev.has(r.id as number)))
        return new Set();
      return new Set(selectableRows.map((r) => r.id as number));
    });
  }, [selectableRows]);

  const openBulkDialog = () => {
    if (!someSelected) return;
    cancelInlineStartEdit();
    cancelInlineEndEdit();
    const first = rows.find((r) => selectedIds.has(r.id as number));
    setStartLocal(toDateInputValue(first?.startDate));
    setEndLocal(toDateInputValue(first?.endDate));
    setPatchStart(false);
    setPatchEnd(false);
    setClearEnd(false);
    setBulkOpen(true);
  };

  const onBulkSave = async () => {
    if (!patchStart && !patchEnd) {
      toast({
        title: "Chọn trường cần cập nhật",
        description: "Bật ít nhất Start date hoặc End date.",
        variant: "destructive",
      });
      return;
    }
    if (patchStart && startLocal.trim()) {
      const probe = fromDateInputToStartDayIso(startLocal);
      if (probe == null) {
        toast({ title: "Start date không hợp lệ", variant: "destructive" });
        return;
      }
    }
    if (patchEnd && !clearEnd && !endLocal.trim()) {
      toast({
        title: "Thiếu End date",
        description: "Nhập ngày kết thúc, hoặc chọn “Clear end date”.",
        variant: "destructive",
      });
      return;
    }

    const startIso = patchStart
      ? startLocal.trim()
        ? fromDateInputToStartDayIso(startLocal)
        : null
      : undefined;

    let endIso: string | null | undefined = undefined;
    if (patchEnd) {
      endIso = clearEnd ? null : fromDateInputToEndDayIso(endLocal);
      if (!clearEnd && endIso == null) {
        toast({ title: "End date không hợp lệ", variant: "destructive" });
        return;
      }
    }

    if (patchStart && patchEnd && !clearEnd && startIso != null && endIso) {
      if (new Date(startIso).getTime() > new Date(endIso).getTime()) {
        toast({
          title: "Khoảng thời gian không hợp lệ",
          description: "Start phải ≤ End.",
          variant: "destructive",
        });
        return;
      }
    }

    const mappingIds = [...selectedIds];
    setBulkSaving(true);
    try {
      const res = await teamMembersApi.bulkUpdateAbUserAppMappingDates(userId, {
        mappingIds,
        patchStartDate: patchStart,
        startDate: patchStart ? (startIso ?? null) : null,
        patchEndDate: patchEnd,
        endDate: patchEnd ? (endIso ?? null) : null,
      });
      if (!res.success) {
        toast({
          title: "Cập nhật thất bại",
          description: (res as { message?: string }).message ?? "Unknown error",
          variant: "destructive",
        });
        return;
      }
      const updated = res.updated ?? 0;
      const requested = res.requested ?? mappingIds.length;
      toast({
        title: "Đã cập nhật StarRocks",
        description:
          updated === requested
            ? `${updated} dòng (Start/End theo lựa chọn).`
            : `${updated}/${requested} dòng được cập nhật (một số id không khớp user/email).`,
      });
      invalidateCache(mappingCacheKey);
      invalidateCache(`ab-user-app-mapping-${userId}`);
      invalidateCache(`ab-user-app-mapping-modal-${userId}`);
      await refetch();
      setBulkOpen(false);
      setSelectedIds(new Set());
    } catch (e) {
      toast({
        title: "Lỗi mạng",
        description: e instanceof Error ? e.message : "Request failed",
        variant: "destructive",
      });
    } finally {
      setBulkSaving(false);
    }
  };

  const inlineEditBusy = inlineStartSaving || inlineEndSaving;

  const colCount = canBulkEdit ? 4 : 3;

  return (
    <>
      {canBulkEdit && !mappingLoading && rows.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pb-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={!someSelected}
            onClick={openBulkDialog}
          >
            Edit dates ({selectedIds.size})
          </Button>
          {someSelected ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear selection
            </Button>
          ) : null}
        </div>
      )}

      {mappingLoading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground text-sm">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading…
        </div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {visibleRows.map((row) => {
              const matchedApp = allApps?.find((a) => a.appId === row.appId);
              const appLabel =
                matchedApp?.displayName || matchedApp?.name || "Unknown app";
              const storeId = matchedApp?.appStoreId?.trim();
              const rid = row.id ?? 0;
              const selectable = canBulkEdit && rid > 0;
              const editingStart =
                canBulkEdit && rid > 0 && inlineStartEditId === rid;
              const editingEnd =
                canBulkEdit && rid > 0 && inlineEndEditId === rid;

              return (
                <div
                  key={
                    rid > 0
                      ? `id-${rid}`
                      : `${row.appId}-${row.startDate ?? ""}-${row.endDate ?? ""}`
                  }
                  className="rounded-xl border border-border bg-card p-4 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    {canBulkEdit ? (
                      <div className="pt-1">
                        {selectable ? (
                          <Checkbox
                            checked={selectedIds.has(rid)}
                            onCheckedChange={() => toggleRow(rid)}
                            aria-label={`Select ${appLabel}`}
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </div>
                    ) : null}

                    <div className="flex min-w-0 flex-1 gap-3">
                      <Avatar className="h-10 w-10 shrink-0 rounded-lg">
                        {matchedApp?.iconUri ? (
                          <AvatarImage
                            src={matchedApp.iconUri}
                            alt={appLabel}
                          />
                        ) : null}
                        <AvatarFallback className="rounded-lg bg-muted">
                          <Smartphone className="w-4 h-4 text-muted-foreground" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-medium leading-snug text-foreground">
                          {appLabel}
                        </p>
                        <p className="break-all font-mono text-xs text-muted-foreground">
                          appId: {row.appId}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <div className="space-y-1.5">
                      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Start date
                      </div>
                      {editingStart ? (
                        <div className="space-y-2">
                          <input
                            type="date"
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            value={inlineStartValue}
                            onChange={(e) =>
                              setInlineStartValue(e.target.value)
                            }
                            disabled={inlineEditBusy}
                            autoFocus
                          />
                          <div className="flex gap-2">
                            {inlineStartValue !== inlineStartBaseline ? (
                              <Button
                                type="button"
                                variant="ghost"
                                className="h-9 flex-1 justify-center text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-500/15"
                                disabled={inlineEditBusy}
                                onClick={() => void saveInlineStartEdit()}
                              >
                                {inlineStartSaving ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                                <span className="ml-2">Save</span>
                              </Button>
                            ) : null}
                            <Button
                              type="button"
                              variant="ghost"
                              className="h-9 flex-1 justify-center text-muted-foreground hover:bg-accent hover:text-foreground"
                              disabled={inlineEditBusy}
                              onClick={cancelInlineStartEdit}
                            >
                              <X className="h-4 w-4" />
                              <span className="ml-2">Cancel</span>
                            </Button>
                          </div>
                        </div>
                      ) : canBulkEdit && rid > 0 ? (
                        <button
                          type="button"
                          className="w-full rounded-md border border-border bg-background px-3 py-2 text-left text-sm text-foreground/90 hover:bg-accent hover:text-foreground disabled:opacity-50 disabled:pointer-events-none"
                          disabled={inlineEditBusy}
                          onClick={() =>
                            beginInlineStartEdit(rid, row.startDate)
                          }
                        >
                          {formatMappingDate(row.startDate)}
                        </button>
                      ) : (
                        <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground/90">
                          {formatMappingDate(row.startDate)}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        End date
                      </div>
                      {editingEnd ? (
                        <div className="space-y-2">
                          <input
                            type="date"
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            value={inlineEndValue}
                            onChange={(e) => setInlineEndValue(e.target.value)}
                            disabled={inlineEditBusy}
                            autoFocus
                          />
                          <div className="flex gap-2">
                            {inlineEndValue !== inlineEndBaseline ? (
                              <Button
                                type="button"
                                variant="ghost"
                                className="h-9 flex-1 justify-center text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-500/15"
                                disabled={inlineEditBusy}
                                onClick={() => void saveInlineEndEdit()}
                              >
                                {inlineEndSaving ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                                <span className="ml-2">Save</span>
                              </Button>
                            ) : null}
                            <Button
                              type="button"
                              variant="ghost"
                              className="h-9 flex-1 justify-center text-muted-foreground hover:bg-accent hover:text-foreground"
                              disabled={inlineEditBusy}
                              onClick={cancelInlineEndEdit}
                            >
                              <X className="h-4 w-4" />
                              <span className="ml-2">Cancel</span>
                            </Button>
                          </div>
                        </div>
                      ) : canBulkEdit && rid > 0 ? (
                        <button
                          type="button"
                          className="w-full rounded-md border border-border bg-background px-3 py-2 text-left text-sm text-foreground/90 hover:bg-accent hover:text-foreground disabled:opacity-50 disabled:pointer-events-none"
                          disabled={inlineEditBusy}
                          onClick={() => beginInlineEndEdit(rid, row.endDate)}
                        >
                          {formatMappingDate(row.endDate)}
                        </button>
                      ) : (
                        <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground/90">
                          {formatMappingDate(row.endDate)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {rows.length === 0 && (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No rows in StarRocks for this user, or StarRocks is not
                configured.
              </div>
            )}
          </div>

          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60">
                  {canBulkEdit ? (
                    <TableHead className="w-[44px] align-middle">
                      <Checkbox
                        checked={headerChecked}
                        onCheckedChange={() => toggleSelectAll()}
                        disabled={selectableRows.length === 0}
                        aria-label="Select all rows"
                      />
                    </TableHead>
                  ) : null}
                  <TableHead className="min-w-[280px] w-[45%]">App</TableHead>
                  <TableHead>Start date</TableHead>
                  <TableHead>End date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRows.map((row) => {
                  const matchedApp = allApps?.find(
                    (a) => a.appId === row.appId,
                  );
                  const appLabel =
                    matchedApp?.displayName ||
                    matchedApp?.name ||
                    "Unknown app";
                  const storeId = matchedApp?.appStoreId?.trim();
                  const rid = row.id ?? 0;
                  const selectable = canBulkEdit && rid > 0;
                  return (
                    <TableRow
                      key={
                        rid > 0
                          ? `id-${rid}`
                          : `${row.appId}-${row.startDate ?? ""}-${row.endDate ?? ""}`
                      }
                    >
                      {canBulkEdit ? (
                        <TableCell className="align-top pt-3">
                          {selectable ? (
                            <Checkbox
                              checked={selectedIds.has(rid)}
                              onCheckedChange={() => toggleRow(rid)}
                              aria-label={`Select ${appLabel}`}
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </TableCell>
                      ) : null}
                      <TableCell>
                        <div className="flex items-start gap-3 min-w-0">
                          <Avatar className="h-9 w-9 rounded-lg shrink-0">
                            {matchedApp?.iconUri ? (
                              <AvatarImage
                                src={matchedApp.iconUri}
                                alt={appLabel}
                              />
                            ) : null}
                            <AvatarFallback className="rounded-lg bg-muted">
                              <Smartphone className="w-4 h-4 text-muted-foreground" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 space-y-0.5">
                            <p className="text-sm font-medium text-foreground leading-snug">
                              {appLabel}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono break-all">
                              appId: {row.appId}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono break-all">
                              app_store_id:{" "}
                              {storeId && storeId.length > 0 ? storeId : "—"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-foreground/90 align-top min-w-[220px]">
                        {canBulkEdit && rid > 0 && inlineStartEditId === rid ? (
                          <div className="flex flex-wrap items-center gap-1">
                            <input
                              type="date"
                              className="border rounded-md px-2 py-1 text-sm bg-background w-[11.5rem] max-w-full"
                              value={inlineStartValue}
                              onChange={(e) =>
                                setInlineStartValue(e.target.value)
                              }
                              disabled={inlineEditBusy}
                              autoFocus
                            />
                            {inlineStartValue !== inlineStartBaseline ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/15"
                                disabled={inlineEditBusy}
                                title="Lưu"
                                aria-label="Lưu"
                                onClick={() => void saveInlineStartEdit()}
                              >
                                {inlineStartSaving ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                              </Button>
                            ) : null}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-accent hover:text-foreground"
                              disabled={inlineEditBusy}
                              title="Hủy"
                              aria-label="Hủy"
                              onClick={cancelInlineStartEdit}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : canBulkEdit && rid > 0 ? (
                          <button
                            type="button"
                            className="rounded px-1.5 py-0.5 -mx-1.5 text-left w-full max-w-full hover:bg-accent hover:text-foreground text-foreground/80 disabled:opacity-50 disabled:pointer-events-none"
                            disabled={inlineEditBusy}
                            onClick={() =>
                              beginInlineStartEdit(rid, row.startDate)
                            }
                          >
                            {formatMappingDate(row.startDate)}
                          </button>
                        ) : (
                          <span>{formatMappingDate(row.startDate)}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-foreground/90 align-top min-w-[220px]">
                        {canBulkEdit && rid > 0 && inlineEndEditId === rid ? (
                          <div className="flex flex-wrap items-center gap-1">
                            <input
                              type="date"
                              className="border rounded-md px-2 py-1 text-sm bg-background w-[11.5rem] max-w-full"
                              value={inlineEndValue}
                              onChange={(e) =>
                                setInlineEndValue(e.target.value)
                              }
                              disabled={inlineEditBusy}
                              autoFocus
                            />
                            {inlineEndValue !== inlineEndBaseline ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/15"
                                disabled={inlineEditBusy}
                                title="Lưu"
                                aria-label="Lưu"
                                onClick={() => void saveInlineEndEdit()}
                              >
                                {inlineEndSaving ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                              </Button>
                            ) : null}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-accent hover:text-foreground"
                              disabled={inlineEditBusy}
                              title="Hủy"
                              aria-label="Hủy"
                              onClick={cancelInlineEndEdit}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : canBulkEdit && rid > 0 ? (
                          <button
                            type="button"
                            className="rounded px-1.5 py-0.5 -mx-1.5 text-left w-full max-w-full hover:bg-accent hover:text-foreground text-foreground/80 disabled:opacity-50 disabled:pointer-events-none"
                            disabled={inlineEditBusy}
                            onClick={() => beginInlineEndEdit(rid, row.endDate)}
                          >
                            {formatMappingDate(row.endDate)}
                          </button>
                        ) : (
                          <span>{formatMappingDate(row.endDate)}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={colCount}
                      className="text-center text-muted-foreground py-10 text-sm"
                    >
                      No rows in StarRocks for this user, or StarRocks is not
                      configured.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {rows.length > PAGE_SIZE && (
            <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Showing {Math.min((page - 1) * PAGE_SIZE + 1, rows.length)}-
                {Math.min(page * PAGE_SIZE, rows.length)} of {rows.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {page} / {totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk edit Start / End date</DialogTitle>
            <DialogDescription>
              Áp dụng cho {selectedIds.size} dòng đã chọn (theo{" "}
              <span className="font-mono">id</span> trên StarRocks). Chỉ chọn
              ngày: Start lưu 00:00, End lưu cuối ngày (theo giờ trình duyệt).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-3 space-y-0">
              <Checkbox
                id="patch-start"
                checked={patchStart}
                onCheckedChange={(v) => setPatchStart(v === true)}
              />
              <div className="grid gap-2 flex-1">
                <Label
                  htmlFor="start-date"
                  className="cursor-pointer select-none"
                  onClick={(e) => {
                    if (!patchStart) {
                      e.preventDefault();
                      setPatchStart(true);
                      window.setTimeout(() => {
                        const el = document.getElementById(
                          "start-date",
                        ) as HTMLInputElement | null;
                        el?.focus();
                        try {
                          el?.showPicker?.();
                        } catch {
                          /* một số trình duyệt chặn showPicker nếu không có gesture */
                        }
                      }, 0);
                    }
                  }}
                >
                  Cập nhật Start date
                </Label>
                <input
                  id="start-date"
                  type="date"
                  className="border border-input rounded-md px-3 py-2 text-sm w-full max-w-full bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  value={startLocal}
                  onChange={(e) => setStartLocal(e.target.value)}
                  disabled={!patchStart}
                />
              </div>
            </div>
            <div className="flex items-start gap-3 space-y-0">
              <Checkbox
                id="patch-end"
                checked={patchEnd}
                onCheckedChange={(v) => setPatchEnd(v === true)}
              />
              <div className="grid gap-2 flex-1">
                <Label
                  htmlFor="end-date"
                  className="cursor-pointer select-none"
                  onClick={(e) => {
                    if (!patchEnd || clearEnd) {
                      e.preventDefault();
                      setPatchEnd(true);
                      setClearEnd(false);
                      window.setTimeout(() => {
                        const el = document.getElementById(
                          "end-date",
                        ) as HTMLInputElement | null;
                        el?.focus();
                        try {
                          el?.showPicker?.();
                        } catch {
                          /* noop */
                        }
                      }, 0);
                    }
                  }}
                >
                  Cập nhật End date
                </Label>
                <input
                  id="end-date"
                  type="date"
                  className="border border-input rounded-md px-3 py-2 text-sm w-full max-w-full bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  value={endLocal}
                  onChange={(e) => setEndLocal(e.target.value)}
                  disabled={!patchEnd || clearEnd}
                />
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="clear-end"
                    checked={clearEnd}
                    onCheckedChange={(v) => setClearEnd(v === true)}
                    disabled={!patchEnd}
                  />
                  <Label
                    htmlFor="clear-end"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Clear end date (mapping active)
                  </Label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setBulkOpen(false)}
              disabled={bulkSaving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void onBulkSave()}
              disabled={bulkSaving}
            >
              {bulkSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving…
                </>
              ) : (
                "Save to StarRocks"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
