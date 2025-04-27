export const EVER_TEAMS_API_BASE_URL = process.env.NEXT_PUBLIC_EVER_TEAMS_API_URL || '';
export const EVER_TEAMS_API_BASE_PATH = process.env.NEXT_PUBLIC_EVER_TEAMS_API_BASE_PATH || '/';
export const EVER_TEAMS_API_URL = encodeURI(`${EVER_TEAMS_API_BASE_URL}${EVER_TEAMS_API_BASE_PATH}`);

// # Ever Teams Web App Base Url
export const WEB_BASE_URL = process.env.NEXT_PUBLIC_WEB_BASE_URL || 'https://app.ever.team';
export const WEB_BASE_PATH = process.env.NEXT_PUBLIC_WEB_BASE_PATH || '/';
export const WEB_URL = encodeURI(`${WEB_BASE_URL}${WEB_BASE_PATH}`);

// # Ever Teams website url
export const WEBSITE_URL = process.env.NEXT_PUBLIC_WEBSITE_URL || 'https://ever.team';
