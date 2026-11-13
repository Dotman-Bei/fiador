import { createRoot } from 'react-dom/client';
import { loadDeployment } from '../deployment';
import { Landing } from './Landing';

const el = document.getElementById('root');
if (el !== null) createRoot(el).render(<Landing deployment={loadDeployment()} />);
