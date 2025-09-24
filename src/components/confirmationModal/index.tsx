"use client";

import styles from "./styles.module.css";
import { Modal } from "@/components/modal"; // Your generic modal wrapper
import { IoWarningOutline } from "react-icons/io5";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
}

export const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isLoading = false,
}: ConfirmationModalProps) => {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className={styles.container}>
        <div className={styles.iconWrapper}>
          <IoWarningOutline className={styles.icon} />
        </div>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>
          <button
            onClick={onClose}
            className={`${styles.button} ${styles.cancelButton}`}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`${styles.button} ${styles.confirmButton}`}
            disabled={isLoading}
          >
            {isLoading ? "Deleting..." : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};