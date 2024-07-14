import { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import { Setting } from './pages/Setting';
import i18next from 'i18next';
import { ServerPage } from './pages/Server';

export default function App() {
  const [language, setLanguage] = useState<string>('en');
  useEffect(() => {
    window.languageChange.language((value: any) => {
      setLanguage(value);
    });
    i18next.changeLanguage(language);
  }, [language]);
  return (
    <Router>
      <Routes>
        <Route path="/setting" element={<Setting />} />
        <Route path="/history-console" element={<ServerPage />} />
      </Routes>
    </Router>
  );
}
