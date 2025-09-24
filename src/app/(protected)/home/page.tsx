"use client";

// React imports
import { useState, useEffect } from "react";

// Import CSS
import styles from "./styles.module.css";

// Import user
import { useAuth } from "@/context/AuthProvider";

const HomePage = () => {
  const [greeting, setGreeting] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    const getGreeting = () => {
      const hour = new Date().getHours();

      if (hour >= 5 && hour < 12) {
        return "Good Morning";
      } else if (hour >= 12 && hour < 19) {
        return "Good Afternoon";
      } else {
        return "Good Evening";
      }
    };

    setGreeting(getGreeting());
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.greetingWrapper}>
        <div className={styles.greetingContent}>
          <h1 className={styles.greetingText}>{greeting}</h1>
          <p className={styles.userName}>{user?.name}</p>
          <div className={styles.underline}></div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
