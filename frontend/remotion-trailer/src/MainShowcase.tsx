import { AbsoluteFill } from "remotion";
import { TransitionSeries, springTiming, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { StarField } from "./components/StarField";
import { Scene1 } from "./scenes/Scene1";
import { Scene2 } from "./scenes/Scene2";
import { Scene3 } from "./scenes/Scene3";
import { Scene4 } from "./scenes/Scene4";
import { Scene5 } from "./scenes/Scene5";
import { SceneProblem } from "./scenes/SceneProblem";
import { SceneDecisionFeed } from "./scenes/SceneDecisionFeed";
import { SceneForecast } from "./scenes/SceneForecast";
import { SceneAIChat } from "./scenes/SceneAIChat";

// 8-scene cinematic showcase
// Scene durations chosen for narrative rhythm.
export const MainShowcase: React.FC = () => {
  return (
    <AbsoluteFill>
      <StarField />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={105}>
          <Scene1 />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 15 })} />

        <TransitionSeries.Sequence durationInFrames={120}>
          <SceneProblem />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({ direction: "from-bottom" })} timing={linearTiming({ durationInFrames: 18 })} />

        <TransitionSeries.Sequence durationInFrames={180}>
          <SceneDecisionFeed />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={springTiming({ config: { damping: 200 }, durationInFrames: 22 })} />

        <TransitionSeries.Sequence durationInFrames={180}>
          <Scene3 />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={springTiming({ config: { damping: 200 }, durationInFrames: 22 })} />

        <TransitionSeries.Sequence durationInFrames={165}>
          <SceneForecast />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 15 })} />

        <TransitionSeries.Sequence durationInFrames={165}>
          <SceneAIChat />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({ direction: "from-left" })} timing={linearTiming({ durationInFrames: 18 })} />

        <TransitionSeries.Sequence durationInFrames={135}>
          <Scene2 />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 15 })} />

        <TransitionSeries.Sequence durationInFrames={150}>
          <Scene5 />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
