function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export async function exportChartContainerAsPng(
  container: HTMLElement,
  filename: string,
): Promise<boolean> {
  const svg = container.querySelector("svg.recharts-surface") ?? container.querySelector("svg")
  if (!svg) return false

  const rect = svg.getBoundingClientRect()
  const width = Math.max(Math.round(rect.width), 1)
  const height = Math.max(Math.round(rect.height), 1)

  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute("width", String(width))
  clone.setAttribute("height", String(height))
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg")

  const svgData = new XMLSerializer().serializeToString(clone)
  const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" })
  const domUrl = URL.createObjectURL(svgBlob)

  try {
    await new Promise<void>((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        canvas.width = width * 2
        canvas.height = height * 2
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          reject(new Error("Canvas unavailable"))
          return
        }
        ctx.scale(2, 2)
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(0, 0, width, height)
        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("PNG export failed"))
            return
          }
          triggerDownload(blob, filename.endsWith(".png") ? filename : `${filename}.png`)
          resolve()
        }, "image/png")
      }
      img.onerror = () => reject(new Error("SVG render failed"))
      img.src = domUrl
    })
    return true
  } finally {
    URL.revokeObjectURL(domUrl)
  }
}

export function exportRowsAsCsv(
  rows: Record<string, string | number | null>[],
  columns: { id: string; label: string }[],
  filename: string,
) {
  if (rows.length === 0) return

  const escape = (value: string | number | null | undefined) => {
    const text = value == null ? "" : String(value)
    if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
    return text
  }

  const header = columns.map((c) => escape(c.label)).join(",")
  const body = rows
    .map((row) => columns.map((c) => escape(row[c.id] ?? "")).join(","))
    .join("\n")

  triggerDownload(
    new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8" }),
    filename.endsWith(".csv") ? filename : `${filename}.csv`,
  )
}
