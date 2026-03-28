import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react"

const config = defineConfig({
  globalCss: {
    "html, body": {
      margin: 0,
      padding: 0,
      fontSynthesis: "none",
      textRendering: "optimizeLegibility",
    },
    "#root": {
      width: "1126px",
      maxWidth: "100%",
      margin: "0 auto",
      textAlign: "center",
      borderInline: "1px solid",
      borderColor: "border",
      minHeight: "100svh",
      display: "flex",
      flexDirection: "column",
      boxSizing: "border-box",
    },
  },
  theme: {
    tokens: {
      fonts: {
        heading: { value: "system-ui, 'Segoe UI', Roboto, sans-serif" },
        body: { value: "system-ui, 'Segoe UI', Roboto, sans-serif" },
        mono: { value: "ui-monospace, Consolas, monospace" },
      },
    },
    semanticTokens: {
      colors: {
        bg: {
          value: { _light: "#fff", _dark: "#16171d" },
        },
        fg: {
          value: { _light: "#6b6375", _dark: "#9ca3af" },
        },
        "fg.heading": {
          value: { _light: "#08060d", _dark: "#f3f4f6" },
        },
        border: {
          value: { _light: "#e5e4e7", _dark: "#2e303a" },
        },
        "bg.code": {
          value: { _light: "#f4f3ec", _dark: "#1f2028" },
        },
        accent: {
          value: { _light: "#aa3bff", _dark: "#c084fc" },
        },
        "accent.bg": {
          value: {
            _light: "rgba(170,59,255,0.1)",
            _dark: "rgba(192,132,252,0.15)",
          },
        },
        "accent.border": {
          value: {
            _light: "rgba(170,59,255,0.5)",
            _dark: "rgba(192,132,252,0.5)",
          },
        },
      },
    },
  },
})

export const system = createSystem(defaultConfig, config)
