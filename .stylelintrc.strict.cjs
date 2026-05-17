module.exports = {
  extends: [
    'stylelint-config-standard',
    'stylelint-config-tailwindcss'
  ],
  ignoreFiles: ['src/index.css', 'src/styles/legacy.css', 'src/styles/theme.css', 'public/**', 'node_modules/**', 'dist/**'],
  rules: {
    'at-rule-no-unknown': [true, { ignoreAtRules: ['tailwind', 'apply', 'variants', 'responsive', 'screen', 'layer'] }],
    'length-zero-no-unit': true,
  }
};
