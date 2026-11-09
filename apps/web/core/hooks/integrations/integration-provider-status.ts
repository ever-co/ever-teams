import { ApiErrorService } from '@/core/services/client/api-error.service';

/** What a task import provider (Linear, Asana, Trello) shows on the integrations page. */
export type IntegrationProviderStatus = 'hidden' | 'loading' | 'loadError' | 'notConfigured' | 'notConnected' | 'connected';

/** Whether a read failed with 404: the platform does not offer the provider (its plugin is off). */
export function isNotFoundError(error: unknown): boolean {
	if (ApiErrorService.isApiError(error)) return error.statusCode === 404 || error.hasHttpResponseStatus(404);
	return (error as { response?: { status?: number } } | null)?.response?.status === 404;
}

export interface IntegrationProviderStatusInput {
	/** Whether this deployment shows the provider at all. */
	enabled: boolean;
	organizationId: string | null;
	/** The platform's status read of the provider. */
	isPending: boolean;
	isError: boolean;
	error: unknown;
	/** Whether the platform has the provider's application set up (its answer when the read succeeded). */
	configured: boolean;
	/** Whether the organization holds a connection. */
	connected: boolean;
}

/**
 * The provider's state from its status read: hidden when switched off here or not offered by the platform (404),
 * loading until the organization and the read are known, then connected, set up but not connected, or not set up.
 */
export function integrationProviderStatus(input: IntegrationProviderStatusInput): IntegrationProviderStatus {
	if (!input.enabled) return 'hidden';
	if (!input.organizationId || input.isPending) return 'loading';
	if (input.isError) return isNotFoundError(input.error) ? 'hidden' : 'loadError';
	if (input.connected) return 'connected';
	return input.configured ? 'notConnected' : 'notConfigured';
}
