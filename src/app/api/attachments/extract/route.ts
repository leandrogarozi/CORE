import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_EXTRACT_BYTES = 20 * 1024 * 1024; // 20MB — acima disso não vale a pena extrair texto

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

  const body = await request.json();
  const id: string | undefined = body?.id;
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const { data: row, error: rowError } = await supabase
    .from("attachments")
    .select("*")
    .eq("id", id)
    .single();
  if (rowError || !row) return NextResponse.json({ error: "attachment not found" }, { status: 404 });

  if (row.size_bytes > MAX_EXTRACT_BYTES) {
    return NextResponse.json({ attachment: row });
  }

  const { data: fileData, error: downloadError } = await supabase.storage
    .from("attachments")
    .download(row.file_path);
  if (downloadError || !fileData) {
    return NextResponse.json({ error: downloadError?.message || "download failed" }, { status: 500 });
  }

  let extractedText: string | null = null;
  try {
    const buffer = Buffer.from(await fileData.arrayBuffer());
    if (row.mime_type === "application/pdf") {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      await parser.destroy();
      extractedText = result.text.trim() || null;
    } else if (
      row.mime_type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value.trim() || null;
    }
  } catch (err) {
    console.error("attachments/extract", err);
  }

  const { data: updated, error: updateError } = await supabase
    .from("attachments")
    .update({ extracted_text: extractedText })
    .eq("id", id)
    .select("*")
    .single();
  if (updateError || !updated) {
    return NextResponse.json({ error: updateError?.message || "update failed" }, { status: 500 });
  }

  return NextResponse.json({ attachment: updated });
}
