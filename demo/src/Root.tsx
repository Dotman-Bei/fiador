import { Composition, Still } from 'remotion';
import plan from './generated/plan.json';
import { Film } from './Film';
import { Storyboard } from './Storyboard';

export const RemotionRoot = () => (
  <>
    <Still id="Storyboard" component={Storyboard} width={1920} height={1080} defaultProps={{ sceneId: 'S1' }} />
    <Composition id="Film" component={Film} width={1920} height={1080} fps={plan.fps} durationInFrames={plan.totalFrames} />
  </>
);
