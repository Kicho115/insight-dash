"use client";

// Import CSS
import styles from "./styles.module.css";

import {
  IoPersonCircleSharp,
  IoFolderOpen,
  IoPeople,
  IoCloudUpload,
  IoSettings,
} from "react-icons/io5";

export const Sidebar = () => {
  return (
    <div className={styles.container}>
      <div className={styles.user}>
        <IoPersonCircleSharp className={styles.logo} />
        <p>John Doe</p>
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
