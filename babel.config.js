module.exports = function (api) {
  const isTest = api.env('test');
  if (isTest) {
    return {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        '@babel/preset-typescript',
        ['@babel/preset-react', { runtime: 'automatic' }],
      ],
    };
  }
  return {
    presets: [require('expo/node_modules/babel-preset-expo')],
  };
};
