import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Wordbook } from './Wordbook';
import './wordbook.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Wordbook />
  </StrictMode>
);
