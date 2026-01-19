module.exports = function(api) {
  api.cache(true);
  
  const isTest = process.env.NODE_ENV === 'test';
  
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Only use react-native-dotenv in non-test environments
      // In tests, we use jest mocks instead
      !isTest && ['module:react-native-dotenv', {
        moduleName: '@env',
        path: '.env',
        safe: false,
        allowUndefined: true,
      }],
      'react-native-reanimated/plugin', // Must be last
    ].filter(Boolean),
  };
};