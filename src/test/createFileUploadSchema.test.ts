/// <reference types="vitest" />
import { describe, test, expect } from "vitest";
/// <reference types="vitest" />

import { createFileUploadSchema } from "@/lib/api/schemas";

describe("createFileUploadSchema()", () => {
  test("acepta body válido", () => {
    const schema = createFileUploadSchema();
    const input = {
      fileName: "a.csv",
      fileType: "text/csv",
      fileSize: 0, 
      visibility: "public",
      displayName: "A",
    };

    expect(schema.parse(input)).toEqual(input);
  });

  test("rechaza fileSize negativo", () => {
    const schema = createFileUploadSchema();
    expect(() =>
      schema.parse({
        fileName: "a.csv",
        fileType: "text/csv",
        fileSize: -1,
        visibility: "private",
      })
    ).toThrow();
  });

  test("rechaza keys extra por strict()", () => {
    const schema = createFileUploadSchema();
    expect(() =>
      schema.parse({
        fileName: "a.csv",
        fileType: "text/csv",
        fileSize: 1,
        visibility: "public",
        extra: "nope",
      })
    ).toThrow();
  });

  test("rechaza visibility > 128 chars", () => {
    const schema = createFileUploadSchema();
    expect(() =>
      schema.parse({
        fileName: "a.csv",
        fileType: "text/csv",
        fileSize: 1,
        visibility: "x".repeat(129),
      })
    ).toThrow();
  });
});
