"use client";

// Import CSS
import styles from "./styles.module.css";

// React hooks
import { useRouter } from "next/navigation";

// Import user
import { useAuthContext } from "@/context/AuthContext";

// Firebase imports
import { signOutUser } from "@/firebase/login";

import {
  IoPersonCircleSharp,
  IoFolderOpen,
  IoPeople,
  IoCloudUpload,
  IoSettings,
  IoLogOutOutline,
} from "react-icons/io5";

/**
 * @component Sidebar
 * @description The main navigation sidebar for the application.
 * @returns {JSX.Element} The rendered sidebar component.
 */
export const Sidebar = () => {
  const { user } = useAuthContext();
  const router = useRouter();

  /**
   * @function handleLogout
   * @description Handles the user logout process.
   */
  const handleLogout = async () => {
    const { error } = await signOutUser();
    if (error) {
      console.error("Error signing out:", error.message);
      // Optionally, show a notification to the user
    } else {
      // Redirect to sign-in page after successful logout
      router.push("/sign-in");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.user}>
        <IoPersonCircleSharp className={styles.logo} />
        <p>{user?.name}</p>
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
      <div>
        <hr className={styles.divider} />
        <button
          onClick={handleLogout}
          className={`${styles.item} ${styles.logoutButton}`}
        >
          <IoLogOutOutline />
          <p>Logout</p>
        </button>
      </div>
    </div>
  );
};
