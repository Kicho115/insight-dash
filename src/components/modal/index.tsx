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
    onClose?: () => void;
    children: ReactNode;
    hideCloseButton?: boolean;
}

/**
 * @component Modal
 * @description A reusable modal dialog component.
 * @param {ModalProps} props - The component props.
 * @returns {JSX.Element | null} The rendered modal or null if not open.
 */
export const Modal = ({ isOpen, onClose, children, hideCloseButton = false }: ModalProps) => {
    if (!isOpen) {
        return null;
    }

    const handleBackdropClick = () => {
        if (onClose) {
            onClose();
        }
    };

    return (
        <div className={styles.backdrop} onClick={handleBackdropClick}>
            <div
                className={styles.modalContent}
                onClick={(e) => e.stopPropagation()}
            >
                {!hideCloseButton && onClose && (
                    <button className={styles.closeButton} onClick={onClose}>
                        <IoClose />
                    </button>
                )}
                {children}
            </div>
        </div>
    );
};
