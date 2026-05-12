export type VCardAddressInput = {
  street1?: string
  street2?: string
  city?: string
  state?: string
  zip?: string
  countryCode?: string
}

export type VCardInput = {
  firstName: string
  lastName: string
  org?: string
  jobTitle?: string
  mobileNumber?: string
  workNumber?: string
  workEmail?: string
  personalEmail?: string
  website1?: string
  website2?: string
  telegram?: string
  whatsapp?: string
  zalo?: string
  facebook?: string
  linkedin?: string
  homeAddress?: VCardAddressInput
  workAddress?: VCardAddressInput
  notes?: string
}

function normalizeLine(value?: string): string | undefined {
  const v = value?.toString().trim()
  return v ? v : undefined
}

function normalizeUrl(value?: string): string | undefined {
  const v = normalizeLine(value)
  if (!v) return undefined
  // Accept both absolute URLs and app-specific schemes (tg:, whatsapp:, etc.)
  return v
}

function buildAdrValue(addr?: VCardAddressInput): string | undefined {
  if (!addr) return undefined
  const street1 = normalizeLine(addr.street1)
  const street2 = normalizeLine(addr.street2)
  const city = normalizeLine(addr.city)
  const state = normalizeLine(addr.state)
  const zip = normalizeLine(addr.zip)
  const countryCode = normalizeLine(addr.countryCode)

  // Thực tế nhiều thiết bị vẫn hiển thị được address dù thiếu vài field.
  // Chỉ bỏ qua nếu tất cả đều trống.
  if (!street1 && !street2 && !city && !state && !zip && !countryCode) return undefined

  const street = [street1, street2].filter(Boolean).join("\\n")
  return `${street};${city ?? ""};${state ?? ""};${zip ?? ""};${countryCode ?? ""}`
}

export function buildVCard(input: VCardInput): string {
  const firstName = normalizeLine(input.firstName) ?? ""
  const lastName = normalizeLine(input.lastName) ?? ""

  const lines: string[] = []
  lines.push("BEGIN:VCARD")
  lines.push("VERSION:4.0")
  lines.push(`N:${lastName};${firstName};`)
  lines.push(`FN:${firstName} ${lastName}`.trim())

  const org = normalizeLine(input.org)
  if (org) lines.push(`ORG:${org};`)

  const mobile = normalizeLine(input.mobileNumber)
  if (mobile) lines.push(`TEL;TYPE=mobile;TYPE=pref:${mobile}`)

  const work = normalizeLine(input.workNumber)
  if (work) lines.push(`TEL;TYPE=work:${work}`)

  const workEmail = normalizeLine(input.workEmail)
  if (workEmail) lines.push(`EMAIL;TYPE=INTERNET;TYPE=WORK:${workEmail}`)

  const personalEmail = normalizeLine(input.personalEmail)
  if (personalEmail) lines.push(`EMAIL;TYPE=INTERNET;TYPE=HOME:${personalEmail}`)

  const homeAdr = buildAdrValue(input.homeAddress)
  if (homeAdr) lines.push(`ADR;TYPE=HOME:;;${homeAdr}`)

  const workAdr = buildAdrValue(input.workAddress)
  if (workAdr) lines.push(`ADR;TYPE=WORK:;;${workAdr}`)

  const title = normalizeLine(input.jobTitle)
  if (title) lines.push(`TITLE:${title}`)

  const url1 = normalizeLine(input.website1)
  if (url1) lines.push(`URL:${url1}`)

  const url2 = normalizeLine(input.website2)
  if (url2) lines.push(`URL:${url2}`)

  const telegram = normalizeUrl(input.telegram)
  if (telegram) {
    lines.push(`IMPP;X-SERVICE-TYPE=telegram:${telegram}`)
    lines.push(`X-SOCIALPROFILE;type=telegram:${telegram}`)
  }

  const whatsapp = normalizeUrl(input.whatsapp)
  if (whatsapp) {
    lines.push(`IMPP;X-SERVICE-TYPE=whatsapp:${whatsapp}`)
    lines.push(`X-SOCIALPROFILE;type=whatsapp:${whatsapp}`)
  }

  const zalo = normalizeUrl(input.zalo)
  if (zalo) {
    // Không có chuẩn vCard chính thức cho Zalo, dùng SOCIALPROFILE custom
    lines.push(`X-SOCIALPROFILE;type=zalo:${zalo}`)
  }

  const facebook = normalizeUrl(input.facebook)
  if (facebook) lines.push(`X-SOCIALPROFILE;type=facebook:${facebook}`)

  const linkedin = normalizeUrl(input.linkedin)
  if (linkedin) lines.push(`X-SOCIALPROFILE;type=linkedin:${linkedin}`)

  const notes = normalizeLine(input.notes)
  if (notes) lines.push(`NOTE:${notes.replace(/\n/g, "\\n")}`)

  lines.push("END:VCARD")
  return lines.join("\n")
}

