import type { Metadata } from "next"
import { HelpUploadedDocViewer } from "@/components/help/help-uploaded-doc-viewer"

export const metadata: Metadata = {
  title: "Tài liệu — Help",
}

export default async function HelpUploadedDocPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <HelpUploadedDocViewer docId={id} />
}
