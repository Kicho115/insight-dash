"use client";

import styles from "./styles.module.css";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthProvider";
import { useUI } from "@/context/UIProvider";
import { signOutUser } from "@/services/firebase/auth";
import { useState, useEffect } from "react";
import {
    IoPersonCircleSharp,
    IoFolderOpen,
    IoPeople,
    IoCloudUpload,
    IoSettings,
    IoLogOutOutline,
    IoHome,
    IoMenu,
    IoClose,
} from "react-icons/io5";

/**
 * @component Sidebar
 * @description The main navigation sidebar for the application.
 * @returns {JSX.Element} The rendered sidebar component.
 */
export const Sidebar = () => {
    const { user } = useAuth();
    const { openUploadModal } = useUI(); // Get the function from the context
    const router = useRouter();
    const pathname = usePathname();
    // Start collapsed on mobile, expanded on desktop
    const [isCollapsed, setIsCollapsed] = useState(true);

    useEffect(() => {
        const checkSize = () => {
            setIsCollapsed(window.innerWidth <= 768);
        };
        // Check size on mount
        checkSize();
        // Optional: Add listener for window resize
        window.addEventListener("resize", checkSize);
        return () => window.removeEventListener("resize", checkSize);
    }, []);

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

    const toggleSidebar = () => {
        setIsCollapsed(!isCollapsed);
    };

    return (
        <>
            {/* Mobile overlay */}
            {!isCollapsed && (
                <div className={styles.overlay} onClick={toggleSidebar} />
            )}

            {/* Toggle button - outside nav when collapsed on mobile */}
            {isCollapsed && (
                <button
                    className={styles.mobileToggleButton}
                    onClick={toggleSidebar}
                    aria-label="Abrir menú"
                >
                    <IoMenu />
                </button>
            )}

            <nav
                className={`${styles.container} ${
                    isCollapsed ? styles.collapsed : ""
                }`}
            >
                {/* Toggle button - shows close icon when expanded, menu icon when collapsed */}
                <button
                    className={styles.toggleButton}
                    onClick={toggleSidebar}
                    aria-label={isCollapsed ? "Expandir menú" : "Cerrar menú"}
                >
                    {isCollapsed ? <IoMenu /> : <IoClose />}
                </button>

                <div>
                    <div className={styles.user}>
                        <IoPersonCircleSharp className={styles.logo} />
                        {!isCollapsed && <p>{user?.name ?? "Guest"}</p>}
                    </div>

                    <hr className={styles.divider} />
                    {menuItems.map((item) => {
                        // Use startsWith to handle nested routes like /team/[teamId]
                        const isActive = pathname.startsWith(item.path);
                        // Specific check for /home to avoid it matching all routes
                        const isHomeActive =
                            item.path === "/home" && pathname === "/home";

                        return (
                            <Link
                                href={item.path}
                                key={item.name}
                                className={`${styles.item} ${
                                    (
                                        item.path === "/home"
                                            ? isHomeActive
                                            : isActive
                                    )
                                        ? styles.active
                                        : ""
                                }`}
                                onClick={() => {
                                    if (window.innerWidth <= 768) {
                                        setIsCollapsed(true);
                                    }
                                }}
                            >
                                {item.icon}
                                {!isCollapsed && <p>{item.name}</p>}
                            </Link>
                        );
                    })}
                    <button
                        onClick={() => {
                            openUploadModal();
                            // Close sidebar on mobile after clicking upload
                            if (window.innerWidth <= 768) {
                                setIsCollapsed(true);
                            }
                        }}
                        className={`${styles.item} ${styles.itemButton}`}
                    >
                        <IoCloudUpload />
                        {!isCollapsed && <p>Upload</p>}
                    </button>
                </div>

                <div>
                    <hr className={styles.divider} />
                    <button
                        onClick={handleLogout}
                        className={`${styles.item} ${styles.itemButton} ${styles.logoutButton}`}
                    >
                        <IoLogOutOutline />
                        {!isCollapsed && <p>Logout</p>}
                    </button>
                </div>
            </nav>
        </>
    );
};
