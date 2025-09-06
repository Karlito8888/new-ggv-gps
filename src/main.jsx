import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { queryClient } from './lib/queryClient';
import './styles/index.css'; // Styles centralisés

// Filtrer les logs Workbox en développement
if (import.meta.env.DEV) {
  const originalLog = console.log;
  console.log = (...args) => {
    const message = args.join(' ');
    if (message.includes('workbox') || message.includes('Workbox')) {
      return; // Ignorer les logs Workbox
    }
    originalLog.apply(console, args);
  };
}

createRoot(document.getElementById('root')).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
