/**
 * If you're using Sentry
 *   RN   https://docs.sentry.io/platforms/react-native/
 *   Expo https://docs.expo.dev/guides/using-sentry/
 */
import * as Sentry from '@sentry/react-native';
// Expo-specific imports for tags and extras
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import * as Updates from 'expo-updates';

/**
 * If you're using Crashlytics: https://rnfirebase.io/crashlytics/usage
 */
// import crashlytics from "@react-native-firebase/crashlytics"

/**
 * If you're using Bugsnag:
 *   RN   https://docs.bugsnag.com/platforms/react-native/)
 *   Expo https://docs.bugsnag.com/platforms/react-native/expo/
 */
// import Bugsnag from "@bugsnag/react-native"
// import Bugsnag from "@bugsnag/expo"

/**
 *  This is where you put your crash reporting service initialization code to call in `./app/app.tsx`
 */
let isInitialized = false;

export const initCrashReporting = () => {
	// Guard against multiple initializations
	if (isInitialized) {
		return;
	}

	if (process.env.EXPO_PUBLIC_SENTRY_DSN) {
		isInitialized = true;
		Sentry.init({
			dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
			debug: __DEV__, // If `true`, Sentry will try to print out useful debugging information if something goes wrong with sending the event. Set it to `false` in production

			// Gate PII by env var; DSN is public but PII is not.
			sendDefaultPii: process.env.EXPO_PUBLIC_SENTRY_SEND_PII === 'true',

			// Avoid noisy logs in production
			enableLogs: __DEV__,

			// Be explicit; default off in prod unless enabled via env
			replaysSessionSampleRate: __DEV__ ? 1.0 : Number(process.env.EXPO_PUBLIC_SENTRY_REPLAY_SAMPLE_RATE ?? 0),
			replaysOnErrorSampleRate: __DEV__
				? 1.0
				: Number(process.env.EXPO_PUBLIC_SENTRY_REPLAY_ON_ERROR_SAMPLE_RATE ?? 0),

			integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],

			// Environment from Updates.channel when available, fallback to dev/prod
			environment: Updates.channel || (__DEV__ ? 'development' : 'production')

			// uncomment the line below to enable Spotlight (https://spotlightjs.com)
			// spotlight: __DEV__,
		});

		// Add Expo-specific tags and extras (previously handled by sentry-expo)
		Sentry.setExtras({
			manifest: Updates.manifest,
			deviceYearClass: Device.deviceYearClass,
			linkingUri: Constants.linkingUri
		});

		Sentry.setTag('expoChannel', Updates.channel);
		Sentry.setTag('appVersion', Application.nativeApplicationVersion);
		Sentry.setTag('deviceId', Constants.sessionId);
		Sentry.setTag('executionEnvironment', Constants.executionEnvironment);
		Sentry.setTag('expoGoVersion', Constants.expoVersion);
		Sentry.setTag('expoRuntimeVersion', Constants.expoRuntimeVersion);
	}
	// Bugsnag.start("YOUR API KEY")
};
/**
 * Error classifications used to sort errors on error reporting services.
 */
export enum ErrorType {
	/**
	 * An error that would normally cause a red screen in dev
	 * and force the user to sign out and restart.
	 */
	FATAL = 'Fatal',
	/**
	 * An error caught by try/catch where defined using Reactotron.tron.error.
	 */
	HANDLED = 'Handled'
}

/**
 * Manually report a handled error.
 */
export const reportCrash = (error: any, type: ErrorType = ErrorType.FATAL) => {
	if (__DEV__) {
		// Log to console and Reactotron in development
		const message = error.message || 'Unknown';
		console.error(error);
		console.log(message, type);
		console.tron.log(error);
	} else {
		// In production, utilize crash reporting service of choice below:
		if (process.env.EXPO_PUBLIC_SENTRY_DSN) {
			// Set error type as tag for better categorization
			Sentry.withScope((scope) => {
				scope.setTag('errorType', type);
				Sentry.captureException(error);
			});
			// Use direct captureException (no more .Native needed)
			Sentry.captureException(error);
		}
		// crashlytics().recordError(error)
		// Bugsnag.notify(error)
	}
};
