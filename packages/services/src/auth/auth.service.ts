import { EVER_TEAMS_API_BASE_URL } from '@ever-teams/constants';
// types
// services
import { APIService } from '../api.service';

/**
 * Service class for handling authentication-related operations
 * Provides methods for user authentication, password management, and session handling
 * @extends {APIService}
 */
export class AuthService extends APIService {
	/**
	 * Creates an instance of AuthService
	 * Initializes with the base API URL
	 */
	constructor(BASE_URL?: string) {
		super(BASE_URL || EVER_TEAMS_API_BASE_URL);
	}

	async generateUniqueCode(data: { email: string }): Promise<any> {
		return this.post('/auth/generate-unique-code/', data);
	}

	async signOut(baseUrl: string): Promise<any> {
		const form = document.createElement('form');
		form.method = 'POST';
		form.action = `${baseUrl}/auth/logout/`;
	}
}
