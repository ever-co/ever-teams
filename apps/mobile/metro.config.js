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

/** @type {import('expo/metro-config').MetroConfig} */
const config = getSentryExpoConfig(__dirname);
config.resolver.unstable_conditionNames = ['browser', 'require', 'react-native'];

module.exports = config;
