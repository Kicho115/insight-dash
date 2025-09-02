"use client";

// Import CSS
import styles from "./styles.module.css";

// Import user
import { useAuthContext } from "@/context/AuthContext";

import {
  IoPersonCircleSharp,
  IoFolderOpen,
  IoPeople,
  IoCloudUpload,
  IoSettings,
} from "react-icons/io5";

export const Sidebar = () => {
  const { user } = useAuthContext();

  return (
    <div className={styles.container}>
      <div className={styles.user}>
        <IoPersonCircleSharp className={styles.logo} />
        <p>{user?.displayName}</p>
      </div>
      <hr />
      <div className={styles.item}>
        <IoFolderOpen />
        <p>Files</p>
      </div>
      <div className={styles.item}>
        <IoPeople />
        <p>Team</p>
      </div>
      <div className={styles.item}>
        <IoCloudUpload />
        <p>Upload</p>
      </div>
      <div className={styles.item}>
        <IoSettings />
        <p>Settings</p>
      </div>
    </div>
  );
};
