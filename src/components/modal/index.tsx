"use client";

import { ReactNode } from "react";
import styles from "./styles.module.css";
import { IoClose } from "react-icons/io5";

/**
 * @interface ModalProps
 * @description Defines the props for the Modal component.
 */
interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
}

/**
 * @component Modal
 * @description A reusable modal dialog component.
 * @param {ModalProps} props - The component props.
 * @returns {JSX.Element | null} The rendered modal or null if not open.
 */
export const Modal = ({ isOpen, onClose, children }: ModalProps) => {
    if (!isOpen) {
        return null;
    }

    return (
        <div className={styles.backdrop} onClick={onClose}>
            <div
                className={styles.modalContent}
                onClick={(e) => e.stopPropagation()}
            >
                <button className={styles.closeButton} onClick={onClose}>
                    <IoClose />
                </button>
                {children}
            </div>
        </div>
    );
};
