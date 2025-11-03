"use client";

import { useState, ChangeEvent, FormEvent, useEffect } from "react";
// Adjust the import to match the actual export from useFirebaseAuth
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { useRouter } from "next/navigation";
import { uploadFile } from "@/services/files";
import styles from "./styles.module.css";
import {
    IoCloudUploadOutline,
    IoCheckmarkCircle,
    IoWarning,
    IoDocumentTextOutline,
    IoGlobe,
    IoLockClosed,
    IoPeople,
} from "react-icons/io5";
import { useTeams } from "@/context/TeamsProvider";

const ALLOWED_FILE_TYPES = [
    "text/csv",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

interface UploadFormProps {
    onUploadSuccess: () => void;
}

export const UploadForm = ({ onUploadSuccess }: UploadFormProps) => {
    const router = useRouter();
    const { user } = useFirebaseAuth();
    const { teams, isLoading: isLoadingTeams } = useTeams();

    const [file, setFile] = useState<File | null>(null);
    const [displayName, setDisplayName] = useState("");
    const [visibility, setVisibility] = useState<string>("private");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Effect to auto-populate the display name when a file is selected
    useEffect(() => {
        if (file) {
            // Remove the file extension for a cleaner default alias
            const nameWithoutExtension = file.name
                .split(".")
                .slice(0, -1)
                .join(".");
            setDisplayName(nameWithoutExtension || file.name);
        }
    }, [file]);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        setError(null);
        setSuccess(null);
        setDisplayName("");
        const selectedFile = e.target.files?.[0];

        if (selectedFile) {
            if (!ALLOWED_FILE_TYPES.includes(selectedFile.type)) {
                setError("Error: Only .csv or .xlsx files are allowed.");
                setFile(null);
                return;
            }
            // Check file size
            if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
                setError(
                    `Error: File size cannot exceed ${MAX_FILE_SIZE_MB}MB.`
                );
                setFile(null);
                return;
            }
            setFile(selectedFile);
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!file) {
            setError("Please select a file to upload.");
            return;
        }
        if (!displayName.trim()) {
            setError("Please provide a display name for the file.");
            return;
        }
        if (!user) {
            setError("You must be logged in to upload files.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setSuccess(null);

        // Call our secure upload function
        const result = await uploadFile({
            file,
            user,
            visibility: visibility,
            displayName: displayName.trim(),
        });

        setIsLoading(false);

        if (result.success) {
            setSuccess(`Success! "${displayName.trim()}" has been uploaded.`);
            router.refresh();

            setTimeout(() => {
                onUploadSuccess(); // Call the function passed from the layout to close the modal
                // Reset form for the next time it opens
                setFile(null);
                setSuccess(null);
                setVisibility("private");
            }, 1500);
        } else {
            setError(
                `Upload failed: ${result.error?.message || "Please try again."}`
            );
        }
    };

    return (
        <div className={styles.container}>
            <h2 className={styles.title}>Upload New Data File</h2>
            <p className={styles.subtitle}>
                Upload a CSV or Excel file for analysis.
            </p>

            <form onSubmit={handleSubmit} noValidate>
                {/* File Input Area */}
                <div className={styles.fileInputWrapper}>
                    <IoCloudUploadOutline className={styles.uploadIcon} />
                    <input
                        type="file"
                        id="file-upload"
                        className={styles.fileInput}
                        onChange={handleFileChange}
                        accept=".csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    />
                    <label
                        htmlFor="file-upload"
                        className={styles.fileInputLabel}
                    >
                        {file ? file.name : "Select or drag a file"}
                    </label>
                </div>

                {/* Section for file details, appears with a smooth transition */}
                <div
                    className={`${styles.detailsSection} ${
                        file ? styles.detailsVisible : ""
                    }`}
                >
                    {/* Display Name Input */}
                    <div>
                        <label
                            htmlFor="displayName"
                            className={styles.inputLabel}
                        >
                            Display Name
                        </label>
                        <div className={styles.inputWrapper}>
                            <IoDocumentTextOutline
                                className={styles.inputIcon}
                            />
                            <input
                                id="displayName"
                                type="text"
                                placeholder="e.g., Sells Report Q3"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                className={styles.input}
                                required
                            />
                        </div>
                    </div>

                    {/* --- NEW: Visibility Selector --- */}
                    <div>
                        <label
                            htmlFor="visibility"
                            className={styles.inputLabel}
                        >
                            File Visibility
                        </label>
                        <div className={styles.inputWrapper}>
                            {/* Show an icon based on selection */}
                            <div className={styles.inputIcon}>
                                {visibility === "public" ? (
                                    <IoGlobe />
                                ) : visibility === "private" ? (
                                    <IoLockClosed />
                                ) : (
                                    <IoPeople />
                                )}
                            </div>
                            <select
                                id="visibility"
                                className={styles.selectInput}
                                value={visibility}
                                onChange={(e) => setVisibility(e.target.value)}
                                disabled={isLoadingTeams || isLoading}
                            >
                                <option value="private">
                                    Private (Only You)
                                </option>
                                <option value="public">
                                    Public (Everyone)
                                </option>
                                {!isLoadingTeams && teams.length > 0 && (
                                    <optgroup label="Your Teams">
                                        {teams.map((team) => (
                                            <option
                                                key={team.id}
                                                value={team.id}
                                            >
                                                {team.name}
                                            </option>
                                        ))}
                                    </optgroup>
                                )}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    className={styles.submitButton}
                    disabled={isLoading || !file}
                >
                    {isLoading ? "Uploading..." : "Upload File"}
                </button>
            </form>

            {/* Status Messages */}
            {error && (
                <div className={`${styles.message} ${styles.error}`}>
                    <IoWarning /> {error}
                </div>
            )}
            {success && (
                <div className={`${styles.message} ${styles.success}`}>
                    <IoCheckmarkCircle /> {success}
                </div>
            )}
        </div>
    );
};
