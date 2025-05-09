/* eslint-disable camelcase */
import { serverFetch } from '../fetch';

/**
 * Creates a project in an organization
 * @param {Object} data - Project creation data
 * @param {string} data.name - Project name
 * @param {string} data.tenantId - Tenant ID
 * @param {string} data.organizationId - Organization ID
 * @param {string} bearer_token - Authentication token
 * @returns {Promise} - Promise resolving to created project data
 */
export function createOrganizationProjectRequest(data, bearer_token) {
    return serverFetch({
        path: '/organization-projects',
        method: 'POST',
        body: data,
        bearer_token,
        tenantId: data.tenantId // Make sure tenantId is included both in body and as param
    });
}
