import { createRoot } from 'react-dom/client';
import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/board.css';
import { MemberActions } from '../wallet/MemberActions';
import { loadDeployment, REPO_URL } from '../deployment';
import { Board } from './Board';

const deployment = loadDeployment();
const el = document.getElementById('root');
if (el !== null) {
  createRoot(el).render(
    <>
      <header className="topbar">
        <div className="wrap topbar-row">
          <a className="wordmark" href="../">Fiador</a>
          <nav className="navlinks">
            <a href="../">About</a> <a href={REPO_URL}>Source</a>
          </nav>
        </div>
      </header>
      <Board deployment={deployment} />
      <MemberActions deployment={deployment} />
    </>,
  );
}
