// Learn more https://docs.expo.io/guides/customizing-metro
//
// Sentry is wired through getSentryExpoConfig (Sentry's documented Expo integration), NOT the
// generic withSentryConfig(getDefaultConfig(...)) wrapper this file used before. The wrapper
// replaces Metro's serializer and then reads the result back as { code, map }; from Expo SDK 57
// (Metro 0.84 / @expo/metro-config 57) the Expo serializer no longer returns that shape, and
// the first SDK 57 bundle died with:
//
//   TypeError: Cannot read properties of undefined (reading 'match')
//     at determineDebugIdFromBundleSource (@sentry/react-native/dist/js/tools/utils.js)
//
// getSentryExpoConfig instead injects the debug-ID module through Expo's own
// unstable_beforeAssetSerializationPlugins hook, so it composes with the Expo serializer rather
// than wrapping it. Same Sentry features (release injection, frames collapse, debug IDs).
const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const { withReactNavigationFromExpoRouter } = require('./metro/react-navigation-copies');

// The current screens import @react-navigation/* themselves, which Expo CLI refuses from the app unless this variable
// is set. Those imports resolve to Expo Router's own copy (metro/react-navigation-copies.js), so the screens and the
// routes share one navigation. Expo CLI reads this variable after loading this file.
process.env.EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK = '1';

/** @type {import('expo/metro-config').MetroConfig} */
const config = getSentryExpoConfig(__dirname);
config.resolver.unstable_conditionNames = ['browser', 'require', 'react-native'];
config.resolver.resolveRequest = withReactNavigationFromExpoRouter(config.resolver.resolveRequest);

module.exports = config;
