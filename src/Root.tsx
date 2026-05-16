import { Composition } from "remotion";
import { MediTrack } from "./compositions/MediTrack";
import { sampleMediTrack } from "./data/sampleMediTrack";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="MediTrack"
    component={MediTrack}
    durationInFrames={1005}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{ payload: sampleMediTrack }}
  />
);
