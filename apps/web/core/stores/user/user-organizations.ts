import { workspaceDateFormatOf, workspaceNumberFormatOf } from '@/core/lib/utils/workspace-formats';
import { TOrganization } from '@/core/types/schemas/organization/organization.schema';
import { atom } from 'jotai';

export const currentOrganizationState = atom<TOrganization | null>(null);
export const currentOrganizationFetchingState = atom<boolean>(false);

/** The current organization's date format, null while it leaves every reader with their own language's way. */
export const workspaceDateFormatState = atom((get) => {
	const organization = get(currentOrganizationState);
	return workspaceDateFormatOf(organization?.dateFormat);
});

/** The current organization's number format, null while it leaves every reader with their own language's way. */
export const workspaceNumberFormatState = atom((get) => {
	const organization = get(currentOrganizationState);
	return workspaceNumberFormatOf(organization?.numberFormat);
});
