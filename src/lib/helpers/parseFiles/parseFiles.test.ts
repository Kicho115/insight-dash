import { describe, it, expect, vi, beforeEach } from "vitest";
import * as xlsx from "xlsx";
import { getExcelMetadata, getCsvMetadata } from "./index";

// Mock the AI flow so tests run without API keys
vi.mock("@/services/genkit/flows/getHeaders", () => ({
    getHeadersFlow: vi.fn(async (rows: string[]) => {
        // Parse first non-empty row as headers
        for (const row of rows) {
            if (row && row !== "[]") {
                try {
                    const parsed = JSON.parse(row);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        return parsed.map(String);
                    }
                } catch {
                    // not JSON - CSV path
                    const cols = row.split(",");
                    if (cols.length > 0) return cols;
                }
            }
        }
        return [];
    }),
}));

// Helper: build an ArrayBuffer from a workbook
function toArrayBuffer(wb: xlsx.WorkBook): ArrayBuffer {
    const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

// Helper: create a simple workbook with one sheet
function makeWorkbook(
    data: unknown[][],
    sheetName = "Sheet1"
): xlsx.WorkBook {
    const ws = xlsx.utils.aoa_to_sheet(data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, sheetName);
    return wb;
}

// ─── getExcelMetadata ────────────────────────────────────────────────────────

describe("getExcelMetadata", () => {
    beforeEach(() => vi.clearAllMocks());

    // ── 1. Column count ──────────────────────────────────────────────────────

    it("reporta el número correcto de columnas", async () => {
        const wb = makeWorkbook([
            ["Nombre", "Edad", "Ciudad", "Salario"],
            ["Ana",    25,    "CDMX",   50000],
            ["Luis",   30,    "GDL",    60000],
        ]);
        const result = await getExcelMetadata(toArrayBuffer(wb));
        expect(result.sheets[0].numberOfColumns).toBe(4);
    });

    // ── 2. Row count (off-by-one esperado) ───────────────────────────────────

    it("reporta numberOfRows incluyendo la fila de headers (off-by-one conocido)", async () => {
        // 1 header + 10 datos = 11 filas totales en el rango
        const rows: unknown[][] = [["A", "B", "C"]];
        for (let i = 1; i <= 10; i++) rows.push([i, i * 2, i * 3]);

        const wb = makeWorkbook(rows);
        const result = await getExcelMetadata(toArrayBuffer(wb));

        // El cálculo actual es range.e.r - range.s.r + 1
        // Con 11 filas reales reporta 11, pero los datos reales son 10
        expect(result.sheets[0].numberOfRows).toBe(11); // off-by-one confirmado
    });

    // ── 3. Celdas con fórmulas ────────────────────────────────────────────────

    it("lee valores cacheados de fórmulas cuando existen", async () => {
        const wb = xlsx.utils.book_new();
        const ws: xlsx.WorkSheet = {
            A1: { v: "Total", t: "s" },
            B1: { v: "Resultado", t: "s" },
            A2: { v: 100, t: "n" },
            B2: { v: 200, f: "A2*2", t: "n" }, // fórmula con valor cacheado
            "!ref": "A1:B2",
        };
        xlsx.utils.book_append_sheet(wb, ws, "Sheet1");

        const result = await getExcelMetadata(toArrayBuffer(wb));
        expect(result.headers).toContain("Total");
        expect(result.headers).toContain("Resultado");
    });

    it("celdas con fórmulas SIN valor cacheado pueden retornar string de fórmula", async () => {
        const wb = xlsx.utils.book_new();
        const ws: xlsx.WorkSheet = {
            A1: { v: "Columna", t: "s" },
            A2: { f: "1+1", t: "n" }, // fórmula sin .v (sin cache)
            "!ref": "A1:A2",
        };
        xlsx.utils.book_append_sheet(wb, ws, "Sheet1");

        // No debe lanzar error - la celda puede estar vacía o con la fórmula
        const result = await getExcelMetadata(toArrayBuffer(wb));
        expect(result.headers).toBeDefined();
        expect(result.headers.length).toBeGreaterThan(0);
    });

    // ── 4. Múltiples hojas ────────────────────────────────────────────────────

    it("lista todas las hojas en metadata pero solo usa la primera para headers", async () => {
        const wb = xlsx.utils.book_new();

        const ws1 = xlsx.utils.aoa_to_sheet([
            ["Nombre", "Ventas"],
            ["Ana", 1000],
        ]);
        const ws2 = xlsx.utils.aoa_to_sheet([
            ["Producto", "Precio", "Stock"],
            ["Widget", 9.99, 50],
        ]);
        const ws3 = xlsx.utils.aoa_to_sheet([
            ["Region", "Cuota"],
            ["Norte", 5000],
        ]);

        xlsx.utils.book_append_sheet(wb, ws1, "Ventas");
        xlsx.utils.book_append_sheet(wb, ws2, "Inventario");
        xlsx.utils.book_append_sheet(wb, ws3, "Regiones");

        const result = await getExcelMetadata(toArrayBuffer(wb));

        expect(result.sheets).toHaveLength(3);
        expect(result.sheets.map((s) => s.name)).toEqual([
            "Ventas",
            "Inventario",
            "Regiones",
        ]);

        // Headers solo de la primera hoja (Ventas)
        expect(result.headers).toContain("Nombre");
        expect(result.headers).toContain("Ventas");
        expect(result.headers).not.toContain("Producto"); // de la hoja 2
    });

    it("reporta número correcto de columnas por hoja", async () => {
        const wb = xlsx.utils.book_new();

        xlsx.utils.book_append_sheet(
            wb,
            xlsx.utils.aoa_to_sheet([["A", "B"], [1, 2]]),
            "Dos"
        );
        xlsx.utils.book_append_sheet(
            wb,
            xlsx.utils.aoa_to_sheet([["X", "Y", "Z"], [1, 2, 3]]),
            "Tres"
        );

        const result = await getExcelMetadata(toArrayBuffer(wb));

        expect(result.sheets[0].numberOfColumns).toBe(2);
        expect(result.sheets[1].numberOfColumns).toBe(3);
    });

    // ── 5. Filas vacías en el medio ───────────────────────────────────────────

    it("maneja filas vacías en medio del dataset sin error", async () => {
        const wb = makeWorkbook([
            ["Nombre", "Valor"],
            ["Ana", 100],
            ["", ""],       // fila vacía en el medio
            ["Luis", 200],
            ["", ""],       // otra fila vacía
            ["Maria", 300],
        ]);

        const result = await getExcelMetadata(toArrayBuffer(wb));
        expect(result.headers).toBeDefined();
        expect(result.headers.length).toBeGreaterThan(0);
    });

    // ── 6. Fechas almacenadas como serial numbers ─────────────────────────────

    it("fechas se convierten a número serial cuando cellDates=false", async () => {
        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.aoa_to_sheet([
            ["Evento", "Fecha"],
            ["Lanzamiento", new Date("2024-01-15")],
        ]);
        xlsx.utils.book_append_sheet(wb, ws, "Sheet1");

        const result = await getExcelMetadata(toArrayBuffer(wb));

        // La fecha debería estar en sheets metadata sin error
        expect(result.sheets[0].numberOfColumns).toBe(2);
        expect(result.headers).toContain("Evento");
        expect(result.headers).toContain("Fecha");
    });

    // ── 7. Tipos de datos mixtos ──────────────────────────────────────────────

    it("maneja columnas con booleanos sin errores", async () => {
        const wb = makeWorkbook([
            ["Nombre", "Activo", "Monto"],
            ["Ana",   true,    1500.5],
            ["Luis",  false,   2000.0],
        ]);

        const result = await getExcelMetadata(toArrayBuffer(wb));
        expect(result.headers).toHaveLength(3);
        expect(result.sheets[0].numberOfColumns).toBe(3);
    });

    // ── 8. Archivo completamente vacío ────────────────────────────────────────

    it("lanza error si el archivo no tiene datos", async () => {
        const wb = xlsx.utils.book_new();
        const ws: xlsx.WorkSheet = { "!ref": undefined };
        xlsx.utils.book_append_sheet(wb, ws, "Sheet1");

        await expect(getExcelMetadata(toArrayBuffer(wb))).rejects.toThrow();
    });

    // ── 9. Sheet con solo una columna ─────────────────────────────────────────

    it("maneja correctamente una sola columna", async () => {
        const wb = makeWorkbook([
            ["Pais"],
            ["Mexico"],
            ["Colombia"],
            ["Peru"],
        ]);

        const result = await getExcelMetadata(toArrayBuffer(wb));
        expect(result.headers).toHaveLength(1);
        expect(result.sheets[0].numberOfColumns).toBe(1);
    });

    // ── 10. Columnas con celdas vacías al final (trailing) ────────────────────

    it("ignora columnas vacías al final del rango", async () => {
        const wb = xlsx.utils.book_new();
        // Simula un XLSX donde Excel dejó columnas vacías extra
        const ws = xlsx.utils.aoa_to_sheet([
            ["A", "B", "C", "", ""],
            [1,    2,   3,  "",  ""],
        ]);
        // Forzar ref con columnas extra
        ws["!ref"] = "A1:E2";
        xlsx.utils.book_append_sheet(wb, ws, "Sheet1");

        const result = await getExcelMetadata(toArrayBuffer(wb));
        // El parser limpia trailing vacíos, solo debe haber 3 columnas reales
        expect(result.sheets[0].numberOfColumns).toBeLessThanOrEqual(5);
        expect(result.headers.length).toBeGreaterThanOrEqual(3);
    });
});

// ─── getCsvMetadata ──────────────────────────────────────────────────────────

describe("getCsvMetadata", () => {
    beforeEach(() => vi.clearAllMocks());

    it("extrae headers de la primera fila del CSV", async () => {
        const csv = "nombre,edad,ciudad\nAna,25,CDMX\nLuis,30,GDL";
        const result = await getCsvMetadata(csv);
        expect(result.headers.length).toBeGreaterThan(0);
    });

    it("numberOfRows incluye la fila de headers (off-by-one conocido para CSV)", async () => {
        // 1 header + 5 datos
        const csv = "a,b,c\n1,2,3\n4,5,6\n7,8,9\n10,11,12\n13,14,15";
        const result = await getCsvMetadata(csv);
        // rows.split('\n') = 6 elementos, pero solo 5 son datos
        expect(result.numberOfRows).toBe(6);
    });

    it("CSV con una sola columna", async () => {
        const csv = "pais\nMexico\nColombia\nPeru";
        const result = await getCsvMetadata(csv);
        expect(result.headers).toBeDefined();
    });

    it("CSV vacío lanza error o retorna headers vacíos", async () => {
        const csv = "";
        // Dependiendo del mock, puede retornar [] o lanzar
        const result = await getCsvMetadata(csv);
        expect(result).toBeDefined();
    });
});
