import type { Env } from "../types";
import { jsonResponse, errorResponse } from "../middleware/error-handler";
import { authenticate } from "../middleware/auth";

export async function uploadFile(request: Request, env: Env): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;

  const contentType = request.headers.get("Content-Type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return errorResponse("Expected multipart/form-data", 400, request);
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || typeof file === "string") {
    return errorResponse("No file provided", 400, request);
  }

  const blob = file as unknown as { size: number; type: string; name: string; arrayBuffer(): Promise<ArrayBuffer> };

  if (blob.size > 5 * 1024 * 1024) {
    return errorResponse("File too large (max 5MB)", 400, request);
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(blob.type)) {
    return errorResponse("Only JPEG, PNG, and WebP images are allowed", 400, request);
  }

  const ext = blob.name.split(".").pop() ?? "jpg";
  const key = `photos/${crypto.randomUUID()}.${ext}`;

  await env.R2.put(key, await blob.arrayBuffer(), {
    httpMetadata: { contentType: blob.type },
  });

  return jsonResponse({ url: key }, 201, request);
}
