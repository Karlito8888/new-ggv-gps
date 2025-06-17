import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css'; // Styles globaux (optionnel si vous utilisez Tailwind)

createRoot(document.getElementById('root')).render(<App />);
