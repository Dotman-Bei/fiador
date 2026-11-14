import { createRoot } from 'react-dom/client';
import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/components.css';
import '../styles/landing.css';
import { loadDeployment } from '../deployment';
import { Landing } from './Landing';

const el = document.getElementById('root');
if (el !== null) createRoot(el).render(<Landing deployment={loadDeployment()} />);
