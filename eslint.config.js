const expo = require('eslint-config-expo/flat');

module.exports = [
  {
    ignores: ['.expo/**'],
  },
  ...expo,
];
