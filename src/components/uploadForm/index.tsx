"use client";

import { useState, ChangeEvent, FormEvent } from "react";
// Adjust the import to match the actual export from useFirebaseAuth
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { uploadFile } from "@/services/files";
import styles from "./styles.module.css";
import {
  IoCloudUploadOutline,
  IoCheckmarkCircle,
  IoWarning,
} from "react-icons/io5";

const ALLOWED_FILE_TYPES = [
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

export const UploadForm = () => {
  const { user } = useFirebaseAuth();
  const [file, setFile] = useState<File | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccess(null);
    const selectedFile = e.target.files?.[0];

    if (selectedFile) {
      if (!ALLOWED_FILE_TYPES.includes(selectedFile.type)) {
        setError("Error: Only .csv or .xlsx files are allowed.");
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
    if (!user) {
      setError("You must be logged in to upload files.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    // Call our new, secure upload function
    const result = await uploadFile({
      file,
      user,
      isPublic,
    });

    setIsLoading(false);

    if (result.success) {
      setSuccess(`File "${file.name}" uploaded successfully!`);
      setFile(null);
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

      <form onSubmit={handleSubmit}>
        <div className={styles.fileInputWrapper}>
          <IoCloudUploadOutline className={styles.uploadIcon} />
          <input
            type="file"
            id="file-upload"
            className={styles.fileInput}
            onChange={handleFileChange}
            accept=".csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          />
          <label htmlFor="file-upload" className={styles.fileInputLabel}>
            {file ? file.name : "Select or drag a file"}
          </label>
        </div>

        <div className={styles.toggleWrapper}>
          <label className={styles.toggleLabel}>Make file public?</label>
          <label className={styles.switch}>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            <span className={styles.slider}></span>
          </label>
        </div>

        <button
          type="submit"
          className={styles.submitButton}
          disabled={isLoading || !file}
        >
          {isLoading ? "Uploading..." : "Upload File"}
        </button>
      </form>

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
