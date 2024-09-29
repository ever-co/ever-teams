import { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import { Setting } from './pages/Setting';
import i18next from 'i18next';
import { ServerPage } from './pages/Server';
import { ThemeProvider, useTheme } from './ThemeContext';

export default function App() {
  const [language, setLanguage] = useState<string>('en');
  const { theme } = useTheme();

  const setTheme = async (htmlElement: HTMLElement) => {
    const currentTheme = await window.electron.ipcRenderer.invoke('current-theme');
    htmlElement.classList.remove('dark', 'ligth');
    htmlElement.classList.toggle(currentTheme || theme);
  }

  useEffect(() => {
    const htmlElement = document.documentElement;
    setTheme(htmlElement);
    window.languageChange.language((value: any) => {
      setLanguage(value);
    });
    window.themeChange.theme((value: any) => {
      console.log(value);
      htmlElement.classList.remove('dark', 'ligth');
      htmlElement.classList.toggle(value.data);
    })
    i18next.changeLanguage(language);
  }, [language]);
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/setting" element={<Setting />} />
          <Route path="/history-console" element={<ServerPage />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}
