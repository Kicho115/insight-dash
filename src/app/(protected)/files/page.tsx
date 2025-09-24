"use client";

import { useState, useEffect } from "react";
import styles from "./styles.module.css";
import { File as FileMetadata } from "@/types/user";
import { useFiles } from "@/context/FilesProvider";
import {
  IoDocumentTextOutline,
  IoLockClosedOutline,
  IoGlobeOutline,
  IoEllipsisHorizontal,
} from "react-icons/io5";

// Helper function to format file size into a human-readable string
const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

// Helper function to format dates
const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

export default function FilesPage() {
  // Get state directly from the context
  const { files, isLoading, error } = useFiles();

  if (isLoading) {
    return <div className={styles.loading}>Loading files...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Your Files</h1>
        <p>Manage and analyze your uploaded data files.</p>
      </header>

      {files.length === 0 ? (
        <div className={styles.emptyState}>
          <IoDocumentTextOutline className={styles.emptyIcon} />
          <h2>No files uploaded yet</h2>
          <p>Click the "Upload" button in the sidebar to get started.</p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Size</th>
                <th>Last Modified</th>
                <th>Visibility</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr key={file.id}>
                  <td>
                    <div className={styles.fileNameCell}>
                      <IoDocumentTextOutline className={styles.fileIcon} />
                      {/* Using displayName for the user-friendly name */}
                      {file.displayName}
                    </div>
                  </td>
                  <td>{formatBytes(file.size || 0)}</td>
                  <td>{formatDate(file.updatedAt)}</td>
                  <td>
                    <div className={styles.visibilityCell}>
                      {file.isPublic ? <IoGlobeOutline /> : <IoLockClosedOutline />}
                      {file.isPublic ? "Public" : "Private"}
                    </div>
                  </td>
                  <td>
                    <span className={`${styles.statusBadge} ${styles.statusReady}`}>
                      Ready
                    </span>
                  </td>
                  <td>
                    <button className={styles.actionsButton}>
                      <IoEllipsisHorizontal />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}