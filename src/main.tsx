import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { ChakraProvider } from "@chakra-ui/react"
import { ThemeProvider } from "next-themes"
import { FishjamProvider } from "@fishjam-cloud/react-client"
import NiceModal from "@ebay/nice-modal-react"
import { AiImageEventsProvider } from "./hooks/useAiImageEvents"
import { system } from "./theme"
import App from "./App"

const FISHJAM_ID = import.meta.env.VITE_FISHJAM_ID as string
const DISABLE_AI_IMAGES = import.meta.env.VITE_DISABLE_AI_IMAGES === "true"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ChakraProvider value={system}>
      <ThemeProvider attribute="class" disableTransitionOnChange forcedTheme="dark">
        <FishjamProvider fishjamId={FISHJAM_ID}>
          <AiImageEventsProvider disabled={DISABLE_AI_IMAGES}>
            <NiceModal.Provider>
              <App />
            </NiceModal.Provider>
          </AiImageEventsProvider>
        </FishjamProvider>
      </ThemeProvider>
    </ChakraProvider>
  </StrictMode>,
)
