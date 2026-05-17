module.exports = {
  ignoreFiles: ['**/dist/**', '**/node_modules/**', 'public/**'],
  defaultSeverity: 'warning',
  rules: {
    // Keep config minimal to avoid version/peer-dependency conflicts.
    'no-empty-source': null,
    // Allow project-specific patterns (Tailwind, css variables, utility-first)
    'at-rule-no-unknown': null,
    'alpha-value-notation': null,
    'color-function-notation': null,
    'color-function-alias-notation': null,
    'no-descending-specificity': null,
    'declaration-block-single-line-max-declarations': null,
    'selector-class-pattern': null
  }
}
