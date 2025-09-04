/** @type {import('prettier').Config} */
export const baseConfig = {
  htmlWhitespaceSensitivity: 'ignore',
  printWidth: 80,
  quoteProps: 'consistent',
  singleQuote: true,
};

/** @type {import('prettier').Config} */
export const prettierConfig = {
  ...baseConfig,
};

export default prettierConfig;
