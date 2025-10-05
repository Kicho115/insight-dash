import { Timestamp } from "firebase/firestore";

export const formatDate = (date: Date | string | number) => {
    return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    }).format(new Date(date));
};

export const formatFirestoreDate = (
    date:
        | Date
        | string
        | number
        | Timestamp
        | { seconds: number; nanoseconds: number }
) => {
    // Handle Firestore Timestamp
    if (date && typeof date === "object" && "seconds" in date) {
        return formatDate(new Date(date.seconds * 1000));
    }
    return formatDate(date);
};
