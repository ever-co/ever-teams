export interface IApiTeamsConfig {
	apiUrl: string;
	apiVersion?: string;
	environment?: 'development' | 'production' | 'test';
}

// The API one caller's requests go to, for a page that talks to more than one: the request functions take it as their
// last argument. Without it, or without its apiUrl, a request goes to the address set with setConfig().
export interface IApiRequestConfig {
	apiUrl?: string;
}

// The package ships an ES and a CommonJS build. A page that loads both (a host imports this package while a
// dependency requires it) runs two copies of this module: they share one configuration, kept on globalThis, so a
// setConfig() through either reaches the requests of both.
const SHARED_CONFIG_KEY: unique symbol = Symbol.for('@ever-teams/api/config');

// listeners: what subscribe() was given, through either copy. A holder an older copy made has none until a subscribe().
type SharedConfig = { config: IApiTeamsConfig; listeners?: Set<() => void> };

type SharedConfigHolder = typeof globalThis & { [SHARED_CONFIG_KEY]?: SharedConfig };

function sharedConfig(): SharedConfig {
	const holder = globalThis as SharedConfigHolder;
	return (holder[SHARED_CONFIG_KEY] ??= { config: { apiUrl: 'https://api.ever.team/api' } });
}

class ApiConfigManager {
	private static instance: ApiConfigManager;
	private readonly shared = sharedConfig();

	private constructor() {}

	static getInstance(): ApiConfigManager {
		if (!ApiConfigManager.instance) {
			ApiConfigManager.instance = new ApiConfigManager();
		}
		return ApiConfigManager.instance;
	}

	setConfig(config: Partial<IApiTeamsConfig>) {
		// Callers pass `{ apiUrl: <env value> }`, which is `undefined` when the deployment did not set it.
		// A plain spread would wipe the default above and every request would go to `undefined/<path>`,
		// i.e. a relative URL against the app's own origin. Undefined means "leave it as it is".
		const defined = Object.fromEntries(
			Object.entries(config).filter(([, value]) => value !== undefined)
		) as Partial<IApiTeamsConfig>;

		const previous = this.shared.config;
		const next = { ...previous, ...defined };
		this.shared.config = next;

		const keys = Object.keys(next) as (keyof IApiTeamsConfig)[];
		const changed = keys.some((key) => next[key] !== previous[key]);
		if (!changed) {
			return;
		}
		// A copy: a listener that unsubscribes while it runs does not skip the next one.
		const listeners = new Set(this.listeners());
		for (const listener of listeners) {
			listener();
		}
	}

	getConfig(): IApiTeamsConfig {
		return this.shared.config;
	}

	// Calls `listener` after each setConfig() that changes the configuration, made through either copy of the package;
	// returns the function that stops it. A TeamsProvider without an apiUrl of its own hears so that the page's address
	// changed under it.
	subscribe(listener: () => void): () => void {
		const listeners = this.listeners();
		listeners.add(listener);
		return () => {
			listeners.delete(listener);
		};
	}

	private listeners(): Set<() => void> {
		this.shared.listeners ??= new Set();
		return this.shared.listeners;
	}
}

export const apiConfigManager = ApiConfigManager.getInstance();
