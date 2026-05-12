"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { Download, RefreshCw } from "lucide-react"
import { buildVCard, type VCardInput } from "@/lib/vcard"
import { encodeVCardPublicPayloadCompressed } from "@/lib/vcard-public-payload"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

declare global {
  interface Window {
    QRCode?: any
  }
}

function loadQrCodeJs(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve()
  if (window.QRCode) return Promise.resolve()

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-qrcodejs='true']")
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true })
      existing.addEventListener("error", () => reject(new Error("Failed to load QRCode script")), { once: true })
      return
    }

    const script = document.createElement("script")
    script.src = "https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"
    script.async = true
    script.dataset.qrcodejs = "true"
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Failed to load QRCode script"))
    document.head.appendChild(script)
  })
}

function getQrOverflowMessage(err: unknown): string | null {
  const msg = err instanceof Error ? err.message : typeof err === "string" ? err : ""
  if (!msg) return null
  return msg.includes("code length overflow") ? msg : null
}

function downloadTextFile(filename: string, text: string, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function safeFilenamePart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

export function VCardGeneratorPageContent() {
  const { toast } = useToast()
  const [qrMode, setQrMode] = useState<"landing" | "embedded">("landing")
  const [isGeneratingQr, setIsGeneratingQr] = useState(false)
  const [form, setForm] = useState<VCardInput>({
    firstName: "",
    lastName: "",
    org: "",
    jobTitle: "",
    mobileNumber: "",
    workNumber: "",
    workEmail: "",
    personalEmail: "",
    website1: "",
    website2: "",
    telegram: "",
    whatsapp: "",
    zalo: "",
    facebook: "",
    linkedin: "",
    homeAddress: { street1: "", street2: "", city: "", state: "", zip: "", countryCode: "" },
    workAddress: { street1: "", street2: "", city: "", state: "", zip: "", countryCode: "" },
    notes: "",
  })

  const qrRef = useRef<HTMLDivElement | null>(null)
  const [isQrReady, setIsQrReady] = useState(false)

  const vcardText = useMemo(() => {
    if (!form.firstName.trim() || !form.lastName.trim()) return ""
    return buildVCard(form)
  }, [form])

  const [landingUrl, setLandingUrl] = useState<string>("")
  const [landingUrlError, setLandingUrlError] = useState<string>("")

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!form.firstName.trim() || !form.lastName.trim()) {
        if (!cancelled) setLandingUrl("")
        return
      }
      if (typeof window === "undefined") return
      try {
        setLandingUrlError("")
        const encoded = await encodeVCardPublicPayloadCompressed(form)
        if (!cancelled) setLandingUrl(`${window.location.origin}/vcard?d=${encoded}`)
      } catch (e) {
        console.error(e)
        if (!cancelled) {
          setLandingUrl("")
          setLandingUrlError("Không thể tạo link landing page.")
        }
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [form])

  const qrText = useMemo(() => {
    if (!form.firstName.trim() || !form.lastName.trim()) return ""
    if (qrMode === "embedded") return vcardText
    return landingUrl
  }, [form.firstName, form.lastName, qrMode, vcardText, landingUrl])

  const resetQr = () => {
    if (!qrRef.current) return
    qrRef.current.innerHTML = ""
  }

  const renderQr = async () => {
    if (!qrRef.current) return
    if (isGeneratingQr) return
    try {
      setIsGeneratingQr(true)

      if (!form.firstName.trim() || !form.lastName.trim()) {
        toast({
          title: "Thiếu thông tin",
          description: "Vui lòng nhập tối thiểu First Name và Last Name để tạo vCard.",
          variant: "destructive",
        })
        return
      }

      let qrValue = qrText
      if (qrMode === "landing") {
        const encoded = await encodeVCardPublicPayloadCompressed(form)
        qrValue = `${window.location.origin}/vcard?d=${encoded}`
        setLandingUrl(qrValue)
        setLandingUrlError("")
      }
      if (!qrValue) {
        toast({
          title: "Thiếu thông tin",
          description: "Chưa tạo được nội dung QR. Vui lòng thử lại.",
          variant: "destructive",
        })
        return
      }

      await loadQrCodeJs()
      resetQr()
      const QRCode = window.QRCode
      // qrcodejs đôi khi default correctLevel cao -> dễ overflow.
      // typeNumber=0 => auto version.
      // eslint-disable-next-line new-cap
      const qr = new QRCode(qrRef.current, {
        text: qrValue,
        width: 280,
        height: 280,
        correctLevel: QRCode?.CorrectLevel?.L,
        typeNumber: 0,
      })
      if (typeof qr.makeCode === "function") qr.makeCode(qrValue)
      setIsQrReady(true)
    } catch (e) {
      console.error(e)
      const overflow = getQrOverflowMessage(e)
      toast({
        title: "Không thể tạo QR",
        description: overflow
          ? `Nội dung QR quá dài nên bị overflow (${qrValue.length} ký tự). Hãy giảm bớt field (đặc biệt: Notes, Address, nhiều URL/email/phone) hoặc chuyển sang mode "Landing Page".`
          : "Không tải được thư viện QR hoặc gặp lỗi khi render. Vui lòng thử lại.",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingQr(false)
    }
  }

  const handleGenerateQrClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toast({ title: "Generating...", description: "Đang tạo QR code." })
    void renderQr()
  }

  const downloadQrPng = () => {
    const root = qrRef.current
    if (!root) return
    const img = root.querySelector<HTMLImageElement>("img")
    const canvas = root.querySelector<HTMLCanvasElement>("canvas")
    const dataUrl = img?.src || canvas?.toDataURL("image/png")
    if (!dataUrl) {
      toast({ title: "Chưa có QR", description: "Hãy Generate QR trước.", variant: "destructive" })
      return
    }

    const filename = `vcard-${safeFilenamePart(`${form.firstName} ${form.lastName}`) || "contact"}.png`
    const a = document.createElement("a")
    a.href = dataUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  const downloadVcf = () => {
    if (!vcardText) {
      toast({ title: "Chưa có vCard", description: "Nhập First Name/Last Name để tạo vCard.", variant: "destructive" })
      return
    }
    const filename = `vcard-${safeFilenamePart(`${form.firstName} ${form.lastName}`) || "contact"}.vcf`
    downloadTextFile(filename, vcardText, "text/vcard;charset=utf-8")
  }

  useEffect(() => {
    setIsQrReady(false)
    resetQr()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vcardText])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">vCard Generator</h1>
        <p className="text-muted-foreground">
          Tạo file <span className="font-mono">.vcf</span> và QR code. Bạn có thể chọn QR dẫn tới Landing Page (giống qrco.de) hoặc embed vCard trực tiếp.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>First Name và Last Name là bắt buộc. Các trường còn lại tuỳ chọn.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>QR Mode</Label>
              <ToggleGroup
                type="single"
                value={qrMode}
                onValueChange={(v) => setQrMode((v === "embedded" || v === "landing") ? v : "landing")}
                className="justify-start"
              >
                <ToggleGroupItem value="landing" aria-label="Landing Page">
                  Landing Page
                </ToggleGroupItem>
                <ToggleGroupItem value="embedded" aria-label="Embedded vCard">
                  Embedded vCard
                </ToggleGroupItem>
              </ToggleGroup>
              <p className="text-xs text-muted-foreground">
                Landing Page: QR ngắn, hiển thị nút Call/Email/Social và có nút Add Contact.
                Embedded vCard: quét mở thẳng contact importer nhưng dễ overflow nếu nhiều thông tin.
              </p>
              {qrMode === "landing" && (
                <div className="space-y-2 pt-1">
                  <Label>Landing URL</Label>
                  <Input readOnly value={landingUrl || (landingUrlError ? landingUrlError : "Đang tạo link...")} />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={form.firstName}
                  onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={form.lastName}
                  onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="org">Organization</Label>
                <Input id="org" value={form.org ?? ""} onChange={(e) => setForm((p) => ({ ...p, org: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jobTitle">Job Title</Label>
                <Input id="jobTitle" value={form.jobTitle ?? ""} onChange={(e) => setForm((p) => ({ ...p, jobTitle: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mobileNumber">Mobile Phone</Label>
                <Input
                  id="mobileNumber"
                  value={form.mobileNumber ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, mobileNumber: e.target.value }))}
                  placeholder="+84..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="workNumber">Work Phone</Label>
                <Input id="workNumber" value={form.workNumber ?? ""} onChange={(e) => setForm((p) => ({ ...p, workNumber: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="workEmail">Work Email</Label>
                <Input
                  id="workEmail"
                  type="email"
                  value={form.workEmail ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, workEmail: e.target.value }))}
                  placeholder="work@company.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="personalEmail">Personal Email</Label>
                <Input
                  id="personalEmail"
                  type="email"
                  value={form.personalEmail ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, personalEmail: e.target.value }))}
                  placeholder="me@gmail.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="website1">Website 1</Label>
                <Input id="website1" value={form.website1 ?? ""} onChange={(e) => setForm((p) => ({ ...p, website1: e.target.value }))} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website2">Website 2</Label>
                <Input id="website2" value={form.website2 ?? ""} onChange={(e) => setForm((p) => ({ ...p, website2: e.target.value }))} placeholder="https://..." />
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-sm font-medium">Social / Messenger (optional)</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="telegram">Telegram</Label>
                  <Input
                    id="telegram"
                    value={form.telegram ?? ""}
                    onChange={(e) => setForm((p) => ({ ...p, telegram: e.target.value }))}
                    placeholder="https://t.me/username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    value={form.whatsapp ?? ""}
                    onChange={(e) => setForm((p) => ({ ...p, whatsapp: e.target.value }))}
                    placeholder="https://wa.me/84xxxxxxxxx"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zalo">Zalo</Label>
                  <Input
                    id="zalo"
                    value={form.zalo ?? ""}
                    onChange={(e) => setForm((p) => ({ ...p, zalo: e.target.value }))}
                    placeholder="https://zalo.me/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="facebook">Facebook</Label>
                  <Input
                    id="facebook"
                    value={form.facebook ?? ""}
                    onChange={(e) => setForm((p) => ({ ...p, facebook: e.target.value }))}
                    placeholder="https://facebook.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkedin">LinkedIn</Label>
                  <Input
                    id="linkedin"
                    value={form.linkedin ?? ""}
                    onChange={(e) => setForm((p) => ({ ...p, linkedin: e.target.value }))}
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Tip: để tăng tương thích, ưu tiên link dạng <span className="font-mono">https://</span> (thay vì scheme riêng của app).
              </p>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="text-sm font-medium">Home Address (optional)</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  placeholder="Street (line 1)"
                  value={form.homeAddress?.street1 ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, homeAddress: { ...(p.homeAddress ?? {}), street1: e.target.value } }))}
                />
                <Input
                  placeholder="Street (line 2)"
                  value={form.homeAddress?.street2 ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, homeAddress: { ...(p.homeAddress ?? {}), street2: e.target.value } }))}
                />
                <Input
                  placeholder="City"
                  value={form.homeAddress?.city ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, homeAddress: { ...(p.homeAddress ?? {}), city: e.target.value } }))}
                />
                <Input
                  placeholder="State/Province"
                  value={form.homeAddress?.state ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, homeAddress: { ...(p.homeAddress ?? {}), state: e.target.value } }))}
                />
                <Input
                  placeholder="Zip"
                  value={form.homeAddress?.zip ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, homeAddress: { ...(p.homeAddress ?? {}), zip: e.target.value } }))}
                />
                <Input
                  placeholder="Country Code"
                  value={form.homeAddress?.countryCode ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, homeAddress: { ...(p.homeAddress ?? {}), countryCode: e.target.value } }))}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Để tạo dòng <span className="font-mono">ADR</span>, cần đủ Street(line1), City, State/Province và Zip.
              </p>
            </div>

            <div className="space-y-3">
              <div className="text-sm font-medium">Work Address (optional)</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  placeholder="Street (line 1)"
                  value={form.workAddress?.street1 ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, workAddress: { ...(p.workAddress ?? {}), street1: e.target.value } }))}
                />
                <Input
                  placeholder="Street (line 2)"
                  value={form.workAddress?.street2 ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, workAddress: { ...(p.workAddress ?? {}), street2: e.target.value } }))}
                />
                <Input
                  placeholder="City"
                  value={form.workAddress?.city ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, workAddress: { ...(p.workAddress ?? {}), city: e.target.value } }))}
                />
                <Input
                  placeholder="State/Province"
                  value={form.workAddress?.state ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, workAddress: { ...(p.workAddress ?? {}), state: e.target.value } }))}
                />
                <Input
                  placeholder="Zip"
                  value={form.workAddress?.zip ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, workAddress: { ...(p.workAddress ?? {}), zip: e.target.value } }))}
                />
                <Input
                  placeholder="Country Code"
                  value={form.workAddress?.countryCode ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, workAddress: { ...(p.workAddress ?? {}), countryCode: e.target.value } }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea id="notes" value={form.notes ?? ""} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={3} />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={handleGenerateQrClick}
                disabled={isGeneratingQr || !form.firstName.trim() || !form.lastName.trim()}
              >
                Generate QR
              </Button>
              <Button type="button" variant="outline" onClick={downloadVcf} disabled={!vcardText}>
                <Download className="w-4 h-4 mr-2" />
                Download .vcf
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setForm((p) => ({
                    ...p,
                    firstName: "",
                    lastName: "",
                  }))
                }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Clear name
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>QR Code</CardTitle>
              <CardDescription>Quét để lưu contact. Bạn có thể tải PNG để in lên business card.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-6 flex-col sm:flex-row">
                <div className="rounded-lg border bg-white p-3">
                  <div ref={qrRef} />
                </div>
                <div className="space-y-2">
                  <Button type="button" variant="outline" onClick={downloadQrPng} disabled={!isQrReady}>
                    <Download className="w-4 h-4 mr-2" />
                    Download QR (PNG)
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Lưu ý: Một số thiết bị có giới hạn độ dài QR. Nếu bạn nhập quá nhiều field, QR có thể khó quét.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>vCard Source</CardTitle>
              <CardDescription>Nội dung này sẽ được embed vào QR code.</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="text-xs whitespace-pre-wrap break-words rounded-md border bg-muted/40 p-3 min-h-40">
                {vcardText || "Nhập First Name và Last Name để xem preview..."}
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

