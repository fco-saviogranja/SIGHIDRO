module.exports = {
  extends: [
    'stylelint-config-standard',
    'stylelint-config-tailwindcss',
    'stylelint-config-prettier'
  ],
  ignoreFiles: ['src/styles/legacy.css', 'public/**', 'node_modules/**', 'dist/**'],
  rules: {
    'at-rule-no-unknown': [true, { ignoreAtRules: ['tailwind', 'apply', 'variants', 'responsive', 'screen'] }],
    'color-hex-case': 'lower',
    'string-quotes': 'double',
    'declaration-block-trailing-semicolon': 'always',
    'block-opening-brace-newline-after': 'always-single-line',
    'block-closing-brace-newline-after': 'always-multi-line',
    'function-comma-space-after': 'always-single-line',
    'max-empty-lines': 2,
    'number-leading-zero': 'always',
    'length-zero-no-unit': true,
    // enforce lowercase class names (legacy file excluded)
    'selector-class-pattern': '^[a-z0-9\-]+$'
  }
};
