/**
 * This file is loaded in React Native and exports the RN version
 * of Reactotron's client.
 *
 * Web is loaded from reactotronClient.web.ts.
 */

// Import Reactotron
import Reactotron from 'reactotron-react-native';
import { mst } from 'reactotron-mst';

// Create a safe version of Reactotron that won't crash in production
const safeReactotron = {
	...Reactotron,
	// Add any missing methods that might be causing issues
	configure: Reactotron.configure || (() => {}),
	connect: Reactotron.connect || (() => {}),
	use: Reactotron.use || (() => {}),
	display: Reactotron.display || (() => {}),
	log: Reactotron.log || (() => {}),
	warn: Reactotron.warn || (() => {}),
	error: Reactotron.error || (() => {}),
	clear: Reactotron.clear || (() => {}),
	onCustomCommand: Reactotron.onCustomCommand || (() => {}),
	setAsyncStorageHandler: Reactotron.setAsyncStorageHandler || (() => {}),
	useReactNative: Reactotron.useReactNative || (() => {})
};

// Initialize Reactotron in development
if (__DEV__) {
	try {
		// Configure Reactotron
		safeReactotron.configure({
			name: 'Ever Teams Mobile',
			host: 'localhost'
		});

		// Add MST plugin
		safeReactotron.use(mst());

		// Connect to Reactotron
		safeReactotron.connect();
	} catch (error) {
		console.warn('Reactotron initialization error:', error);
	}
}

// Export the safe version
export { safeReactotron as Reactotron };
