"use client";

import {
    createContext,
    useState,
    useContext,
    ReactNode,
    useEffect,
} from "react";
import { Team } from "@/types/user";
import { getMyTeams } from "@/services/teams";
import { useAuth } from "./AuthProvider"; // O tu hook de auth principal

interface TeamsContextType {
    teams: Team[];
    isLoading: boolean;
}

const TeamsContext = createContext<TeamsContextType | undefined>(undefined);

/**
 * @hook useTeams
 * @description A custom hook to access the user's teams list.
 */
export const useTeams = () => {
    const context = useContext(TeamsContext);
    if (context === undefined) {
        throw new Error("useTeams must be used within a TeamsProvider");
    }
    return context;
};

/**
 * @component TeamsProvider
 * @description Provides the user's team list to all children components.
 */
export const TeamsProvider = ({ children }: { children: ReactNode }) => {
    const { user } = useAuth(); // Depende de tu hook de auth
    const [teams, setTeams] = useState<Team[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Fetch teams only when the user is authenticated
        if (user) {
            setIsLoading(true);
            getMyTeams()
                .then((userTeams) => {
                    setTeams(userTeams);
                })
                .catch((err) => {
                    console.error("Failed to load teams in provider:", err);
                    setTeams([]); // Set empty on error
                })
                .finally(() => {
                    setIsLoading(false);
                });
        } else {
            // No user, clear teams
            setTeams([]);
            setIsLoading(false);
        }
    }, [user]); // Re-fetch if the user changes

    const value = {
        teams,
        isLoading,
    };

    return (
        <TeamsContext.Provider value={value}>{children}</TeamsContext.Provider>
    );
};
