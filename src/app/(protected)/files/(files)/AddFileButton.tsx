"use client";

import { useUI } from "@/context/UIProvider";
import styles from "./styles.module.css";
import { IoCloudUploadOutline } from "react-icons/io5";

export const AddFileButton = () => {
    const { openUploadModal } = useUI();

    return (
        <button className={styles.uploadButton} onClick={openUploadModal}>
            <IoCloudUploadOutline />
            Upload File
        </button>
    );
};
