import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react"

const config = defineConfig({
  globalCss: {
    "html, body": {
      margin: 0,
      padding: 0,
      fontSynthesis: "none",
      textRendering: "optimizeLegibility",
      background: "#011a1a",
      textSizeAdjust: "100%",
    },
    // Prevent iOS auto-zoom on input focus (requires >= 16px)
    "input, select, textarea": {
      fontSize: "16px",
    },
    // Ensure all interactive elements meet 44x44px minimum touch target
    "button, [role='button'], a": {
      minHeight: "44px",
      minWidth: "44px",
    },
    body: {
      backgroundImage:
        "radial-gradient(ellipse at 50% 0%, rgba(2, 115, 94, 0.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, rgba(242, 116, 5, 0.06) 0%, transparent 50%)",
      backgroundAttachment: "fixed",
      minHeight: "100svh",
    },
    "#root": {
      width: "1126px",
      maxWidth: "100%",
      margin: "0 auto",
      textAlign: "center",
      minHeight: "100svh",
      display: "flex",
      flexDirection: "column",
      boxSizing: "border-box",
      overflowY: "auto",
    },
  },
  theme: {
    tokens: {
      fonts: {
        heading: { value: "Georgia, 'Times New Roman', serif" },
        body: { value: "system-ui, 'Segoe UI', Roboto, sans-serif" },
        mono: { value: "ui-monospace, Consolas, monospace" },
      },
    },
    semanticTokens: {
      colors: {
        bg: {
          value: { _light: "#011a1a", _dark: "#011a1a" },
        },
        "bg.subtle": {
          value: { _light: "#012e2e", _dark: "#012e2e" },
        },
        "bg.code": {
          value: { _light: "#012424", _dark: "#012424" },
        },
        fg: {
          value: { _light: "#a8b5b0", _dark: "#a8b5b0" },
        },
        "fg.heading": {
          value: { _light: "#e8f0ed", _dark: "#e8f0ed" },
        },
        "fg.muted": {
          value: { _light: "#6b8a80", _dark: "#6b8a80" },
        },
        "fg.error": {
          value: { _light: "#e05252", _dark: "#e05252" },
        },
        border: {
          value: {
            _light: "rgba(2, 115, 94, 0.35)",
            _dark: "rgba(2, 115, 94, 0.35)",
          },
        },
        accent: {
          value: { _light: "#F27405", _dark: "#F27405" },
        },
        "accent.bg": {
          value: {
            _light: "rgba(242, 116, 5, 0.15)",
            _dark: "rgba(242, 116, 5, 0.15)",
          },
        },
        "accent.border": {
          value: {
            _light: "rgba(242, 116, 5, 0.5)",
            _dark: "rgba(242, 116, 5, 0.5)",
          },
        },
      },
    },
  },
})

export const system = createSystem(defaultConfig, config)
