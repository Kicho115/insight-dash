export type FileStatus = "Uploaded" | "Processing" | "Ready" | "Error";

export type File = {
    id: string;
    name: string;
    displayName: string;
    url: string;
    createdAt: Date;
    updatedAt: Date;
    isPublic: boolean;
    creatorId: string;
    path: string;
    size: number;
    permissions: {
        [userId: string]: "admin" | "edit" | "view";
    };
    teamIds?: string[];
    isLocked: boolean; // To prevent deletion while other users are using it
    status: FileStatus;
    metadata?: ExcelMetadata | CsvMetadata; // File has metadata after processing
};

export type ExcelMetadata = {
    summary: string;
    headers: string[];
    sheets: SheetInfo[];
};
export interface SheetInfo {
    name: string;
    numberOfRows: number;
    numberOfColumns: number;
}

export type CsvMetadata = {
    summary: string;
    headers: string[];
    numberOfRows: number;
};
