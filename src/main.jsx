import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { Theme } from '@radix-ui/themes';
import App from './App';
import { queryClient } from './lib/queryClient';
import './styles/index.css'; // Centralized styles
import '@radix-ui/themes/styles.css';

// Filter Workbox logs in development
if (import.meta.env.DEV) {
  const originalLog = console.log;
  console.log = (...args) => {
    const message = args.join(' ');
    if (message.includes('workbox') || message.includes('Workbox')) {
      return; // Ignore Workbox logs
    }
    originalLog.apply(console, args);
  };
}

createRoot(document.getElementById('root')).render(
  <QueryClientProvider client={queryClient}>
    <Theme>
      <App />
    </Theme>
  </QueryClientProvider>
);
