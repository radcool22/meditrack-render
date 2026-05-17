"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemotionRoot = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const remotion_1 = require("remotion");
const MediTrack_1 = require("./compositions/MediTrack");
const sampleMediTrack_1 = require("./data/sampleMediTrack");
const RemotionRoot = () => ((0, jsx_runtime_1.jsx)(remotion_1.Composition, { id: "MediTrack", component: MediTrack_1.MediTrack, durationInFrames: 300, fps: 30, width: 1080, height: 1920, defaultProps: { payload: sampleMediTrack_1.sampleMediTrack } }));
exports.RemotionRoot = RemotionRoot;
