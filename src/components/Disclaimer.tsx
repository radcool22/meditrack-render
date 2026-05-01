import { theme } from "../theme";

// Render-template invariant — present on every frame, cannot be disabled by props.
// Never make this conditional. Never scope it to a beat or sequence.
// See CLAUDE.md §2.1.4.
export const Disclaimer: React.FC<{ text: string }> = ({ text }) => (
  <div
    style={{
      position: "absolute",
      top: 220,           // just below header
      left: 60,
      right: 60,
      display: "flex",
      alignItems: "center",
      gap: 18,
      background: "rgba(255,255,255,0.10)",
      backdropFilter: "blur(8px)",
      border: "1px solid rgba(255,255,255,0.18)",
      borderRadius: 18,
      padding: "18px 26px",
    }}
  >
    {/* Info circle */}
    <div
      style={{
        width: 42,
        height: 42,
        borderRadius: "50%",
        background: theme.textOnBg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        fontSize: 26,
        fontWeight: 800,
        color: theme.bg,
      }}
    >
      i
    </div>
    <span
      style={{
        fontSize: theme.sizes.disclaimer,
        fontWeight: 500,
        color: theme.textOnBg,
        lineHeight: 1.4,
      }}
    >
      {text}
    </span>
  </div>
);
