import { EVER_TEAMS_API_BASE_URL } from '@ever-teams/constants';
import { APIService } from '../api.service';

/**
 * Service class for managing projects within Ever Teams.
 *
 * Provides CRUD operations for project entities.
 *
 * @class
 * @extends {APIService}
 */
export class ProjectService extends APIService {
	/**
	 * Initializes the ProjectService with a specified or default API base URL.
	 *
	 * @param {string} [baseURL] - Optional override for the default API base URL.
	 */
	constructor(baseURL: string = EVER_TEAMS_API_BASE_URL) {
		super(baseURL);
	}

	/**
	 * Fetches a paginated list of projects, optionally filtered.
	 *
	 * @param {object} [params] - Optional filters (e.g., organizationId, status, search keyword).
	 * @returns {Promise<PaginatedResponse<IProject>>}
	 */
	async fetchProjects(params?: Record<string, any>) {
		try {
			const response = await this.get('/api/projects/', { params });
			return response.data;
		} catch (error: any) {
			throw error?.response?.data || error;
		}
	}

	/**
	 * Fetches a single project by its ID.
	 *
	 * @param {string} projectId - The project identifier.
	 * @returns {Promise<any>}
	 */
	async fetchProjectById(projectId: string) {
		try {
			const response = await this.get<any>(`/api/projects/${projectId}/`);
			return response.data;
		} catch (error: any) {
			throw error?.response?.data || error;
		}
	}

	/**
	 * Creates a new project.
	 *
	 * @param {CreateProjectDTO} data - New project data.
	 * @returns {Promise<any>}
	 */
	async createProject(data: any) {
		try {
			const response = await this.post<any>('/api/projects/', data);
			return response.data;
		} catch (error: any) {
			throw error?.response?.data || error;
		}
	}

	/**
	 * Updates an existing project.
	 *
	 * @param {string} projectId - The project identifier.
	 * @param {UpdateProjectDTO} data - Partial project update data.
	 * @returns {Promise<any>}
	 */
	async updateProject(projectId: string, data: any) {
		try {
			const response = await this.patch<any>(`/api/projects/${projectId}/`, data);
			return response.data;
		} catch (error: any) {
			throw error?.response?.data || error;
		}
	}

	/**
	 * Deletes a project by its ID.
	 *
	 * @param {string} projectId - The project identifier.
	 * @returns {Promise<void>}
	 */
	async deleteProject(projectId: string): Promise<void> {
		try {
			await this.delete<void>(`/api/projects/${projectId}/`);
		} catch (error: any) {
			throw error?.response?.data || error;
		}
	}
}
