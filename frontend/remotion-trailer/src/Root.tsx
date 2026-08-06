import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";
import { MainShowcase } from "./MainShowcase";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="main"
      component={MainVideo}
      durationInFrames={672}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="showcase"
      component={MainShowcase}
      durationInFrames={1075}
      fps={30}
      width={1920}
      height={1080}
    />
  </>
);
