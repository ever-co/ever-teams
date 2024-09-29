import React, { createContext, useState, useContext } from 'react';

const ThemeContext = createContext({
    theme: 'dark',
    toggleTheme: (value: string) => { },
});
type ThemeContextType = {
    children: React.ReactNode;
}
export const ThemeProvider = ({ children }: ThemeContextType) => {
    const [theme, setTheme] = useState('light');

    const toggleTheme = (value: string) => {
        window.electron.ipcRenderer.sendMessage('setting-page', { data: value, type: 'theme-change' });
        setTheme(value);
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    return useContext(ThemeContext);
};
