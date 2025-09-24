"use client";

import styles from "./styles.module.css";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthProvider";
import { signOutUser } from "@/services/firebase/auth";
import {
  IoPersonCircleSharp,
  IoFolderOpen,
  IoPeople,
  IoCloudUpload,
  IoSettings,
  IoLogOutOutline,
  IoHome,
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
  const pathname = usePathname(); // Hook to get the current URL path

  const handleLogout = async () => {
    const { error } = await signOutUser();
    if (error) {
      console.error("Error signing out:", error.message);
    } else {
      router.push("/sign-in");
    }
  };

  const menuItems = [
    { name: "Home", icon: <IoHome />, path: "/home" },
    { name: "Files", icon: <IoFolderOpen />, path: "/files" },
    { name: "Team", icon: <IoPeople />, path: "/team" },
    { name: "Settings", icon: <IoSettings />, path: "/settings" },
  ];

  return (
    <nav className={styles.container}>
      <div>
        <div className={styles.user}>
          <IoPersonCircleSharp className={styles.logo} />
          <p>{user?.name ?? "Guest"}</p>
        </div>

        <hr className={styles.divider} />
        {menuItems.map((item) => (
          <Link
            href={item.path}
            key={item.name}
            // Apply 'active' class if the current path matches the item's path
            className={`${styles.item} ${
              pathname === item.path ? styles.active : ""
            }`}
          >
            {item.icon}
            <p>{item.name}</p>
          </Link>
        ))}
        <button
          onClick={onUploadClick}
          className={`${styles.item} ${styles.itemButton}`}
        >
          <IoCloudUpload />
          <p>Upload</p>
        </button>
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
