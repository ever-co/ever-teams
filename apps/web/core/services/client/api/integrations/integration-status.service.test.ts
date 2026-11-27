/**
 * The status read of each task import provider (Asana, Jira, Linear, Trello) as it leaves the client: a platform with
 * the provider's plugin off answers 404, which the integrations page reads as the provider hidden and the client keeps
 * out of its error log; any other failure still fails the read and is logged.
 */
import { integrationProviderStatus } from '@/core/hooks/integrations/integration-provider-status';
import { expectOnly404Quiet } from '@/test/api/refusing-client';
import { asanaIntegrationService } from './asana.service';
import { jiraIntegrationService } from './jira.service';
import { linearIntegrationService } from './linear.service';
import { trelloIntegrationService } from './trello.service';

const PROVIDERS = [
	['Asana', asanaIntegrationService],
	['Jira', jiraIntegrationService],
	['Linear', linearIntegrationService],
	['Trello', trelloIntegrationService]
] as const;

describe('task import providers: the status read', () => {
	afterEach(() => jest.restoreAllMocks());

	it.each(PROVIDERS)(
		'%s: keeps the 404 of a provider that is off out of the error log, and still logs a 500',
		async (_name, service) => {
			const notFound = await expectOnly404Quiet(service, () => service.status('organization-1'));

			// What the integrations page reads as the provider not offered (`use-*-integration.ts`)
			expect(
				integrationProviderStatus({
					enabled: true,
					organizationId: 'organization-1',
					isPending: false,
					isError: true,
					error: notFound,
					configured: false,
					connected: false
				})
			).toBe('hidden');
		}
	);
});
