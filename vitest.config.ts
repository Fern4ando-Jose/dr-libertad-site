import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Vitest mínimo. Resolve o alias "@/..." igual ao tsconfig (paths "@/*" → src/*).
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    // "video/**" entrou 2026-07-16 (brand-grade.ts/KenBurns.tsx viraram lib pura o
    // bastante pra testar sem DOM — só matemática de grade e escolha de modo, sem
    // renderizar componente). Antes só "src/**" era varrido.
    include: ["src/**/*.test.ts", "video/**/*.test.ts"],
  },
});
