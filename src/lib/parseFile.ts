"use server";

import { getFileDownloadURL } from "@/data/storage/files";

export async function parseFile(filePath: string): Promise<string> {
    try {
        // Obtener la URL firmada del archivo en Firebase
        const downloadUrl = await getFileDownloadURL(filePath);

        // Descargar el contenido del archivo
        const response = await fetch(downloadUrl);

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const data = await response.text();
        const headers = data.split("\n")[0].split(",");
        console.log("File headers:", headers);
        return data;
    } catch (error) {
        console.error(
            `Error reading file from Firebase Storage "${filePath}":`,
            error
        );
        throw error;
    }
}
