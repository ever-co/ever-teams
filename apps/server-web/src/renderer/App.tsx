import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import icon from '../../assets/icon.svg';
import './App.css';
import { Setting } from './pages/Setting';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/setting" element={<Setting />} />
      </Routes>
    </Router>
  );
}
