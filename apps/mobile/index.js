import { registerRootComponent } from 'expo';

// The new app (Expo Router, src/app) opens only in builds made with EXPO_PUBLIC_APP_SHELL=next: the app people
// install keeps the current screens until the switch is decided. The value is set at build time, so the build of the
// current app leaves the new one out.
if (process.env.EXPO_PUBLIC_APP_SHELL === 'next') {
	require('expo-router/entry');
} else {
	const App = require('./App').default;
	// registerRootComponent calls AppRegistry.registerComponent('main', () => App) in Expo Go and native builds alike
	registerRootComponent(App);
}
