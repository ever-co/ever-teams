import { weekStartOf } from '@/core/lib/utils/dashboard-period';
import {
	workspaceClockOf,
	workspaceCurrencyPositionOf,
	workspaceDateFormatOf,
	workspaceNumberFormatOf
} from '@/core/lib/utils/workspace-formats';
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

/** The current organization's clock, 12 or 24 hours, null until the organization is read. */
export const workspaceClockState = atom((get) => {
	const organization = get(currentOrganizationState);
	return workspaceClockOf(organization?.timeFormat);
});

/** The side of an amount the current organization writes its currency sign on, null until it is read. */
export const workspaceCurrencyPositionState = atom((get) => {
	const organization = get(currentOrganizationState);
	return workspaceCurrencyPositionOf(organization?.currencyPosition);
});

/** The current organization's first day of the week, Monday until it is read or when it stores none. */
export const workspaceWeekStartState = atom((get) => {
	const organization = get(currentOrganizationState);
	return weekStartOf(organization?.startWeekOn);
});
