/** @type {import('prettier').Config} */
export default {
  // Your base style preferences
  printWidth: 120,
  semi: true,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'es5',
  useTabs: false,
  proseWrap: 'never',
  bracketSpacing: true,
  arrowParens: 'always',

  // Plugins are loaded in order. Tailwind must always be placed last!
  plugins: ['prettier-plugin-svelte', 'prettier-plugin-tailwindcss'],
  tailwindConfig: './tailwind.config.mjs',
  overrides: [
    {
      files: '*.svelte',
      options: { parser: 'svelte' },
    },
  ],
};
