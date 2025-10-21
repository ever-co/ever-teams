require('dotenv').config({
	path: ['.env.local', '.env']
});

const port = process.env.PORT || 3030;

console.log(`NextJs is starting on Port 3030. You can open https://localhost:${port} to view it in the browser.`);

const isProduction = process.env.NODE_ENV === 'production';

const isSentryEnabled = isProduction && process.env.SENTRY_DSN;

console.log(`isProduction: ${isProduction}`);

console.log(`isSentryEnabled: ${isSentryEnabled}`);

if (process.env.GAUZY_API_SERVER_URL) {
	console.log(
		`Using Gauzy API from NextJs backend defined by GAUZY_API_SERVER_URL: ${process.env.GAUZY_API_SERVER_URL}`
	);
} else {
	console.warn(`GAUZY_API_SERVER_URL not defined`);
}

if (process.env.NEXT_PUBLIC_GAUZY_API_SERVER_URL) {
	console.log(
		`Using Gauzy API directly from frontend defined by NEXT_PUBLIC_GAUZY_API_SERVER_URL: ${process.env.NEXT_PUBLIC_GAUZY_API_SERVER_URL}`
	);
} else {
	console.warn(`Using Gauzy API via backend API 'proxy' because env NEXT_PUBLIC_GAUZY_API_SERVER_URL not defined`);
}
