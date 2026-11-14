import { Still } from 'remotion';
import { Storyboard } from './Storyboard';

export const RemotionRoot = () => (
  <Still id="Storyboard" component={Storyboard} width={1920} height={1080} defaultProps={{ sceneId: 'S1' }} />
);
