import nextConfig from "eslint-config-next";

const eslintConfig = [
  ...nextConfig,
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
    ignores: [".next/**", "node_modules/**", "out/**", "build/**", "dist/**", "next-env.d.ts"],
  },
];

export default eslintConfig;
