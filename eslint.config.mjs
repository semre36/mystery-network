import nextConfig from "eslint-config-next";

const eslintConfig = [
  ...nextConfig,
  {
    ignores: [".next/**", "node_modules/**", "out/**", "build/**", "dist/**", "next-env.d.ts"],
  },
];

export default eslintConfig;
