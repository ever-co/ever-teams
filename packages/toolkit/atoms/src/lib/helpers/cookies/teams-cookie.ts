const COOKIE_NAME = 'teams-cookie-function';
const DEFAULT_PATH = '/';

interface CookieOptions {
	expires?: Date;
	maxAge?: number;
	domain?: string;
	path?: string; // default: '/'
	secure?: boolean;
	httpOnly?: boolean;
	sameSite?: boolean | 'lax' | 'strict' | 'none';
	priority?: 'low' | 'medium' | 'high';
	encode?: (value: string) => string;
	partitioned?: boolean;
}

const getTeamsCookie = (): string | null => {
	const cookies = document.cookie.split('; ');
	const cookie = cookies.find((c) => c.startsWith(`${COOKIE_NAME}=`));
	return cookie ? cookie.split('=')[1] : null;
};

const deleteTeamsCookie = () => {
	document.cookie = `${COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
};

const setTeamsCookie = (data: string, options: CookieOptions) => {
	const { expires, path = DEFAULT_PATH, ...restOptions } = options;

	document.cookie = `teams-session=${data}; path=${path}; expires=${expires?.toUTCString()}; ${Object.entries(
		restOptions
	)
		.map(([key, value]) => `${key}=${value}`)
		.join('; ')}`;
};

export { getTeamsCookie, deleteTeamsCookie, setTeamsCookie };
