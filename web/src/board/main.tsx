import { createRoot } from 'react-dom/client';
import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/components.css';
import '../styles/app.css';
import { RpcClient } from '../../../src/lib/rpc';
import { loadDeployment } from '../deployment';
import { BoardProvider } from '../data/react';
import { createBoardStore } from '../data/store';
import { ChecksProvider, createChecksStore } from '../proof/Checks';
import { App } from './App';

const deployment = loadDeployment();
const store = createBoardStore(deployment, deployment === null ? null : new RpcClient(deployment.rpc));
store.start();
const checks = createChecksStore(deployment);

const el = document.getElementById('root');
if (el !== null) {
  createRoot(el).render(
    <BoardProvider store={store}>
      <ChecksProvider store={checks}>
        <App />
      </ChecksProvider>
    </BoardProvider>,
  );
}
