// Design tokens for Dark Vibrant Pop — MediTrack vertical video.
// Every component imports from here. No magic colours or sizes in component code.

export const theme = {
  // Canvas
  bg:               '#0a0e1a',
  bgGradientAccent: 'rgba(251, 191, 36, 0.15)',

  // Text on dark canvas
  textOnBg:    '#ffffff',
  textOnBgDim: 'rgba(255, 255, 255, 0.7)',

  // Accents
  accentAmber:     '#fbbf24',
  accentAmberDeep: '#f97316',

  // Card surfaces
  cardBg:           '#ffffff',
  cardText:         '#1f2937',
  cardMuted:        '#666666',
  cardBorderRadius: 28,
  cardPadding:      48,
  cardPaddingTight: 28,

  // Status (medical)
  success:    '#10b981',
  danger:     '#dc2626',
  dangerSoft: '#fee2e2',
  dangerDeep: '#991b1b',
  warning:    '#f59e0b',

  // Borderline — amber, between success and danger
  borderline:     '#f59e0b',
  borderlineSoft: '#fef3c7',
  borderlineDeep: '#92400e',

  // Hard offset shadow — amber, NOT black
  shadowOffset: '#fbbf24',

  // Neutral fills used in chart components
  barTrackBg: '#f3f4f6',
  axisLabel:  '#6b7280',

  // Sizing (px, calibrated for arm's-length phone viewing)
  sizes: {
    wordmark:        54,
    heroNumeral:     240,
    headline:        96,
    sectionTitle:    64,
    cardLabel:       42,
    cardMeta:        30,
    captionCurrent:  92,
    captionPast:     64,
    disclaimer:      32,
    characterHeight: 520,
  },

  // Safe areas
  safeTop:    110,
  safeBottom: 240,

  // Caption zones — captions must never cover the chart card (y 520–~1250)
  // or the character. Words show in chunks so the block can't grow tall.
  captions: {
    chunkWords: 4,
    // Chart beats: below the card, left of the lower-right character (x ≥ ~770).
    besideCharacter: { top: 1290, left: 60, right: 340 },
    // No-chart beats: the empty middle, above the centred character (head ~y 1120).
    centered:        { top: 600,  left: 60, right: 60 },
  },
} as const;
