// @ts-check

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import reactRecommended from "eslint-plugin-react/configs/recommended.js";
import reactHooksPlugin, { rules } from "eslint-plugin-react-hooks";
/** @type {"off"} */
const off = "off";

/** @type {"warn"} */
const warn = "warn";

/** @type {"error"} */
const error = "error";

const url = new URL("postgres://");
url.host = process.env.PGHOST || "postgres";
url.port = process.env.PGPORT || "5432";
url.pathname = process.env.PGDATABASE || "postgres";
url.username = process.env.PGUSER || "postgres";
url.password = process.env.PGPASSWORD || "postgres";

const ignores = [
  "packages/*/dist/**",
  "packages/*/dist/**",
];

/** @type {import('@typescript-eslint/utils').TSESLint.FlatConfig.ConfigFile} */
export default tseslint.config(
  // Extend the recommended eslint config.
  {
    ignores,
    rules: { ...eslint.configs.recommended.rules, "no-undef": off },
  },

  // Extend the recommended typescript-eslint configs.
  ...tseslint.configs.recommended.map((config) => {
    return {
      ...config,
      ignores,
      rules: {
        ...config.rules,
        "@typescript-eslint/no-unused-vars": off,
        "@typescript-eslint/no-non-null-assertion": error,
        "@typescript-eslint/no-explicit-any": warn
      },
    };
  }),

  // Extend the recommended prettier configs.
  { ...eslintPluginPrettierRecommended, ignores },

  // Extend the react configs.
  {
    ...reactRecommended,
    files: ["packages/{interface|example}/**/*.{js,jsx,mjs,cjs,ts,tsx}"],
    settings: {
      ...reactRecommended.settings,
      react: {
        ...reactRecommended.settings?.react,
        version: "detect",
      },
    },
    ignores,
  },

  // Extend the react-hooks configs.
  {
    ...reactHooksPlugin.configs["recommended-latest"],
    files: ["packages/{interface|example}/**/*.{js,jsx,mjs,cjs,ts,tsx}"],
    ignores,
  },

  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["*.js", "*.ts"],
        },
        tsconfigRootDir: process.cwd(),
      },
    },
  },
);