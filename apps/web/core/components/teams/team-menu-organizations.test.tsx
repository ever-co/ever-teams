/**
 * @jest-environment jsdom
 */
/**
 * The other organizations in the team menu (ever-co/ever-teams#5204): loading, failed, an organization with its teams,
 * one to open by a switch, the switch under way and a failed switch.
 */
import type { ReactNode } from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key
}));

jest.mock('@/core/components/common/dropdown-menu', () => {
	const Pass = ({ children }: { children?: ReactNode }) => <>{children}</>;
	return {
		DropdownMenuGroup: ({ children }: { children?: ReactNode }) => <div role="group">{children}</div>,
		DropdownMenuLabel: ({ children, title }: { children?: ReactNode; title?: string }) => (
			<div data-testid="group-label" title={title}>
				{children}
			</div>
		),
		DropdownMenuSeparator: () => <hr />,
		DropdownMenuItem: ({
			children,
			disabled,
			onClick
		}: {
			children?: ReactNode;
			disabled?: boolean;
			onClick?: () => void;
		}) => (
			<button type="button" role="menuitem" disabled={disabled} onClick={onClick}>
				{children}
			</button>
		),
		Pass
	};
});

jest.mock('@/core/components/common/entity-tile', () => ({ EntityTile: () => <span /> }));
jest.mock('@/core/components/common/skeleton', () => ({ Skeleton: () => <span /> }));

import type { ITeamMenuOrganization } from '@/core/lib/utils/team-menu-organizations';
import type { TOrganizationTeam } from '@/core/types/schemas';
import { TeamMenuOrganizations, type ITeamMenuOrganizationsProps } from './team-menu-organizations';

const labsDesign = { id: 'labs-design', name: 'Labs Design', organizationId: 'labs', members: [{}, {}] };
const labs: ITeamMenuOrganization = {
	id: 'labs',
	name: 'Labs',
	teams: [labsDesign as unknown as TOrganizationTeam],
	teamsListed: true
};
const agency: ITeamMenuOrganization = { id: 'agency', name: 'Agency', teams: [], teamsListed: false };

function renderMenu(overrides: Partial<ITeamMenuOrganizationsProps> = {}) {
	const props = renderProps(overrides);
	render(<TeamMenuOrganizations {...props} />);
	return props;
}

describe('TeamMenuOrganizations', () => {
	it('labels each other organization with its name and lists the teams Gauzy answered', () => {
		const props = renderMenu();

		expect(screen.getAllByTestId('group-label').map((label) => label.textContent)).toEqual(['Agency', 'Labs']);
		fireEvent.click(screen.getByRole('menuitem', { name: /Labs Design/ }));

		expect(props.onPickTeam).toHaveBeenCalledWith(labs, labsDesign);
		expect(screen.getByRole('menuitem', { name: /Labs Design/ })).toHaveTextContent('2');
	});

	it('offers an organization whose teams are not listed as one to open', () => {
		const props = renderMenu();

		fireEvent.click(screen.getByRole('menuitem', { name: 'switchers.OPEN_ORGANIZATION' }));

		expect(props.onPickOrganization).toHaveBeenCalledWith(agency);
	});

	it('disables every row while the timer runs or a switch is under way', () => {
		renderMenu({ isDisabled: true });

		for (const row of screen.getAllByRole('menuitem')) {
			expect(row).toBeDisabled();
		}
	});

	it('says why an organization could not be opened', () => {
		renderMenu({ failedOrganizationId: 'agency' });

		expect(screen.getByRole('alert')).toHaveTextContent('switchers.ORGANIZATION_SWITCH_FAILED');
	});

	it('shows the loading state, then nothing more for someone in one organization', () => {
		const { rerender } = render(
			<TeamMenuOrganizations {...renderProps({ isLoading: true })} />
		);
		expect(screen.getByRole('status', { name: 'switchers.OTHER_ORGANIZATIONS_LOADING' })).toBeInTheDocument();

		rerender(<TeamMenuOrganizations {...renderProps({ organizations: [] })} />);

		expect(screen.queryByRole('status')).not.toBeInTheDocument();
		expect(screen.queryAllByRole('menuitem')).toHaveLength(0);
	});

	it('offers to try again when the organizations could not be read', () => {
		const props = renderMenu({ isError: true });

		fireEvent.click(screen.getByRole('button', { name: 'switchers.TRY_AGAIN' }));

		expect(screen.getByRole('alert')).toHaveTextContent('switchers.OTHER_ORGANIZATIONS_FAILED');
		expect(props.onRetry).toHaveBeenCalled();
	});
});

function renderProps(overrides: Partial<ITeamMenuOrganizationsProps>): ITeamMenuOrganizationsProps {
	return {
		organizations: [agency, labs],
		isLoading: false,
		isError: false,
		onRetry: jest.fn(),
		isDisabled: false,
		switchingOrganizationId: null,
		failedOrganizationId: null,
		onPickTeam: jest.fn(),
		onPickOrganization: jest.fn(),
		countClassName: 'count',
		...overrides
	};
}
