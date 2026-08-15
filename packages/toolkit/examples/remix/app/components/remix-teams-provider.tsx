import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useLocation } from '@remix-run/react';

// Simple context for Remix - replace this with proper implementation later
interface User {
    id: string;
    name: string;
    email: string;
    firstName?: string;
    lastName?: string;
    imageUrl?: string;
    employee?: boolean;
}

interface RemixTeamsContextType {
    theme: 'light' | 'dark';
    setTheme: (theme: 'light' | 'dark') => void;
    user: User | null;
    setUser: (user: User | null) => void;
    token: string | null;
    setToken: (token: string | null) => void;
    // Add the properties that TeamsLoginDialog expects
    authenticatedUser: User | null;
    loadings: {
        userLoading: boolean;
    };
}

const RemixTeamsContext = createContext<RemixTeamsContextType | undefined>(undefined);

export function RemixTeamsProvider({ children }: { children: ReactNode }) {
    const location = useLocation();
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('theme') as 'light' | 'dark' || 'light';
        }
        return 'light';
    });
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [userLoading] = useState(false);

    const handleThemeChange = (newTheme: 'light' | 'dark') => {
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        document.documentElement.classList.toggle('dark', newTheme === 'dark');
    };

    // Initialize theme
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
        if (savedTheme) {
            document.documentElement.classList.toggle('dark', savedTheme === 'dark');
        } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            handleThemeChange('dark');
        }
    }, []);

    // Reset state when location changes
    useEffect(() => {
        // You can add any cleanup or state reset logic here if needed
    }, [location.pathname]);

    return (
        <RemixTeamsContext.Provider
            value={{
                theme,
                setTheme: handleThemeChange,
                user,
                setUser,
                token,
                setToken,
                // Provide the authenticatedUser that TeamsLoginDialog expects
                authenticatedUser: user,
                loadings: {
                    userLoading
                }
            }}
        >
            {children}
        </RemixTeamsContext.Provider>
    );
}

export function useRemixTeamsContext() {
    const context = useContext(RemixTeamsContext);
    if (context === undefined) {
        throw new Error('useRemixTeamsContext must be used within a RemixTeamsProvider');
    }
    return context;
}

// Create a wrapper hook that provides the same interface as useTeamsContext
export function useTeamsContext() {
    const context = useRemixTeamsContext();

    // Return a mock object that matches the expected useTeamsContext interface
    return {
        authenticatedUser: context.authenticatedUser,
        loadings: context.loadings,
        // Add other required properties with default values
        start: () => { },
        pause: () => { },
        startTimer: async () => { },
        stopTimer: async () => { },
        isRunning: false,
        hours: 0,
        minutes: 0,
        seconds: 0,
        totalSeconds: 0,
        selectedFont: 'Inter',
        fontOptions: [{ name: 'Inter', value: '"Inter", sans-serif' }],
        setSelectedFont: () => { },
        defaultData: [],
        config: {},
        setConfig: () => { },
        todayTrackedTime: {
            days: 0,
            hours: 0,
            minutes: 0,
            seconds: 0,
            milliseconds: 0,
            totalSeconds: 0
        },
        token: context.token,
        setToken: context.setToken,
        timerLoading: false,
        appliedTheme: {},
        setAppliedTheme: () => { },
        timerStatus: null,
        reportDates: undefined,
        setReportDates: () => { },
        members: null,
        userPermissions: null,
        setPermissions: () => { },
        userOrganizations: null,
        currentTeamsState: null,
        setCurrentTeamsState: () => { },
        selectedEmployee: '',
        setSelectedEmployee: () => { },
        selectedTeam: '',
        setSelectedTeam: () => { },
        selectedOrganization: '',
        setSelectedOrganization: () => { }
    };
}
