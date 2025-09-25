"use client";

import styles from "./styles.module.css";

interface LoadingSpinnerProps {
    size?: "small" | "medium" | "large";
    text?: string;
    fullScreen?: boolean;
}

/**
 * @component LoadingSpinner
 * @description A modern loading spinner component with optional text
 * @param {Object} props - Component props
 * @param {"small" | "medium" | "large"} [props.size="medium"] - Size of the spinner
 * @param {string} [props.text] - Optional text to display below the spinner
 * @param {boolean} [props.fullScreen=false] - Whether to display in full screen mode
 * @returns {JSX.Element} The loading spinner component
 */
export const LoadingSpinner = ({
    size = "medium",
    text = "Loading...",
    fullScreen = false,
}: LoadingSpinnerProps) => {
    const containerClass = fullScreen
        ? `${styles.container} ${styles.fullScreen}`
        : styles.container;

    const spinnerClass = `${styles.spinner} ${styles[size]}`;

    return (
        <div className={containerClass}>
            <div className={styles.content}>
                <div className={spinnerClass}>
                    <div className={styles.ring}></div>
                    <div className={styles.ring}></div>
                    <div className={styles.ring}></div>
                </div>
                {text && <p className={styles.text}>{text}</p>}
            </div>
        </div>
    );
};
