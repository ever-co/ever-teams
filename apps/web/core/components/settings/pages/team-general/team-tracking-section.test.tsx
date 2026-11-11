/** @jest-environment jsdom */

import { render, screen } from '@testing-library/react';
import { TeamTrackingSection } from './team-tracking-section';

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

const OWN_TRACKING = 'settings.teamGeneral.OWN_TRACKING_LABEL';

function renderSection({ canEdit, canTurnOwnTracking }: { canEdit: boolean; canTurnOwnTracking: boolean }) {
	const save = jest.fn().mockResolvedValue(undefined);
	render(
		<TeamTrackingSection
			team={{ id: 'team-a', shareProfileView: true, requirePlanToTrack: false } as never}
			canEdit={canEdit}
			ownTracking={true}
			canTurnOwnTracking={canTurnOwnTracking}
			setOwnTracking={save}
			setShareProfileView={save}
			setRequirePlanToTrack={save}
		/>
	);
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
});
