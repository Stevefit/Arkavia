import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { isAdminRequest, unauthorized } from "@/lib/auth";
import { MAX_MUSIC_FILE_SIZE, MUSIC_BLOB_PREFIX } from "@/lib/music-upload";

export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return unauthorized();
  if (!process.env.BLOB_READ_WRITE_TOKEN) return Response.json({ error: "Vercel Blob belum dikonfigurasi." }, { status: 503 });

  try {
    const body = (await request.json()) as HandleUploadBody;
    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith(MUSIC_BLOB_PREFIX)) throw new Error("Lokasi unggahan audio tidak valid.");
        return {
          allowedContentTypes: ["audio/*"],
          maximumSizeInBytes: MAX_MUSIC_FILE_SIZE,
          addRandomSuffix: true,
        };
      },
    });
    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unggahan audio gagal." },
      { status: 400 },
    );
  }
}
