/** @jest-environment jsdom */

import { act, fireEvent, render, screen } from '@testing-library/react';
import { WorkspacePrivateProjectsSection } from './workspace-private-projects-section';
import type { TOrganization } from '@/core/types/schemas';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key
}));

const LABEL = 'pages.projects.visibility.SETTING_LABEL';

function renderSection(organization: Partial<TOrganization>, canEdit = true) {
	const save = jest.fn(async () => undefined);
	const view = render(
		<WorkspacePrivateProjectsSection
			organization={{ id: 'organization-a', name: 'Acme', ...organization } as TOrganization}
			canEdit={canEdit}
			saveEnforcePrivateProjects={save}
		/>
	);
	return { save, ...view };
}

describe('the Private projects section of the workspace settings', () => {
	it('is not shown by a Gauzy without the setting, which would refuse to save it', () => {
		const { container } = renderSection({});

		expect(container.innerHTML).toBe('');
	});

	it('shows the stored value, off by default', () => {
		renderSection({ enforcePrivateProjects: false });

		expect(screen.getByRole('switch', { name: LABEL }).getAttribute('aria-checked')).toBe('false');
	});

	it('saves the setting when an admin turns it on', async () => {
		const { save } = renderSection({ enforcePrivateProjects: false });

		await act(async () => {
			fireEvent.click(screen.getByRole('switch', { name: LABEL }));
		});

		expect(save).toHaveBeenCalledWith(true);
	});

	it('is read only for someone who cannot edit the workspace', () => {
		const { save } = renderSection({ enforcePrivateProjects: true }, false);
		const settingSwitch = screen.getByRole('switch', { name: LABEL });

		fireEvent.click(settingSwitch);

		expect(settingSwitch.getAttribute('aria-checked')).toBe('true');
		expect(save).not.toHaveBeenCalled();
	});
});
