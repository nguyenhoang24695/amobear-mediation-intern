"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ImageIcon, Smartphone, Info, AlertTriangle, CheckCircle2 } from "lucide-react"
import type { RequestFormState } from "./create-request-content"

const ctaOptions = [
  "LEARN_MORE", "SHOP_NOW", "DOWNLOAD", "INSTALL_MOBILE_APP", "USE_MOBILE_APP",
  "SIGN_UP", "GET_OFFER", "BOOK_TRAVEL", "CONTACT_US", "WATCH_MORE"
]

interface Props {
  form: RequestFormState
  onChange: (patch: Partial<RequestFormState>) => void
}

export function CreativeSection({ form, onChange }: Props) {
  // Track required creative fields for inline validation
  const hasPageId = !!form.facebookPageId
  const hasPrimaryText = !!form.primaryText
  const hasHeadline = !!form.headline
  const hasCTA = !!form.callToAction
  const hasImage = !!(form.imageHash || form.imageUrl)
  const allRequired = hasPageId && hasPrimaryText && hasHeadline && hasCTA && hasImage

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-slate-500" />
            Creative — Single Creative
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-300 font-mono px-2 py-0.5">
              → object_story_spec
            </Badge>
            {allRequired ? (
              <Badge className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 gap-1">
                <CheckCircle2 className="w-2.5 h-2.5" />
                Complete
              </Badge>
            ) : (
              <Badge className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 gap-1">
                <AlertTriangle className="w-2.5 h-2.5" />
                Incomplete
              </Badge>
            )}
          </div>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">
          This will be transformed into a Meta <code className="bg-slate-100 px-1 rounded">object_story_spec</code>. Incomplete fields may cause Meta API rejection during execution.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-[1fr_200px] gap-6">
          {/* Left: fields */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Creative Name <span className="text-red-500">*</span></Label>
                <Input placeholder="e.g. WeatherApp_US_IMG_v1" className="h-9 text-sm" value={form.creativeName} onChange={e => onChange({ creativeName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">
                  Facebook Page ID <span className="text-red-500">*</span>
                  {!hasPageId && <span className="ml-1 text-amber-600 font-normal text-[10px]">Required</span>}
                </Label>
                <Input
                  placeholder="e.g. 123456789012345"
                  className={`h-9 text-sm ${!hasPageId && form.creativeName ? "border-amber-400" : ""}`}
                  value={form.facebookPageId}
                  onChange={e => onChange({ facebookPageId: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Instagram Actor ID <span className="text-slate-400 font-normal">(optional)</span></Label>
              <Input placeholder="e.g. 987654321" className="h-9 text-sm" value={form.instagramActorId} onChange={e => onChange({ instagramActorId: e.target.value })} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">
                Primary Text <span className="text-red-500">*</span>
                {!hasPrimaryText && <span className="ml-1 text-amber-600 font-normal text-[10px]">Required</span>}
              </Label>
              <Textarea
                placeholder="Write your ad copy here..."
                className={`text-sm resize-none ${!hasPrimaryText && form.creativeName ? "border-amber-400" : ""}`}
                rows={2}
                value={form.primaryText}
                onChange={e => onChange({ primaryText: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">
                  Headline <span className="text-red-500">*</span>
                  {!hasHeadline && <span className="ml-1 text-amber-600 font-normal text-[10px]">Required</span>}
                </Label>
                <Input
                  placeholder="e.g. Download Free Today"
                  className={`h-9 text-sm ${!hasHeadline && form.creativeName ? "border-amber-400" : ""}`}
                  value={form.headline}
                  onChange={e => onChange({ headline: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Description <span className="text-slate-400 font-normal">(optional)</span></Label>
                <Input placeholder="Short description..." className="h-9 text-sm" value={form.description} onChange={e => onChange({ description: e.target.value })} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Call To Action <span className="text-red-500">*</span></Label>
              <Select value={form.callToAction} onValueChange={v => onChange({ callToAction: v })}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ctaOptions.map(c => (
                    <SelectItem key={c} value={c}><span className="font-mono text-xs">{c}</span></SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Image — required */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-700">
                Image <span className="text-red-500">*</span>
                {!hasImage && <span className="ml-1 text-amber-600 font-normal text-[10px]">At least one required</span>}
              </Label>
              <div className={`grid grid-cols-2 gap-4 ${!hasImage && form.creativeName ? "ring-1 ring-amber-300 rounded-lg p-2" : ""}`}>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-500">Image Hash (Meta)</Label>
                  <Input
                    placeholder="Meta image hash"
                    className="h-9 text-sm font-mono"
                    value={form.imageHash}
                    onChange={e => onChange({ imageHash: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-500">Image URL</Label>
                  <Input
                    placeholder="https://..."
                    className="h-9 text-sm"
                    value={form.imageUrl}
                    onChange={e => onChange({ imageUrl: e.target.value })}
                  />
                </div>
              </div>
              {hasImage ? (
                <p className="flex items-center gap-1.5 text-[11px] text-green-700">
                  <CheckCircle2 className="w-3 h-3" />
                  Image provided
                </p>
              ) : (
                <p className="flex items-start gap-1.5 text-[11px] text-amber-700">
                  <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  Image Hash or Image URL is required. Missing image will cause Meta API rejection.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Link URL</Label>
              <Input placeholder="https://..." className="h-9 text-sm" value={form.linkUrl} onChange={e => onChange({ linkUrl: e.target.value })} />
              <p className="text-[11px] text-slate-400">If empty, backend may fall back to app mapping store URL.</p>
            </div>

            {/* Required fields summary */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-2">Required Fields (object_story_spec)</p>
              <div className="grid grid-cols-2 gap-1">
                {[
                  { label: "Page ID", ok: hasPageId },
                  { label: "Primary Text", ok: hasPrimaryText },
                  { label: "Headline", ok: hasHeadline },
                  { label: "CTA", ok: hasCTA },
                  { label: "Image", ok: hasImage },
                ].map(({ label, ok }) => (
                  <div key={label} className={`flex items-center gap-1.5 text-[11px] ${ok ? "text-green-700" : "text-slate-400"}`}>
                    <CheckCircle2 className={`w-3 h-3 ${ok ? "text-green-600" : "text-slate-300"}`} />
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: phone preview */}
          <div className="flex flex-col items-center">
            <p className="text-[11px] text-slate-400 mb-2 font-medium uppercase tracking-wide">Preview</p>
            <div className="w-44 rounded-2xl border-2 border-slate-300 bg-white shadow-sm overflow-hidden">
              <div className="bg-slate-100 px-3 py-1.5 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              </div>
              <div className="p-2 space-y-1.5">
                <div className="w-full h-20 bg-slate-100 rounded flex items-center justify-center border border-slate-200">
                  {form.imageUrl ? (
                    <img src={form.imageUrl} alt="Ad preview" className="w-full h-full object-cover rounded" crossOrigin="anonymous" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-slate-300" />
                  )}
                </div>
                <div className="space-y-0.5">
                  {form.headline && <p className="text-[10px] font-semibold text-slate-900 leading-tight line-clamp-2">{form.headline}</p>}
                  {form.primaryText && <p className="text-[9px] text-slate-500 leading-tight line-clamp-2">{form.primaryText}</p>}
                </div>
                <div className="pt-0.5">
                  <div className="bg-blue-600 rounded text-center py-1">
                    <span className="text-[9px] text-white font-semibold">{form.callToAction.replace(/_/g, " ")}</span>
                  </div>
                </div>
                <p className="text-[8px] text-slate-400">Sponsored</p>
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-400">
              <Smartphone className="w-3 h-3" />
              <span>Preview only</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
