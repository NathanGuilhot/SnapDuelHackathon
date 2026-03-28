import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { ChakraProvider } from "@chakra-ui/react"
import { ThemeProvider } from "next-themes"
import { FishjamProvider } from "@fishjam-cloud/react-client"
import NiceModal from "@ebay/nice-modal-react"
import { system } from "./theme"
import App from "./App"

const FISHJAM_ID = import.meta.env.VITE_FISHJAM_ID as string

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ChakraProvider value={system}>
      <ThemeProvider attribute="class" disableTransitionOnChange forcedTheme="dark">
        <FishjamProvider fishjamId={FISHJAM_ID}>
          <NiceModal.Provider>
            <App />
          </NiceModal.Provider>
        </FishjamProvider>
      </ThemeProvider>
    </ChakraProvider>
  </StrictMode>,
)
