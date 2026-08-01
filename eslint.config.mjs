// Configuração do ESLint no formato "flat" (o único que o ESLint 9 lê).
//
// Estava assim desde a subida para o Next 16: o `.eslintrc.json` ficou no
// formato antigo, que o ESLint 9 não abre mais, e o script chamava `next lint`,
// um comando que o Next 16 removeu — ele passava a entender "lint" como o nome
// de uma pasta e reclamava que ela não existe. Resultado: `npm run lint` nunca
// rodava, e ninguém era avisado de nada.
//
// O eslint-config-next 16 já publica as regras neste formato, então não há
// dependência nova a instalar: é só importar.
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "public/**",
      "next-env.d.ts",
    ],
  },
  ...nextCoreWebVitals,
];

export default config;
