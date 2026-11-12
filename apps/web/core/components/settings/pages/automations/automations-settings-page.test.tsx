/** @jest-environment jsdom */

import { render, screen } from '@testing-library/react';

const mockNotFound = jest.fn();
let mockEnabled = false;
const mockAvailability = { availability: 'off', templates: [], retry: jest.fn() };

jest.mock('next/navigation', () => ({ notFound: () => mockNotFound() }));
jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key,
	useFormatter: () => ({ dateTime: () => '', relativeTime: () => '' })
}));
jest.mock('sonner', () => ({ toast: { error: jest.fn(), success: jest.fn() } }));
jest.mock('@/core/lib/utils/task-automations-enabled', () => ({ isTaskAutomationsEnabled: () => mockEnabled }));
jest.mock('@/core/components/settings/kit/team-settings-gate', () => ({
	TeamSettingsGate: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));
jest.mock('@/core/components/settings/kit/settings-page', () => ({
	SETTINGS_ROW_DESCRIPTION: '',
	SETTINGS_ROW_LABEL: '',
	SettingsPage: ({ title, children }: { title: string; children: React.ReactNode }) => (
		<section>
			<h1>{title}</h1>
			{children}
		</section>
	),
	SettingsSection: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	SettingsSurface: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));
jest.mock('@/core/components/common/notice', () => ({
	Notice: ({ title, description }: { title: string; description?: string }) => (
		<div role="status">
			{title} {description}
		</div>
	)
}));
jest.mock('@/core/hooks/task-automations/use-task-automations', () => ({
	useTaskAutomationsAvailability: () => mockAvailability,
	useTaskAutomationRules: () => ({ rules: [], status: 'ready' }),
	useTaskAutomationActions: () => ({})
}));
jest.mock('./automation-dialogs', () => ({
	AutomationRunsDialog: () => null,
	AutomationTemplateDialog: () => null,
	AutomationTestDialog: () => null,
	useTemplateText: () => () => ''
}));
jest.mock('./automation-pickers', () => ({ useAutomationLookups: () => ({}) }));
jest.mock('./automation-rule-editor', () => ({ AutomationRuleEditor: () => null }));

import { AutomationsSettingsPage } from './automations-settings-page';

describe('Settings → Automations while automations are off', () => {
	beforeEach(() => mockNotFound.mockReset());

	it('says automations are not available inside the settings page when the deployment has them off, not with the not-found page', () => {
		mockEnabled = false;
		render(<AutomationsSettingsPage />);
		expect(screen.getByRole('heading', { name: 'settings.entries.automations.TITLE' })).toBeTruthy();
		expect(screen.getByRole('status').textContent).toContain('settings.automations.UNAVAILABLE_TITLE');
		// The not-found page carries the app's footer links, which the egress audit does not allow on a settings route.
		expect(mockNotFound).not.toHaveBeenCalled();
	});

	it('says the same when the switch is on but the platform does not run automations (its routes answer 404)', () => {
		mockEnabled = true;
		mockAvailability.availability = 'unavailable';
		render(<AutomationsSettingsPage />);
		expect(screen.getByRole('status').textContent).toContain('settings.automations.UNAVAILABLE_TITLE');
		expect(mockNotFound).not.toHaveBeenCalled();
	});

	it('says the same when the availability hook reports the switch off, without the not-found page', () => {
		mockEnabled = true;
		mockAvailability.availability = 'off';
		render(<AutomationsSettingsPage />);
		expect(screen.getByRole('status').textContent).toContain('settings.automations.UNAVAILABLE_TITLE');
		expect(mockNotFound).not.toHaveBeenCalled();
	});
});
