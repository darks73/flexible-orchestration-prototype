import React from 'react';
import { createRoot } from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import App from './App.jsx';

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <>
    <App />
    <Analytics />
    <SpeedInsights />
  </>
);
