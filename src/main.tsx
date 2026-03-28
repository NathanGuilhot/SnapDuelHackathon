import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { ChakraProvider } from "@chakra-ui/react"
import { ThemeProvider } from "next-themes"
import NiceModal from "@ebay/nice-modal-react"
import { system } from "./theme"
import App from "./App"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ChakraProvider value={system}>
      <ThemeProvider attribute="class" disableTransitionOnChange>
        <NiceModal.Provider>
          <App />
        </NiceModal.Provider>
      </ThemeProvider>
    </ChakraProvider>
  </StrictMode>,
)
