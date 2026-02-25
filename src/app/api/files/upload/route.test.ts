/// <reference types="vitest" />
import { describe, test, expect, beforeEach, vi } from "vitest";
import { POST } from "@/app/api/files/upload/route";
import { NextResponse } from "next/server";

import { requireServerAuth } from "@/lib/serverAuth";
import { prepareFileUpload } from "@/data/files";
import { parseJson } from "@/lib/api/validation";
import { createFileUploadSchema } from "@/lib/api/schemas";
import { handleApiError } from "@/lib/api/errorHandler";

vi.mock("@/lib/serverAuth", () => ({ requireServerAuth: vi.fn() }));
vi.mock("@/data/files", () => ({ prepareFileUpload: vi.fn() }));
vi.mock("@/lib/api/validation", () => ({ parseJson: vi.fn() }));
vi.mock("@/lib/api/schemas", () => ({ createFileUploadSchema: vi.fn() }));
vi.mock("@/lib/api/errorHandler", () => ({ handleApiError: vi.fn() }));

describe("POST /api/files/upload", () => {
  const MAX_FILE_SIZE_MB = 50;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

  beforeEach(() => {
    vi.clearAllMocks();
    (createFileUploadSchema as ReturnType<typeof vi.fn>).mockReturnValue({ schema: "x" });
  });

  test("200: retorna signedUrl, fileId, filePath", async () => {
    (requireServerAuth as ReturnType<typeof vi.fn>).mockResolvedValue({ uid: "user_123" });

    const body = {
      fileName: "data.csv",
      fileType: "text/csv",
      fileSize: 123,
      visibility: "private",
      displayName: "Datos",
    };
    (parseJson as ReturnType<typeof vi.fn>).mockResolvedValue(body);

    (prepareFileUpload as ReturnType<typeof vi.fn>).mockResolvedValue({
      signedUrl: "https://signed.url",
      fileId: "id123",
      filePath: "files/user_123/id123/data.csv",
    });

    const req = new Request("http://localhost/api/files/upload", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toEqual({
      signedUrl: "https://signed.url",
      fileId: "id123",
      filePath: "files/user_123/id123/data.csv",
    });

    expect(requireServerAuth).toHaveBeenCalledTimes(1);
    expect(createFileUploadSchema).toHaveBeenCalledTimes(1);
    expect(parseJson).toHaveBeenCalledTimes(1);
    expect(parseJson).toHaveBeenCalledWith(req, { schema: "x" });

    expect(prepareFileUpload).toHaveBeenCalledTimes(1);
    expect(prepareFileUpload).toHaveBeenCalledWith({
      ...body,
      user: { uid: "user_123" },
    });
  });

  test("413: fileSize > 50MB responde 413 y no llama prepareFileUpload", async () => {
    (requireServerAuth as ReturnType<typeof vi.fn>).mockResolvedValue({ uid: "user_123" });

    (parseJson as ReturnType<typeof vi.fn>).mockResolvedValue({
      fileName: "big.bin",
      fileType: "application/octet-stream",
      fileSize: MAX_FILE_SIZE_BYTES + 1,
      visibility: "public",
      displayName: "Big",
    });

    const req = new Request("http://localhost/api/files/upload", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(413);

    const json = await res.json();
    expect(json).toEqual({ error: `File size exceeds ${MAX_FILE_SIZE_MB}MB.` });

    expect(prepareFileUpload).not.toHaveBeenCalled();
  });

  test("error: si requireServerAuth falla, usa handleApiError", async () => {
    const err = new Error("Unauthorized");
    (requireServerAuth as ReturnType<typeof vi.fn>).mockRejectedValue(err);

    const handled = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    (handleApiError as ReturnType<typeof vi.fn>).mockReturnValue(handled);

    const req = new Request("http://localhost/api/files/upload", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    expect(handleApiError).toHaveBeenCalledWith(err);
    expect(res.status).toBe(401);
  });

  test("error: si parseJson falla (schema), usa handleApiError", async () => {
    (requireServerAuth as ReturnType<typeof vi.fn>).mockResolvedValue({ uid: "user_123" });

    const err = new Error("Invalid body");
    (parseJson as ReturnType<typeof vi.fn>).mockRejectedValue(err);

    const handled = NextResponse.json({ error: "Invalid body" }, { status: 400 });
    (handleApiError as ReturnType<typeof vi.fn>).mockReturnValue(handled);

    const req = new Request("http://localhost/api/files/upload", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    expect(handleApiError).toHaveBeenCalledWith(err);
    expect(prepareFileUpload).not.toHaveBeenCalled();
    expect(res.status).toBe(400);
  });

  test("error: si prepareFileUpload falla, usa handleApiError", async () => {
    (requireServerAuth as ReturnType<typeof vi.fn>).mockResolvedValue({ uid: "user_123" });

    (parseJson as ReturnType<typeof vi.fn>).mockResolvedValue({
      fileName: "x.csv",
      fileType: "text/csv",
      fileSize: 10,
      visibility: "team_abc",
      displayName: "X",
    });

    const err = new Error("User does not have permission to share with this team.");
    (prepareFileUpload as ReturnType<typeof vi.fn>).mockRejectedValue(err);

    const handled = NextResponse.json({ error: err.message }, { status: 403 });
    (handleApiError as ReturnType<typeof vi.fn>).mockReturnValue(handled);

    const req = new Request("http://localhost/api/files/upload", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    expect(handleApiError).toHaveBeenCalledWith(err);
    expect(res.status).toBe(403);
  });
});
