"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Edit, Camera, KeyRound, Shield, Monitor, ChevronDown, Loader2, BadgePercent, CheckCircle2, AlertTriangle } from "lucide-react"
import { ChangePasswordModal } from "./change-password-modal"
import { CommissionRevenueTab } from "@/components/commission/revenue/commission-revenue-tab"
import { alertsApi, authApi } from "@/lib/api/services"
import { authUserFromMeDto, clearAuthSessionData, getAccessToken, getRefreshToken, getUserInitials, hasScreenFunction, setAuthData } from "@/lib/auth"
import { useApi } from "@/hooks/use-api"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import type { ActiveSession } from "@/types/api"

type TelegramDestinationDraft = {
  id: string
  name: string
  chatId: string
  messageThreadId: string
}

function newRowId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `row_${Math.random().toString(16).slice(2)}`
}

/** Dòng placeholder khi chưa có draft — id cố định, tránh newRowId() mỗi lần render. */
const TELEGRAM_PLACEHOLDER_DRAFT_ID = "__telegram_placeholder__"

function upsertTelegramDraftRow(
  prev: TelegramDestinationDraft[],
  rowId: string,
  patch: Partial<TelegramDestinationDraft>,
): TelegramDestinationDraft[] {
  if (prev.length === 0 && rowId === TELEGRAM_PLACEHOLDER_DRAFT_ID) {
    return [
      {
        id: newRowId(),
        name: patch.name ?? "",
        chatId: patch.chatId ?? "",
        messageThreadId: patch.messageThreadId ?? "",
      },
    ]
  }
  return prev.map((x) => (x.id === rowId ? { ...x, ...patch } : x))
}

function parseTelegramDestinationsJson(input?: string | null): TelegramDestinationDraft[] {
  if (!input?.trim()) return []
  try {
    const parsed = JSON.parse(input)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((x) => x && typeof x === "object")
      .map((x) => ({
        id: typeof x.id === "string" && x.id.trim() ? x.id.trim() : newRowId(),
        name: typeof x.name === "string" ? x.name : "",
        chatId: typeof x.chatId === "string" ? x.chatId : "",
        messageThreadId: typeof x.messageThreadId === "string" ? x.messageThreadId : "",
      }))
  } catch {
    return []
  }
}

export function MyProfileContent() {
  const router = useRouter()
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const [showApps, setShowApps] = useState(false)
  const [showTeams, setShowTeams] = useState(false)
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    weeklyReport: true,
    teamActivity: false,
  })
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [sessionsError, setSessionsError] = useState<string | null>(null)
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null)
  const [showAllSessions, setShowAllSessions] = useState(false)
  const [slackDrafts, setSlackDrafts] = useState({
    direct: "",
    realtime: "",
    hourly: "",
    daily: "",
  })
  const [telegramDestinationDrafts, setTelegramDestinationDrafts] = useState<TelegramDestinationDraft[]>([])
  const [profileSaving, setProfileSaving] = useState(false)
  const [slackTestKey, setSlackTestKey] = useState<"direct" | "realtime" | "hourly" | "daily" | null>(null)
  const [telegramTestRowId, setTelegramTestRowId] = useState<string | null>(null)
  const [telegramTestDialog, setTelegramTestDialog] = useState<{ open: boolean; ok: boolean; message: string }>({
    open: false,
    ok: true,
    message: "",
  })
  const [telegramTestAutoCloseSeconds, setTelegramTestAutoCloseSeconds] = useState(10)
  const [telegramRemoveRowId, setTelegramRemoveRowId] = useState<string | null>(null)

  // Load current user (must be before callbacks that read displayUser)
  const { data: userResponse, loading: userLoading, refetch: refetchCurrentUser } = useApi(
    () => authApi.getCurrentUser(),
    {
      enabled: typeof window !== "undefined" && !!localStorage.getItem("accessToken"),
      cacheKey: "auth-me-profile",
    }
  )

  const user = userResponse?.data
  const userFromStorage = typeof window !== 'undefined' 
    ? JSON.parse(localStorage.getItem('user') || '{}')
    : null

  const displayUser = user || userFromStorage

  const getSlackWebhookUrlForTest = useCallback(
    (key: "direct" | "realtime" | "hourly" | "daily"): string => {
      if (isEditing) {
        return slackDrafts[key].trim()
      }
      const u = displayUser as {
        slackWebhookUrl?: string
        slackWebhookUrlRealtime?: string
        slackWebhookUrlHourly?: string
        slackWebhookUrlDaily?: string
      } | null
      if (!u) return ""
      switch (key) {
        case "direct":
          return (u.slackWebhookUrl ?? "").trim()
        case "realtime":
          return (u.slackWebhookUrlRealtime ?? "").trim()
        case "hourly":
          return (u.slackWebhookUrlHourly ?? "").trim()
        case "daily":
          return (u.slackWebhookUrlDaily ?? "").trim()
        default:
          return ""
      }
    },
    [isEditing, slackDrafts, displayUser],
  )

  const sendSlackTestForChannel = useCallback(
    async (key: "direct" | "realtime" | "hourly" | "daily") => {
      const webhookUrl = getSlackWebhookUrlForTest(key)
      if (!webhookUrl) {
        toast({
          title: "Error",
          description: "Configure a Slack webhook URL first.",
          variant: "destructive",
        })
        return
      }
      try {
        const parsed = new URL(webhookUrl)
        if (!["http:", "https:"].includes(parsed.protocol)) {
          toast({
            title: "Error",
            description: "Webhook URL must use http or https.",
            variant: "destructive",
          })
          return
        }
      } catch {
        toast({ title: "Error", description: "Invalid webhook URL.", variant: "destructive" })
        return
      }
      setSlackTestKey(key)
      try {
        await alertsApi.sendSlackTest({ webhookUrl })
        toast({
          title: "Test sent",
          description: "Check your Slack channel for the test message.",
        })
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not send Slack test message."
        toast({ title: "Error", description: msg, variant: "destructive" })
      } finally {
        setSlackTestKey(null)
      }
    },
    [getSlackWebhookUrlForTest, toast],
  )

  const sendTelegramTestForPreset = useCallback(
    async (rowId: string, chatId: string, messageThreadIdRaw: string) => {
      const cid = chatId.trim()
      if (!cid) {
        toast({
          title: "Error",
          description: "Enter a Chat ID before sending a test.",
          variant: "destructive",
        })
        return
      }
      const threadRaw = messageThreadIdRaw.trim()
      let messageThreadId: number | undefined
      if (threadRaw) {
        const n = Number(threadRaw)
        if (Number.isNaN(n) || !Number.isFinite(n) || n <= 0) {
          toast({
            title: "Error",
            description: "Message thread ID must be a number greater than 0.",
            variant: "destructive",
          })
          return
        }
        messageThreadId = n
      }
      setTelegramTestRowId(rowId)
      try {
        const res = await alertsApi.sendTelegramTest({ chatId: cid, messageThreadId })
        const ok = !!res?.success
        const msg = (ok ? res?.message : res?.error || res?.message) ?? (ok ? "Telegram message sent" : "Could not send Telegram message")
        setTelegramTestDialog({ open: true, ok, message: msg })
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not send Telegram test message."
        toast({ title: "Error", description: msg, variant: "destructive" })
        setTelegramTestDialog({ open: true, ok: false, message: msg })
      } finally {
        setTelegramTestRowId(null)
      }
    },
    [toast],
  )

  useEffect(() => {
    if (!telegramTestDialog.open) return
    setTelegramTestAutoCloseSeconds(10)
    const t = window.setInterval(() => {
      setTelegramTestAutoCloseSeconds((s) => {
        if (s <= 1) {
          window.clearInterval(t)
          setTelegramTestDialog((prev) => ({ ...prev, open: false }))
          return 10
        }
        return s - 1
      })
    }, 1000)
    return () => window.clearInterval(t)
  }, [telegramTestDialog.open])

  const removeTelegramDestinationPreset = useCallback(
    async (rowId: string) => {
      const existing = parseTelegramDestinationsJson(
        (displayUser as { telegramDestinationsJson?: string } | null)?.telegramDestinationsJson,
      )
      if (existing.length === 0) return

      const next = existing.filter((x) => x.id !== rowId)
      setTelegramRemoveRowId(rowId)
      try {
        const res = await authApi.updateMyProfile({
          telegramDestinationsJson: JSON.stringify(
            next
              .map((x) => ({
                id: x.id,
                name: x.name?.trim() ?? "",
                chatId: x.chatId?.trim() ?? "",
                messageThreadId: x.messageThreadId?.trim() || undefined,
              }))
              .filter((x) => x.chatId.length > 0),
          ),
        })
        if (!res.success || !res.data) throw new Error("Failed to update profile")

        const accessToken = getAccessToken()
        if (accessToken) {
          setAuthData(accessToken, getRefreshToken() ?? null, authUserFromMeDto(res.data))
        }
        void refetchCurrentUser()

        toast({ title: "Removed", description: "Telegram destination preset removed." })
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not remove preset."
        toast({ title: "Error", description: msg, variant: "destructive" })
      } finally {
        setTelegramRemoveRowId(null)
      }
    },
    [displayUser, refetchCurrentUser, toast],
  )

  // Get apps and teams from user data
  const myApps = displayUser?.permissions ? Object.keys(displayUser.permissions) : []
  const myTeams = displayUser?.teams || []

  const getSessionSubtitle = (session: ActiveSession) => {
    if (session.isCurrent) return "Current session"
    const lastSeen = session.lastUsedAt || session.createdAt
    const formatted = new Date(lastSeen).toLocaleString()
    return `Last active ${formatted}`
  }

  const loadActiveSessions = async () => {
    try {
      setSessionsLoading(true)
      setSessionsError(null)
      const response = await authApi.getSessions()
      setActiveSessions(response.data ?? [])
    } catch (err) {
      setSessionsError(err instanceof Error ? err.message : "Failed to load active sessions")
    } finally {
      setSessionsLoading(false)
    }
  }

  useEffect(() => {
    if (typeof window === "undefined" || !localStorage.getItem("accessToken")) return
    loadActiveSessions()
  }, [])

  const handleRevokeSession = async (sessionId: string) => {
    try {
      setRevokingSessionId(sessionId)
      await authApi.revokeSession(sessionId)
      await loadActiveSessions()
      toast({
        title: "Session revoked",
        description: "Selected device has been signed out.",
      })
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to revoke session",
        variant: "destructive",
      })
    } finally {
      setRevokingSessionId(null)
    }
  }

  const openProfileEdit = () => {
    const u = userResponse?.data ?? userFromStorage
    setSlackDrafts({
      direct: u?.slackWebhookUrl ?? "",
      realtime: u?.slackWebhookUrlRealtime ?? "",
      hourly: u?.slackWebhookUrlHourly ?? "",
      daily: u?.slackWebhookUrlDaily ?? "",
    })
    setTelegramDestinationDrafts(parseTelegramDestinationsJson(u?.telegramDestinationsJson))
    setIsEditing(true)
  }

  const handleSaveProfile = async () => {
    try {
      setProfileSaving(true)
      const res = await authApi.updateMyProfile({
        slackWebhookUrl: slackDrafts.direct.trim(),
        slackWebhookUrlRealtime: slackDrafts.realtime.trim(),
        slackWebhookUrlHourly: slackDrafts.hourly.trim(),
        slackWebhookUrlDaily: slackDrafts.daily.trim(),
        telegramDestinationsJson: JSON.stringify(
          telegramDestinationDrafts
            .map((x) => ({
              id: x.id,
              name: x.name.trim(),
              chatId: x.chatId.trim(),
              messageThreadId: x.messageThreadId.trim() || undefined,
            }))
            .filter((x) => x.chatId.length > 0),
        ),
      })
      if (!res.success || !res.data) {
        throw new Error("Failed to update profile")
      }
      const token = getAccessToken()
      if (token) {
        setAuthData(token, getRefreshToken() ?? null, authUserFromMeDto(res.data))
      }
      await refetchCurrentUser()
      toast({
        title: "Profile updated",
        description: "Your notification settings have been saved.",
      })
      setIsEditing(false)
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Could not save profile",
        variant: "destructive",
      })
    } finally {
      setProfileSaving(false)
    }
  }

  const handleLogoutAll = async () => {
    try {
      await authApi.logoutAll()
      clearAuthSessionData()
      router.push('/login')
      toast({
        title: "Logged out",
        description: "You have been logged out from all devices.",
      })
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to logout",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      <Dialog
        open={telegramTestDialog.open}
        onOpenChange={(open) => setTelegramTestDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Telegram test</DialogTitle>
          </DialogHeader>
          <div className="py-6 flex flex-col items-center justify-center text-center gap-3">
            {telegramTestDialog.ok ? (
              <CheckCircle2 className="h-10 w-10 text-emerald-600" aria-hidden />
            ) : (
              <AlertTriangle className="h-10 w-10 text-red-600" aria-hidden />
            )}
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{telegramTestDialog.message}</p>
            <p className="text-xs text-slate-500">Auto-closes in {telegramTestAutoCloseSeconds} seconds</p>
          </div>
        </DialogContent>
      </Dialog>
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your account settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-3 space-y-6">
          {/* Profile Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-6">
                <div className="relative group">
                  <Avatar className="h-24 w-24">
                    {displayUser?.avatarUrl && <AvatarImage src={displayUser.avatarUrl} />}
                    <AvatarFallback className="bg-blue-100 text-blue-600 text-2xl font-bold">
                      {getUserInitials(displayUser)}
                    </AvatarFallback>
                  </Avatar>
                  <button className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-6 h-6 text-white" />
                  </button>
                </div>
                <div>
                  {userLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                  ) : (
                    <>
                      <h2 className="text-xl font-bold text-slate-900">
                        {displayUser?.fullName || displayUser?.firstName || displayUser?.email || "User"}
                      </h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-slate-500">{displayUser?.email || ""}</span>
                        {displayUser?.emailVerified && (
                          <Badge variant="outline" className="text-xs border-green-200 text-green-700">
                            Verified
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className="bg-purple-100 text-purple-700">
                          {displayUser?.role || "User"}
                        </Badge>
                        {displayUser?.organization && (
                          <span className="text-xs text-slate-400">
                            {displayUser.organization.name}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold">Personal Information</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (isEditing) {
                    setIsEditing(false)
                  } else {
                    openProfileEdit()
                  }
                }}
              >
                <Edit className="w-4 h-4 mr-1" />
                {isEditing ? "Cancel" : "Edit"}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500">First Name</p>
                  <p className="text-sm font-medium text-slate-900">
                    {displayUser?.firstName || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Last Name</p>
                  <p className="text-sm font-medium text-slate-900">
                    {displayUser?.lastName || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Email</p>
                  <p className="text-sm font-medium text-slate-900">
                    {displayUser?.email || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Role</p>
                  <p className="text-sm font-medium text-slate-900">
                    {displayUser?.role || "—"}
                  </p>
                </div>
                <div className="col-span-2 space-y-4">
                  <p className="text-xs text-slate-400">
                    Metric-scoped Slack alerts use the webhook for the rule frequency (real-time, hourly, daily). If that
                    URL is empty, the Direct message webhook is used. Leave any field empty and save to clear it.
                  </p>
                  {(
                    [
                      { key: "direct" as const, label: "Slack — Direct message (default)" },
                      { key: "realtime" as const, label: "Slack — Real-time alerts" },
                      { key: "hourly" as const, label: "Slack — Hourly alerts" },
                      { key: "daily" as const, label: "Slack — Daily alerts" },
                    ] as const
                  ).map(({ key, label }) => {
                    const saved =
                      key === "direct"
                        ? displayUser?.slackWebhookUrl
                        : key === "realtime"
                          ? displayUser?.slackWebhookUrlRealtime
                          : key === "hourly"
                            ? displayUser?.slackWebhookUrlHourly
                            : displayUser?.slackWebhookUrlDaily
                    const hasTestTarget = !!getSlackWebhookUrlForTest(key)
                    return (
                      <div key={key}>
                        <p className="text-xs text-slate-500">{label}</p>
                        <div className="flex gap-2 mt-1.5 items-start">
                          <div className="min-w-0 flex-1">
                            {isEditing ? (
                              <Input
                                type="url"
                                placeholder="https://hooks.slack.com/services/..."
                                value={slackDrafts[key]}
                                onChange={(e) =>
                                  setSlackDrafts((d) => ({ ...d, [key]: e.target.value }))
                                }
                                autoComplete="off"
                              />
                            ) : (
                              <p className="text-sm font-medium text-slate-900 break-all">{saved || "—"}</p>
                            )}
                          </div>
                          {hasTestTarget ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="shrink-0 gap-2"
                              disabled={slackTestKey !== null}
                              onClick={() => void sendSlackTestForChannel(key)}
                            >
                              {slackTestKey === key ? (
                                <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden />
                              ) : null}
                              Send test message
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="col-span-2 space-y-3 border-t pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Telegram destinations</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Lưu các preset (tên gợi nhớ + Chat ID / Message thread ID) để dùng nhanh khi tạo My Alerts.
                      </p>
                    </div>
                    {isEditing ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() =>
                          setTelegramDestinationDrafts((prev) => [
                            ...prev,
                            { id: newRowId(), name: "", chatId: "", messageThreadId: "" },
                          ])
                        }
                      >
                        Add
                      </Button>
                    ) : null}
                  </div>

                  {isEditing ? (
                    <div className="overflow-hidden rounded-lg border border-slate-200">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-600">
                            <th className="min-w-[7rem] px-3 py-2 align-bottom">Name</th>
                            <th className="min-w-[8rem] px-3 py-2 align-bottom">Chat ID</th>
                            <th className="min-w-[6rem] px-3 py-2 align-bottom">Message thread ID (optional)</th>
                            <th className="w-0 whitespace-nowrap px-2 py-2 text-right align-bottom">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(telegramDestinationDrafts.length > 0
                            ? telegramDestinationDrafts
                            : [
                                {
                                  id: TELEGRAM_PLACEHOLDER_DRAFT_ID,
                                  name: "",
                                  chatId: "",
                                  messageThreadId: "",
                                } as TelegramDestinationDraft,
                              ]
                          ).map((row) => {
                            const hasChat = !!row.chatId.trim()
                            return (
                              <tr key={row.id} className="border-b border-slate-100 bg-white last:border-b-0">
                                <td className="px-3 py-2 align-middle">
                                  <Input
                                    value={row.name}
                                    placeholder="Finance room"
                                    className="h-9"
                                    onChange={(e) =>
                                      setTelegramDestinationDrafts((prev) =>
                                        upsertTelegramDraftRow(prev, row.id, { name: e.target.value }),
                                      )
                                    }
                                    autoComplete="off"
                                  />
                                </td>
                                <td className="px-3 py-2 align-middle">
                                  <Input
                                    value={row.chatId}
                                    placeholder="-1001234567890"
                                    className="h-9"
                                    onChange={(e) =>
                                      setTelegramDestinationDrafts((prev) =>
                                        upsertTelegramDraftRow(prev, row.id, { chatId: e.target.value }),
                                      )
                                    }
                                    autoComplete="off"
                                  />
                                </td>
                                <td className="px-3 py-2 align-middle">
                                  <Input
                                    value={row.messageThreadId}
                                    placeholder="12"
                                    className="h-9"
                                    onChange={(e) =>
                                      setTelegramDestinationDrafts((prev) =>
                                        upsertTelegramDraftRow(prev, row.id, {
                                          messageThreadId: e.target.value,
                                        }),
                                      )
                                    }
                                    autoComplete="off"
                                  />
                                </td>
                                <td className="whitespace-nowrap px-2 py-2 align-middle text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    {hasChat ? (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="gap-2 bg-white"
                                        disabled={telegramTestRowId !== null || telegramRemoveRowId !== null}
                                        onClick={() =>
                                          void sendTelegramTestForPreset(row.id, row.chatId, row.messageThreadId)
                                        }
                                      >
                                        {telegramTestRowId === row.id ? (
                                          <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                                        ) : null}
                                        Send
                                      </Button>
                                    ) : null}
                                    {telegramDestinationDrafts.length > 0 ? (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 px-2 text-slate-500"
                                        onClick={() =>
                                          setTelegramDestinationDrafts((prev) =>
                                            prev.filter((x) => x.id !== row.id),
                                          )
                                        }
                                      >
                                        Remove
                                      </Button>
                                    ) : null}
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div>
                      {parseTelegramDestinationsJson(displayUser?.telegramDestinationsJson).length === 0 ? (
                        <p className="text-sm text-slate-500">—</p>
                      ) : (
                        <div className="overflow-hidden rounded-lg border border-slate-200">
                          <table className="w-full border-collapse text-sm">
                            <thead>
                              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-600">
                                <th className="min-w-[7rem] px-3 py-2">Name</th>
                                <th className="min-w-[8rem] px-3 py-2">Chat ID</th>
                                <th className="min-w-[6rem] px-3 py-2">Message thread ID</th>
                                <th className="w-0 whitespace-nowrap px-3 py-2 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {parseTelegramDestinationsJson(displayUser?.telegramDestinationsJson).map((d) => {
                                const hasChat = !!d.chatId?.trim()
                                return (
                                  <tr
                                    key={d.id}
                                    className="border-b border-slate-100 bg-white last:border-b-0 hover:bg-slate-50/60"
                                  >
                                    <td className="px-3 py-2 align-middle font-medium text-slate-900">
                                      {d.name?.trim() || "Telegram destination"}
                                    </td>
                                    <td className="max-w-[12rem] px-3 py-2 align-middle break-all text-slate-700">
                                      {d.chatId?.trim() || "—"}
                                    </td>
                                    <td className="px-3 py-2 align-middle text-slate-700">
                                      {d.messageThreadId?.trim() || "—"}
                                    </td>
                                    <td className="px-3 py-2 align-middle text-right">
                                      <div className="flex items-center justify-end gap-2">
                                        {hasChat ? (
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="gap-2 bg-white"
                                            disabled={telegramTestRowId !== null || telegramRemoveRowId !== null}
                                            onClick={() =>
                                              void sendTelegramTestForPreset(
                                                d.id,
                                                d.chatId,
                                                d.messageThreadId ?? "",
                                              )
                                            }
                                          >
                                            {telegramTestRowId === d.id ? (
                                              <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                                            ) : null}
                                            Send
                                          </Button>
                                        ) : null}
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 px-2 text-red-600 hover:text-red-700"
                                          disabled={telegramTestRowId !== null || telegramRemoveRowId !== null}
                                          onClick={() => void removeTelegramDestinationPreset(d.id)}
                                        >
                                          {telegramRemoveRowId === d.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                                          ) : (
                                            "Remove"
                                          )}
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {isEditing && (
                <div className="mt-4 pt-4 border-t flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsEditing(false)} disabled={profileSaving}>
                    Cancel
                  </Button>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={handleSaveProfile}
                    disabled={profileSaving}
                  >
                    {profileSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Security */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                    <KeyRound className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Password</p>
                    <p className="text-xs text-slate-500">Last changed 30 days ago</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setChangePasswordOpen(true)}>
                  Change
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Two-Factor Authentication</p>
                    <p className="text-xs text-slate-500">Not enabled</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Enable
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Active Sessions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold">Active Sessions</CardTitle>
              {activeSessions.length > 3 && (
                <Button
                  variant="link"
                  size="sm"
                  className="text-blue-600 p-0 h-auto"
                  onClick={() => setShowAllSessions((prev) => !prev)}
                >
                  {showAllSessions ? "View Less" : "View All"}
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {sessionsLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading active sessions...
                </div>
              ) : sessionsError ? (
                <p className="text-sm text-red-600">{sessionsError}</p>
              ) : activeSessions.length === 0 ? (
                <p className="text-sm text-slate-500">No active remembered sessions found.</p>
              ) : (
                (showAllSessions ? activeSessions : activeSessions.slice(0, 3)).map((session) => (
                  <div key={session.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${session.isCurrent ? "bg-green-100" : "bg-slate-100"}`}>
                        <Monitor className={`w-5 h-5 ${session.isCurrent ? "text-green-600" : "text-slate-600"}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{session.deviceInfo || "Unknown device"}</p>
                        <p className="text-xs text-slate-500">
                          {getSessionSubtitle(session)}
                          {session.ipAddress ? ` • IP ${session.ipAddress}` : ""}
                        </p>
                      </div>
                    </div>
                    {!session.isCurrent && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRevokeSession(session.id)}
                        disabled={revokingSessionId === session.id}
                      >
                        {revokingSessionId === session.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign out"}
                      </Button>
                    )}
                  </div>
                ))
              )}
              <Button 
                variant="link" 
                className="text-red-600 p-0 h-auto text-sm"
                onClick={handleLogoutAll}
              >
                Sign out all other devices
              </Button>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="email-alerts" className="text-sm">
                  Email notifications for alerts
                </Label>
                <Switch
                  id="email-alerts"
                  checked={notifications.emailAlerts}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, emailAlerts: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="weekly-report" className="text-sm">
                  Weekly summary report
                </Label>
                <Switch
                  id="weekly-report"
                  checked={notifications.weeklyReport}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, weeklyReport: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="team-activity" className="text-sm">
                  Team activity updates
                </Label>
                <Switch
                  id="team-activity"
                  checked={notifications.teamActivity}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, teamActivity: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* My Access */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">My Access</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Collapsible open={showApps} onOpenChange={setShowApps}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-900">Apps I can access</span>
                <Badge variant="secondary" className="text-xs">
                  {myApps.length}
                </Badge>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showApps ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {myApps.length > 0 ? (
                  Object.entries(displayUser?.permissions || {}).map(([appId, permission]) => (
                    <div key={appId} className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="text-sm text-slate-900">{appId}</span>
                      <Badge variant="outline" className="text-xs">
                        {permission as string}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 col-span-2">No app permissions found</p>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={showTeams} onOpenChange={setShowTeams}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-900">Teams I belong to</span>
                <Badge variant="secondary" className="text-xs">
                  {myTeams.length}
                </Badge>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showTeams ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {myTeams.length > 0 ? (
                  myTeams.map((team: any) => (
                    <div key={team.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="text-sm text-slate-900">{team.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {team.role}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 col-span-2">No teams found</p>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* My Commission */}
      {(hasScreenFunction("s-commission", "view") || hasScreenFunction("s-commission", "manage")) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BadgePercent className="w-4 h-4 text-slate-500" />
              My Commission
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CommissionRevenueTab />
          </CardContent>
        </Card>
      )}

      {/* Change Password Modal */}
      <ChangePasswordModal open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
    </div>
  )
}
