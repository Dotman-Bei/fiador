import { createRoot } from 'react-dom/client';
import { loadDeployment } from '../deployment';
import { Board } from './Board';

const el = document.getElementById('root');
if (el !== null) createRoot(el).render(<Board deployment={loadDeployment()} />);
