import React, { useEffect, useState } from "react";
import {
  continueRender,
  delayRender,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { getAudioData, visualizeAudio } from "@remotion/media-utils";
import { theme } from "../theme";

type AudioData = Awaited<ReturnType<typeof getAudioData>>;

// Character-specific palette — will move to theme.ts once the design stabilises (§10).
const SKIN        = '#D4A574';
const SKIN_SHADOW = '#B08860';
const HAIR        = '#3D2914';
const COAT        = '#f0f1f3';
const COAT_EDGE   = '#dcdee2';
const MOUTH_OPEN  = '#C06040';

export const Character: React.FC<{
  audioUrl: string;
  lookAt?: 'chart' | 'viewer';
}> = ({ audioUrl, lookAt = 'viewer' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Audio data for talking animation ──────────────────────────────────────
  const [audioData, setAudioData] = useState<AudioData | null>(null);
  const [handle] = useState(() =>
    audioUrl ? delayRender('Loading audio for Character') : null,
  );

  useEffect(() => {
    if (!audioUrl || handle === null) return;
    getAudioData(audioUrl)
      .then((data) => {
        setAudioData(data);
        continueRender(handle);
      })
      .catch(() => continueRender(handle));
  }, [audioUrl, handle]);

  // ── Ambient: breathing ────────────────────────────────────────────────────
  // scaleY 0.98–1.0, period 120 frames (4 s)
  const breathe = 0.99 + 0.01 * Math.sin((frame * 2 * Math.PI) / 120);

  // ── Ambient: blink ────────────────────────────────────────────────────────
  // Every ~180 frames (6 s), 4-frame closure
  const blinkPhase = frame % 180;
  const eyeScaleY =
    blinkPhase < 4
      ? interpolate(blinkPhase, [0, 2, 4], [1, 0, 1], {
          extrapolateRight: 'clamp',
        })
      : 1;

  // ── Ambient: idle sway ────────────────────────────────────────────────────
  // ±1°, period 180 frames (6 s)
  const sway = Math.sin((frame * 2 * Math.PI) / 180);

  // ── Talking: mouth amplitude ──────────────────────────────────────────────
  let mouthOpen = 0;
  if (audioData) {
    const viz = visualizeAudio({
      fps,
      frame,
      audioData,
      numberOfSamples: 16,
    });
    const avg = viz.reduce((sum, v) => sum + v, 0) / viz.length;
    mouthOpen = Math.min(1, avg * 3); // scale up for visible mouth movement
  }

  // ── lookAt tilt ───────────────────────────────────────────────────────────
  // 'chart' → tilt 5° left (charts are on the left side of the canvas)
  const tilt = lookAt === 'chart' ? -5 : 0;

  // ── Eye colour: slightly darker when talking ──────────────────────────────
  const eyeColor = mouthOpen > 0.1 ? '#1a0f08' : '#2D1810';

  return (
    <div
      style={{
        position: 'absolute',
        bottom: theme.safeBottom,
        right: 60,
        width: 260,
        height: theme.sizes.characterHeight,
        transform: `scaleY(${breathe}) rotate(${sway + tilt}deg)`,
        transformOrigin: 'bottom center',
      }}
    >
      <svg
        viewBox="0 0 240 480"
        width={260}
        height={theme.sizes.characterHeight}
        fill="none"
      >
        {/* ── Body / white coat ─────────────────────────────── */}
        <g id="body">
          <path
            d="M 75 210 Q 75 200 85 200 L 155 200 Q 165 200 165 210 L 175 440 Q 175 465 145 465 L 95 465 Q 65 465 65 440 Z"
            fill={COAT}
            stroke={COAT_EDGE}
            strokeWidth={1.5}
          />
          {/* Lapel lines */}
          <path d="M 98 200 L 120 248" stroke={COAT_EDGE} strokeWidth={2} />
          <path d="M 142 200 L 120 248" stroke={COAT_EDGE} strokeWidth={2} />
          {/* Left arm */}
          <rect
            x={45} y={228} width={32} height={90} rx={16}
            fill={COAT} stroke={COAT_EDGE} strokeWidth={1.5}
          />
          {/* Right arm */}
          <rect
            x={163} y={228} width={32} height={90} rx={16}
            fill={COAT} stroke={COAT_EDGE} strokeWidth={1.5}
          />
          {/* Stethoscope tube */}
          <path
            d="M 100 200 C 100 238 120 248 120 254"
            stroke={theme.accentAmber}
            strokeWidth={4}
            strokeLinecap="round"
          />
          <path
            d="M 140 200 C 140 238 120 248 120 254"
            stroke={theme.accentAmber}
            strokeWidth={4}
            strokeLinecap="round"
          />
          {/* Chest piece */}
          <circle cx={120} cy={262} r={10} fill={theme.accentAmber} />
          <circle cx={120} cy={262} r={5} fill={theme.accentAmberDeep} />
        </g>

        {/* ── Head ──────────────────────────────────────────── */}
        <g id="head">
          {/* Neck */}
          <rect x={106} y={184} width={28} height={24} rx={10} fill={SKIN} />
          {/* Face */}
          <circle cx={120} cy={120} r={70} fill={SKIN} />
          {/* Hair */}
          <path
            d="M 50 115 C 50 45 190 45 190 115 C 185 80 160 55 120 50 C 80 55 55 80 50 115 Z"
            fill={HAIR}
          />
          <ellipse cx={53} cy={125} rx={10} ry={22} fill={HAIR} />
          <ellipse cx={187} cy={125} rx={10} ry={22} fill={HAIR} />
          {/* Blush */}
          <circle cx={78} cy={148} r={12} fill="rgba(255,140,120,0.25)" />
          <circle cx={162} cy={148} r={12} fill="rgba(255,140,120,0.25)" />
          {/* Eyebrows */}
          <path
            d="M 84 100 Q 96 93 108 100"
            stroke={HAIR} strokeWidth={3} strokeLinecap="round"
          />
          <path
            d="M 132 100 Q 144 93 156 100"
            stroke={HAIR} strokeWidth={3} strokeLinecap="round"
          />
        </g>

        {/* ── Eyes (blink = scaleY around eye-centre y 118) ── */}
        <g
          id="eyes"
          transform={`translate(120 118) scale(1 ${eyeScaleY}) translate(-120 -118)`}
        >
          {/* Left */}
          <ellipse cx={96} cy={118} rx={12} ry={14} fill="white" />
          <circle cx={99} cy={120} r={6} fill={eyeColor} />
          <circle cx={101} cy={117} r={2.5} fill="white" />
          {/* Right */}
          <ellipse cx={144} cy={118} rx={12} ry={14} fill="white" />
          <circle cx={147} cy={120} r={6} fill={eyeColor} />
          <circle cx={149} cy={117} r={2.5} fill="white" />
        </g>

        {/* ── Mouth (talking = open ellipse) ────────────────── */}
        <g id="mouth">
          {mouthOpen < 0.1 ? (
            <path
              d="M 108 150 Q 120 160 132 150"
              stroke={SKIN_SHADOW}
              strokeWidth={3}
              strokeLinecap="round"
            />
          ) : (
            <ellipse
              cx={120}
              cy={153}
              rx={interpolate(mouthOpen, [0, 1], [6, 14])}
              ry={interpolate(mouthOpen, [0, 1], [2, 10])}
              fill={MOUTH_OPEN}
              stroke={SKIN_SHADOW}
              strokeWidth={1.5}
            />
          )}
        </g>
      </svg>
    </div>
  );
};
