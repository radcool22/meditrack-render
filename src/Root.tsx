import { Composition } from "remotion";
import { Brief } from "./compositions/Brief";
import { sampleBrief } from "./data/sampleBrief";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Brief"
        component={Brief}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ brief: sampleBrief }}
      />
    </>
  );
};
