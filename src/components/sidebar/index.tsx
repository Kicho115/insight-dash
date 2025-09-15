"use client";

import styles from "./styles.module.css";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { signOutUser } from "@/services/firebase/auth";
import {
  IoPersonCircleSharp,
  IoFolderOpen,
  IoPeople,
  IoCloudUpload,
  IoSettings,
  IoLogOutOutline,
} from "react-icons/io5";

interface SidebarProps {
  onUploadClick: () => void;
}

/**
 * @component Sidebar
 * @description The main navigation sidebar for the application.
 * @returns {JSX.Element} The rendered sidebar component.
 */
export const Sidebar = ({ onUploadClick }: SidebarProps) => {
  const { user } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    const { error } = await signOutUser();
    if (error) {
      console.error("Error signing out:", error.message);
    } else {
      router.push("/sign-in");
    }
  };

  return (
    <nav className={styles.container}>
      <div>
        <div className={styles.user}>
          <IoPersonCircleSharp className={styles.logo} />
          <p>{user?.name ?? "Guest"}</p>
        </div>

        <hr className={styles.divider} />
        <div className={styles.item}>
          <IoFolderOpen />
          <p>Files</p>
        </div>
        <div className={styles.item}>
          <IoPeople />
          <p>Team</p>
        </div>
        <button
          onClick={onUploadClick}
          className={`${styles.item} ${styles.itemButton}`}
        >
          <IoCloudUpload />
          <p>Upload</p>
        </button>
        <div className={styles.item}>
          <IoSettings />
          <p>Settings</p>
        </div>
      </div>

      <div>
        <hr className={styles.divider} />
        <button
          onClick={handleLogout}
          className={`${styles.item} ${styles.itemButton} ${styles.logoutButton}`}
        >
          <IoLogOutOutline />
          <p>Logout</p>
        </button>
      </div>
    </nav>
  );
};
