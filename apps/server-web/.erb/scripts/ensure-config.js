/**
 * Generates a default config.ts for the server-web app if one does not exist.
 * This allows `yarn build` to work end-to-end without manual prep steps.
 * The generated config uses sensible development defaults.
 * For production builds, use `yarn prepare:config:server-web` from the repo root
 * to generate a proper environment-specific config.
 */
const fs = require('fs');
const path = require('path');

// Use process.cwd() since Turbo sets CWD to the package directory,
// while __dirname may resolve to a symlinked path in node_modules.
const configDir = path.join(process.cwd(), 'src', 'configs');
const configFile = path.join(configDir, 'config.ts');

if (fs.existsSync(configFile)) {
	console.log('✔ config.ts already exists, skipping generation');
	process.exit(0);
}

// Ensure the directory exists
if (!fs.existsSync(configDir)) {
	fs.mkdirSync(configDir, { recursive: true });
}

const defaultConfig = `export const config = {
	production: false,
	I18N_FILES_URL: '',
	COMPANY_SITE_LINK: 'https://ever.team/',
	COMPANY_GITHUB_LINK: 'https://github.com/ever-co/ever-teams',
	NAME: 'ever-teams-server-web',
	DESCRIPTION: 'Ever Teams Server Web',
	APP_ID: 'com.ever.teams.serverweb',
	REPO_NAME: 'ever-teams-web-server',
	REPO_OWNER: 'ever-co',
	WELCOME_TITLE: 'Welcome to Ever Teams Web Server',
	WELCOME_CONTENT: 'Ever Teams Web Server is a web application that allows you to manage your teams and projects.',
	PLATFORM_LOGO: 'https://app.ever.team/assets/ever-teams.png',
	GAUZY_DESKTOP_LOGO_512X512: 'assets/icons/desktop_logo_512x512.png',
	DESKTOP_WEB_SERVER_APP_DEFAULT_API_URL: 'http://localhost:3000',
	DESKTOP_WEB_SERVER_APP_DEFAULT_PORT: '3333',
	GAUZY_API_SERVER_URL: 'http://localhost:3000',
	NEXT_PUBLIC_GAUZY_API_SERVER_URL: 'http://localhost:3000',
	DESKTOP_WEB_SERVER_HOSTNAME: '0.0.0.0',
	TERM_OF_SERVICE: 'https://ever.team/tos',
	PRIVACY_POLICY: 'https://ever.team/privacy',
	AUTH_SECRET: 'development_auth_secret'
};
`;

fs.writeFileSync(configFile, defaultConfig);
console.log('✔ Generated default config.ts for development at:', configFile);
