import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";

type CaptionsProps = {
  text: string;
  beatStart: number; // global frame at which the active beat begins
  beatEnd: number;   // global frame at which the active beat ends
  lang: 'hi' | 'en';
  // true on chart beats (character lower-right), false when the character is centred
  besideCharacter: boolean;
};

export const Captions: React.FC<CaptionsProps> = ({ text, beatStart, beatEnd, lang, besideCharacter }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const words = text.split(/\s+/).filter(Boolean);
  // ─── TIMING LOGIC PRESERVED VERBATIM ─────────────────────────────────────
  // Spread word entries so the last word lands ~3 frames before the beat ends.
  // Single-word beats skip staggering entirely (interval = 0).
  const staggerInterval =
    words.length > 1 ? (beatEnd - beatStart - 3) / (words.length - 1) : 0;
  // ─────────────────────────────────────────────────────────────────────────

  // Index of the most recently started word; -1 if none has started yet.
  let currentWordIndex = -1;
  for (let i = 0; i < words.length; i++) {
    if (frame >= beatStart + i * staggerInterval) currentWordIndex = i;
  }

  // Only the current chunk's spoken words are laid out — laying out the whole
  // sentence (unspoken words invisible but still taking space) made long
  // captions wrap upward over the chart card and the character.
  const { chunkWords } = theme.captions;
  const chunkStart = Math.floor(Math.max(currentWordIndex, 0) / chunkWords) * chunkWords;
  const zone = besideCharacter ? theme.captions.besideCharacter : theme.captions.centered;

  return (
    <div
      style={{
        position: "absolute",
        top: zone.top,
        left: zone.left,
        right: zone.right,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "flex-end",
          gap: "8px 16px",
        }}
      >
        {words.map((word, i) => {
          if (i < chunkStart || i > currentWordIndex) return null;
          // ─── TIMING LOGIC PRESERVED VERBATIM ───────────────────────────
          const wordStartFrame = beatStart + i * staggerInterval;
          const wordFrame      = Math.max(0, frame - wordStartFrame);
          const enter          = spring({
            frame: wordFrame,
            fps,
            config: { damping: 200 },
            durationInFrames: 5,
          });
          const baseOpacity  = interpolate(enter, [0, 1], [0, 1]);
          const scaleV       = interpolate(enter, [0, 1], [0.8, 1]);
          const translateYV  = interpolate(enter, [0, 1], [50, 0]);
          // ───────────────────────────────────────────────────────────────

          const isPast    = i < currentWordIndex;
          const isCurrent = i === currentWordIndex;

          // Devanagari conjuncts break with rotation — Latin words get micro-rotation.
          const isDevanagari = /[\u0900-\u097F]/.test(word);
          const rotationDeg  =
            lang === 'hi' && isDevanagari
              ? 0
              : ((i * 137) % 200 - 100) / 100 * 1.2;

          const fontSize   = isPast ? theme.sizes.captionPast : theme.sizes.captionCurrent;
          const fontWeight = isPast ? 800 : 900;
          const color      = isCurrent ? theme.accentAmber : theme.textOnBg;
          const opacity    = isPast ? baseOpacity * 0.65 : baseOpacity;

          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                opacity,
                transform: `scale(${scaleV}) translateY(${translateYV}px) rotate(${rotationDeg}deg)`,
              }}
            >
              {/* Single element — paint-order: stroke fill avoids the old dual-span trick */}
              <span
                style={{
                  fontSize,
                  fontWeight,
                  color,
                  letterSpacing: -1.5,
                  textTransform: isDevanagari ? undefined : ("uppercase" as const),
                  lineHeight: 1.2,
                  WebkitTextStroke: "6px #000",
                  paintOrder: "stroke fill" as React.CSSProperties["paintOrder"],
                  display: "block",
                }}
              >
                {word}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
};
