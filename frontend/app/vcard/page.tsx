"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { decodeVCardPublicPayload } from "@/lib/vcard-public-payload"
import { buildVCard } from "@/lib/vcard"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Mail, Phone, UserPlus, Globe } from "lucide-react"

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const a = parts[0]?.[0] ?? ""
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : ""
  return (a + b).toUpperCase()
}

function SocialIcon({
  kind,
  className,
}: {
  kind: "whatsapp" | "telegram" | "zalo" | "facebook" | "linkedin"
  className?: string
}) {
  const common = { className: className ?? "w-6 h-6", viewBox: "0 0 24 24", fill: "currentColor" }
  switch (kind) {
    case "whatsapp":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.92c0 1.75.46 3.45 1.33 4.95L2 22l5.25-1.38a9.86 9.86 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.92C21.96 6.45 17.5 2 12.04 2zm5.73 14.25c-.24.67-1.4 1.3-1.93 1.37-.5.07-1.13.1-1.82-.12-.42-.13-.96-.31-1.66-.61-2.93-1.26-4.84-4.2-4.99-4.4-.15-.2-1.19-1.58-1.19-3.01 0-1.43.75-2.14 1.02-2.43.27-.29.6-.36.8-.36.2 0 .4 0 .57.01.18.01.42-.07.66.5.24.58.82 2 .9 2.15.08.15.13.33.02.53-.11.2-.16.33-.31.5-.15.17-.32.38-.46.51-.15.15-.3.32-.13.62.17.3.76 1.26 1.63 2.04 1.12 1 2.07 1.3 2.37 1.45.3.15.47.13.65-.08.18-.2.75-.88.95-1.18.2-.3.4-.25.67-.15.27.1 1.71.81 2 1 .29.19.48.29.55.45.07.16.07.92-.17 1.59z" />
        </svg>
      )
    case "telegram":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M9.993 15.6 9.82 19.1c.43 0 .62-.18.85-.4l2.04-1.94 4.23 3.1c.78.43 1.34.21 1.53-.72l2.77-13.02h0c.23-1.06-.38-1.47-1.14-1.19L2.7 9.5c-1.02.4-1.01.98-.17 1.24l4.47 1.4L17.4 6.7c.49-.33.94-.15.57.18L9.99 15.6z" />
        </svg>
      )
    case "facebook":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M22 12a10 10 0 1 0-11.56 9.87v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.46h-1.25c-1.23 0-1.62.76-1.62 1.54V12h2.76l-.44 2.88h-2.32v6.99A10 10 0 0 0 22 12z" />
        </svg>
      )
    case "linkedin":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M4.98 3.5A2.5 2.5 0 1 0 5 8.5a2.5 2.5 0 0 0-.02-5zM3 9h4v12H3V9zm7 0h3.8v1.64h.05c.53-1 1.82-2.05 3.75-2.05 4.01 0 4.75 2.64 4.75 6.07V21h-4v-5.36c0-1.28-.03-2.92-1.78-2.92-1.78 0-2.05 1.39-2.05 2.83V21h-4V9z" />
        </svg>
      )
    case "zalo":
      // Không có SVG chuẩn public trong repo => dùng icon "Z" đơn giản
      return (
        <div className={`${className ?? "w-6 h-6"} flex items-center justify-center font-bold`}>
          Z
        </div>
      )
  }
}

function SocialIconButton({
  kind,
  href,
  label,
  bgClass,
}: {
  kind: "whatsapp" | "telegram" | "zalo" | "facebook" | "linkedin"
  href: string
  label: string
  bgClass: string
}) {
  return (
    <button
      type="button"
      onClick={() => openUrl(href)}
      className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-sm ${bgClass}`}
      aria-label={label}
      title={label}
    >
      <SocialIcon kind={kind} className="w-6 h-6" />
    </button>
  )
}

function downloadVcf(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/vcard;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function safeFilename(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "contact"
}

function openUrl(url?: string) {
  const v = url?.trim()
  if (!v) return
  window.location.href = v
}

export default function VCardLandingPage() {
  const sp = useSearchParams()
  const encoded = sp.get("d") ?? ""

  const [data, setData] = useState<Awaited<ReturnType<typeof decodeVCardPublicPayload>>>(null)
  useEffect(() => {
    let cancelled = false
    async function run() {
      const decoded = await decodeVCardPublicPayload(encoded)
      if (!cancelled) setData(decoded)
    }
    run()
    return () => {
      cancelled = true
    }
  }, [encoded])

  const vcardText = useMemo(() => (data ? buildVCard(data) : ""), [data])

  if (!data) {
    return (
      <div className="min-h-dvh bg-slate-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-6">
          <div className="text-lg font-semibold">Invalid vCard link</div>
          <p className="text-sm text-muted-foreground mt-2">
            Link không hợp lệ hoặc đã bị cắt ngắn. Vui lòng tạo lại QR.
          </p>
        </Card>
      </div>
    )
  }

  const fullName = `${data.firstName} ${data.lastName}`.trim()
  const filename = `vcard-${safeFilename(fullName)}.vcf`

  return (
    <div className="min-h-dvh bg-slate-50">
      <div className="max-w-md mx-auto">
        <div className="bg-slate-700 text-white px-6 pt-10 pb-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full bg-white/15 border-4 border-white/20 flex items-center justify-center text-2xl font-semibold">
              {getInitials(fullName)}
            </div>
            <div className="mt-4 text-2xl font-semibold">{fullName}</div>
            {(data.jobTitle || data.org) && (
              <div className="mt-1 text-white/80">
                {[data.jobTitle, data.org].filter(Boolean).join(" • ")}
              </div>
            )}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <Button
              className="w-full bg-white/10 hover:bg-white/15 text-white border border-white/10"
              variant="secondary"
              onClick={() => openUrl(data.mobileNumber ? `tel:${data.mobileNumber}` : data.workNumber ? `tel:${data.workNumber}` : "")}
              disabled={!data.mobileNumber && !data.workNumber}
            >
              <Phone className="w-4 h-4 mr-2" />
              Call
            </Button>
            <Button
              className="w-full bg-white/10 hover:bg-white/15 text-white border border-white/10"
              variant="secondary"
              onClick={() => openUrl(data.workEmail ? `mailto:${data.workEmail}` : data.personalEmail ? `mailto:${data.personalEmail}` : "")}
              disabled={!data.workEmail && !data.personalEmail}
            >
              <Mail className="w-4 h-4 mr-2" />
              Email
            </Button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          {(data.mobileNumber || data.workNumber) && (
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Phone</div>
              <div className="text-sm">
                {data.mobileNumber && <div>{data.mobileNumber} <span className="text-muted-foreground">Mobile</span></div>}
                {data.workNumber && <div>{data.workNumber} <span className="text-muted-foreground">Work</span></div>}
              </div>
            </div>
          )}

          {(data.workEmail || data.personalEmail) && (
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Email</div>
              <div className="text-sm">
                {data.workEmail && <div>{data.workEmail}</div>}
                {data.personalEmail && <div>{data.personalEmail}</div>}
              </div>
            </div>
          )}

          {(data.website1 || data.website2) && (
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Website</div>
              <div className="space-y-1">
                {data.website1 && (
                  <button className="text-sm text-blue-600 flex items-center gap-2" onClick={() => openUrl(data.website1!)}>
                    <Globe className="w-4 h-4" />
                    {data.website1}
                  </button>
                )}
                {data.website2 && (
                  <button className="text-sm text-blue-600 flex items-center gap-2" onClick={() => openUrl(data.website2!)}>
                    <Globe className="w-4 h-4" />
                    {data.website2}
                  </button>
                )}
              </div>
            </div>
          )}

          {(data.homeAddress || data.workAddress) && (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Address</div>
              <div className="space-y-2 text-sm">
                {(data.homeAddress?.street1 || data.homeAddress?.street2 || data.homeAddress?.city || data.homeAddress?.state || data.homeAddress?.zip || data.homeAddress?.countryCode) && (
                  <div>
                    <div className="font-medium">Home</div>
                    <div className="text-muted-foreground">
                      {[data.homeAddress.street1, data.homeAddress.street2].filter(Boolean).join(", ")}
                      <br />
                      {[data.homeAddress.city, data.homeAddress.state, data.homeAddress.zip].filter(Boolean).join(", ")}
                      {data.homeAddress.countryCode ? `, ${data.homeAddress.countryCode}` : ""}
                    </div>
                  </div>
                )}
                {(data.workAddress?.street1 || data.workAddress?.street2 || data.workAddress?.city || data.workAddress?.state || data.workAddress?.zip || data.workAddress?.countryCode) && (
                  <div>
                    <div className="font-medium">Work</div>
                    <div className="text-muted-foreground">
                      {[data.workAddress.street1, data.workAddress.street2].filter(Boolean).join(", ")}
                      <br />
                      {[data.workAddress.city, data.workAddress.state, data.workAddress.zip].filter(Boolean).join(", ")}
                      {data.workAddress.countryCode ? `, ${data.workAddress.countryCode}` : ""}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {(data.telegram || data.whatsapp || data.zalo || data.facebook || data.linkedin) && (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Social Media</div>
              <div className="flex flex-wrap gap-3">
                {data.whatsapp && (
                  <SocialIconButton kind="whatsapp" href={data.whatsapp!} label="WhatsApp" bgClass="bg-emerald-500" />
                )}
                {data.telegram && (
                  <SocialIconButton kind="telegram" href={data.telegram!} label="Telegram" bgClass="bg-sky-500" />
                )}
                {data.zalo && (
                  <SocialIconButton kind="zalo" href={data.zalo!} label="Zalo" bgClass="bg-blue-600" />
                )}
                {data.facebook && (
                  <SocialIconButton kind="facebook" href={data.facebook!} label="Facebook" bgClass="bg-blue-700" />
                )}
                {data.linkedin && (
                  <SocialIconButton kind="linkedin" href={data.linkedin!} label="LinkedIn" bgClass="bg-sky-700" />
                )}
              </div>
            </div>
          )}

          <div className="pt-2 grid grid-cols-1 gap-3">
            <Button
              className="w-full"
              onClick={() => {
                // iOS/Android: mở .vcf thường sẽ hiện màn Add Contact.
                // Dùng download để đảm bảo hoạt động trên nhiều browser.
                downloadVcf(filename, vcardText)
              }}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add Contact
            </Button>
            <Button variant="outline" className="w-full" onClick={() => downloadVcf(filename, vcardText)}>
              Download vCard (.vcf)
            </Button>
          </div>

          {data.notes && (
            <div className="pt-2">
              <div className="text-xs text-muted-foreground">Notes</div>
              <div className="text-sm whitespace-pre-wrap">{data.notes}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

