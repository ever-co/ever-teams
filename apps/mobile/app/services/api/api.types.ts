/**
 * These types indicate the shape of the data you expect to receive from your
 * API endpoint, assuming it's a JSON object like we have.
 */
export interface EpisodeItem {
	title: string;
	pubDate: string;
	link: string;
	guid: string;
	author: string;
	thumbnail: string;
	description: string;
	content: string;
	enclosure: {
		link: string;
		type: string;
		length: number;
		duration: number;
		rating: { scheme: string; value: string };
	};
	categories: string[];
}

export interface IUser {
	firstName: string;
	lastName?: string;
	email: string;
	imageUrl?: string;
	tenantId?: string;
	thirdPartyId?: string;
	username?: string;
	preferredLanguage: string;
	preferredComponentLayout?: string;
	isActive: boolean;
	roleId?: string;
	id: string;
}

export interface ITenant {
	name: string;
	logo?: string;
	id: string;
}

export interface ApiFeedResponse {
	status: string;
	feed: {
		url: string;
		title: string;
		link: string;
		author: string;
		description: string;
		image: string;
	};
	items: EpisodeItem[];
}

export interface SignupApiResponse {
	status: string;
	user: IUser;
}

export interface LoginApiResponse extends SignupApiResponse {
	token: string;
	refresh_token: string;
}

export interface CreateTenantResponse {
	status: string;
	tenant: ITenant;
}

/**
 * The options used to configure apisauce.
 */
export interface ApiConfig {
	/**
	 * The URL of the api.
	 */
	url: string;

	/**
	 * Milliseconds before we timeout the request.
	 */
	timeout: number;
}
