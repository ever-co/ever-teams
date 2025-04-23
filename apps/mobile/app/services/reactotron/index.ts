// Export a simplified version of Reactotron that works with Hermes
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import Reactotron
let Reactotron;
if (__DEV__) {
	try {
		// Dynamic import to avoid issues with Hermes
		const ReactotronModule = require('reactotron-react-native').default;
		const { mst } = require('reactotron-mst');

		// Create a safe version of Reactotron
		Reactotron = {
			...ReactotronModule,
			// Add any missing methods that might be causing issues
			configure: ReactotronModule.configure || (() => {}),
			connect: ReactotronModule.connect || (() => {}),
			use: ReactotronModule.use || (() => {}),
			display: ReactotronModule.display || (() => {}),
			log: ReactotronModule.log || (() => {}),
			warn: ReactotronModule.warn || (() => {}),
			error: ReactotronModule.error || (() => {}),
			clear: ReactotronModule.clear || (() => {}),
			onCustomCommand: ReactotronModule.onCustomCommand || (() => {}),
			setAsyncStorageHandler: ReactotronModule.setAsyncStorageHandler || (() => {}),
			useReactNative: ReactotronModule.useReactNative || (() => {})
		};

		// Configure Reactotron
		Reactotron.configure({
			name: 'Ever Teams Mobile',
			host: 'localhost'
		});

		// Add MST plugin
		Reactotron.use(mst());

		// Connect to Reactotron
		Reactotron.connect();

		// Set up AsyncStorage if needed
		if (Platform.OS !== 'web') {
			Reactotron.setAsyncStorageHandler(AsyncStorage);
		}
	} catch (error) {
		console.warn('Reactotron initialization error:', error);
		// Create a mock Reactotron if initialization fails
		Reactotron = {
			configure: () => {},
			connect: () => {},
			use: () => {},
			display: () => {},
			log: () => {},
			warn: () => {},
			error: () => {},
			clear: () => {},
			onCustomCommand: () => {},
			setAsyncStorageHandler: () => {},
			useReactNative: () => {}
		};
	}
} else {
	// Create a mock Reactotron for production
	Reactotron = {
		configure: () => {},
		connect: () => {},
		use: () => {},
		display: () => {},
		log: () => {},
		warn: () => {},
		error: () => {},
		clear: () => {},
		onCustomCommand: () => {},
		setAsyncStorageHandler: () => {},
		useReactNative: () => {}
	};
}

// Export Reactotron
export { Reactotron };

// Export setup functions
export function setupReactotron() {
	// This function is now a no-op since we've already set up Reactotron
	if (__DEV__) {
		console.log('Reactotron is already set up');
	}
}

export function setReactotronRootStore(rootStore, initialData) {
	if (__DEV__) {
		// Display the root store in Reactotron
		Reactotron.display({
			name: 'ROOT STORE',
			value: rootStore,
			preview: 'Current State'
		});

		// Display initial data
		Reactotron.display({
			name: 'INITIAL DATA',
			value: initialData,
			preview: 'Initial State'
		});
	}
}
