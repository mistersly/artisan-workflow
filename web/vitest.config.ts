import { configDefaults, defineConfig, mergeConfig } from "vitest/config"
import viteConfig from "./vite.config.ts"

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./src/test/setup.ts"],
      css: false,
      coverage: { provider: "v8", reporter: ["text", "html"] },
      exclude: [...configDefaults.exclude, "e2e/**"],
    },
  }),
)
