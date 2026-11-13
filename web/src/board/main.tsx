import { createRoot } from 'react-dom/client';
import { MemberActions } from '../wallet/MemberActions';
import { loadDeployment } from '../deployment';
import { Board } from './Board';

const deployment = loadDeployment();
const el = document.getElementById('root');
if (el !== null) {
  createRoot(el).render(
    <>
      <Board deployment={deployment} />
      <MemberActions deployment={deployment} />
    </>,
  );
}
