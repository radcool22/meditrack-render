import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setCodec("h264");
Config.setCrf(22);
Config.setConcurrency(4);
Config.setEntryPoint("src/index.ts");
