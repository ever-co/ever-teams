import qs from 'qs';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import type {
	IEmployeePlaceholderBulkCreateInput,
	IEmployeePlaceholderBulkCreateResult,
	IEmployeePlaceholderClaimInput,
	IEmployeePlaceholderCreateInput,
	IEmployeePlaceholderEmployee,
	IEmployeePlaceholderMergeInput,
	IEmployeePlaceholderMergePreview,
	IEmployeePlaceholderMergeResult
} from '@/core/types/interfaces/organization/employee-placeholder';
import { APIService } from '../../api.service';

const ROUTE = '/employee-placeholder';

function placeholderRoute(placeholderId: string, action: string): string {
	return `${ROUTE}/${encodeURIComponent(placeholderId)}/${action}`;
}

/**
 * Members without an account (Gauzy `/api/employee-placeholder`, ever-co/ever-gauzy#11913; in proxy mode this app's
 * `/api/employee-placeholder` twins). Every call names its tenant and organization: Gauzy reads a member of another
 * organization as missing.
 */
class EmployeePlaceholderService extends APIService {
	/** One member without an account, optionally in some teams of the organization. */
	create = async (input: IEmployeePlaceholderCreateInput): Promise<IEmployeePlaceholderEmployee> => {
		const { data } = await this.post<IEmployeePlaceholderEmployee>(ROUTE, input, { tenantId: input.tenantId });
		return data;
	};

	/** Many at once, for an import: a row whose email a member already has stands for that member. */
	createBulk = async (input: IEmployeePlaceholderBulkCreateInput): Promise<IEmployeePlaceholderBulkCreateResult> => {
		const { data } = await this.post<IEmployeePlaceholderBulkCreateResult>(`${ROUTE}/bulk`, input, {
			tenantId: input.tenantId
		});
		return data;
	};

	/** Invites the person to claim their time: accepting moves it to their own account. */
	sendClaim = async (placeholderId: string, input: IEmployeePlaceholderClaimInput): Promise<void> => {
		await this.post(placeholderRoute(placeholderId, 'claim'), input, { tenantId: input.tenantId });
	};

	/** What a merge into the member would move. Writes nothing. */
	previewMerge = async (
		placeholderId: string,
		input: IEmployeePlaceholderMergeInput
	): Promise<IEmployeePlaceholderMergePreview> => {
		const query = qs.stringify(input);
		const { data } = await this.get<IEmployeePlaceholderMergePreview>(
			`${placeholderRoute(placeholderId, 'merge-preview')}?${query}`,
			{ tenantId: input.tenantId }
		);
		return data;
	};

	/** Moves everything of the member without an account to the member, and removes it. */
	merge = async (
		placeholderId: string,
		input: IEmployeePlaceholderMergeInput
	): Promise<IEmployeePlaceholderMergeResult> => {
		const { data } = await this.post<IEmployeePlaceholderMergeResult>(
			placeholderRoute(placeholderId, 'merge'),
			input,
			{
				tenantId: input.tenantId
			}
		);
		return data;
	};
}

export const employeePlaceholderService = new EmployeePlaceholderService(GAUZY_API_BASE_SERVER_URL.value);
