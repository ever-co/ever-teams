/** @jest-environment jsdom */

import { fireEvent, render, screen } from '@testing-library/react';
import { TeamTrackingSection } from './team-tracking-section';

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

const OWN_TRACKING = 'settings.teamGeneral.OWN_TRACKING_LABEL';

function renderSection({
	canEdit,
	canTurnOwnTracking,
	isOwnTrackingPending = false
}: {
	canEdit: boolean;
	canTurnOwnTracking: boolean;
	isOwnTrackingPending?: boolean;
}) {
	const save = jest.fn().mockResolvedValue(undefined);
	const setOwnTracking = jest.fn().mockResolvedValue(undefined);
	render(
		<TeamTrackingSection
			team={{ id: 'team-a', shareProfileView: true, requirePlanToTrack: false } as never}
			canEdit={canEdit}
			ownTracking={true}
			canTurnOwnTracking={canTurnOwnTracking}
			isOwnTrackingPending={isOwnTrackingPending}
			setOwnTracking={setOwnTracking}
			setShareProfileView={save}
			setRequirePlanToTrack={save}
		/>
	);
	return { setOwnTracking };
}

describe('Team settings: tracking section (#5015)', () => {
	it('offers an admin the switch of their own tracking in the team', () => {
		renderSection({ canEdit: true, canTurnOwnTracking: true });

		expect(screen.getByText(OWN_TRACKING)).toBeTruthy();
	});

	it('does not offer it to a team manager, whose tracking only an admin may switch', () => {
		renderSection({ canEdit: true, canTurnOwnTracking: false });

		expect(screen.queryByText(OWN_TRACKING)).toBeNull();
		// The team's own rules stay theirs to change
		expect(screen.getByText('settings.teamGeneral.SHARE_PROFILES_LABEL')).toBeTruthy();
		expect(screen.getAllByRole('switch')).toHaveLength(2);
	});

	it('keeps the own switch busy until the permissions are known, so an admin cannot save half of it', () => {
		const { setOwnTracking } = renderSection({
			canEdit: true,
			canTurnOwnTracking: true,
			isOwnTrackingPending: true
		});

		const ownSwitch = screen.getByRole('switch', { name: OWN_TRACKING });
		expect(ownSwitch.getAttribute('aria-busy')).toBe('true');
		fireEvent.click(ownSwitch);

		expect(setOwnTracking).not.toHaveBeenCalled();
	});

	it('lets the admin use it once they are known', () => {
		const { setOwnTracking } = renderSection({ canEdit: true, canTurnOwnTracking: true });

		fireEvent.click(screen.getByRole('switch', { name: OWN_TRACKING }));

		expect(setOwnTracking).toHaveBeenCalledWith(false);
	});
});
