"use client";

// React imports
import { useState, useEffect } from "react";

// Import CSS
import styles from "./styles.module.css";

const HomePage = () => {
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const getGreeting = () => {
      const hour = new Date().getHours();

      if (hour >= 5 && hour < 12) {
        return "Good Morning";
      } else if (hour >= 12 && hour < 19) {
        return "Good Afternoon";
      } else {
        return "Good Night";
      }
    };

    setGreeting(getGreeting());
  }, []);

  return <div className={styles.container}>{greeting}</div>;
};

export default HomePage;
