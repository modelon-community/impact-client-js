const rootEslintConfig = require('../.eslintrc')

module.exports = {
    ...rootEslintConfig,
    rules: {
        '@typescript-eslint/no-var-requires': 0,
    },
}
