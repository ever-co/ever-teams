/** @jest-environment jsdom */

jest.mock('@/core/hooks/task-automations/use-task-automations', () => ({ useTaskAutomationsAvailability: jest.fn() }));
jest.mock('@/core/hooks/settings/use-user-api-tokens', () => ({ useUserApiTokensAvailability: jest.fn() }));
jest.mock('@/core/hooks/auth/use-two-factor-settings', () => ({ useTwoFactorStatus: jest.fn() }));
jest.mock('@/core/hooks/settings/use-embeds', () => ({ useEmbedsAvailability: jest.fn() }));

import { renderHook } from '@testing-library/react';
import { entriesOfGroup, type SettingsEntryId } from '@/core/components/settings/kit/settings-entries';
import { useTwoFactorStatus } from '@/core/hooks/auth/use-two-factor-settings';
import { useUserApiTokensAvailability } from '@/core/hooks/settings/use-user-api-tokens';
import { useEmbedsAvailability } from '@/core/hooks/settings/use-embeds';
import { useTaskAutomationsAvailability } from '@/core/hooks/task-automations/use-task-automations';
import {
	hiddenSettingsEntriesOf,
	showsApiTokensEntry,
	showsAutomationsEntry,
	showsEmbedsEntry,
	showsSecurityEntry,
	useHiddenSettingsEntries
} from './use-hidden-settings-entries';

describe('the Automations settings entry', () => {
	it('shows only while the platform says it has the automations', () => {
		expect(showsAutomationsEntry('available')).toBe(true);
		// A person the platform refuses still finds the page, which tells them why.
		expect(showsAutomationsEntry('forbidden')).toBe(true);
		expect(showsAutomationsEntry('error')).toBe(true);
		expect(showsAutomationsEntry('off')).toBe(false);
		expect(showsAutomationsEntry('unavailable')).toBe(false);
		expect(showsAutomationsEntry('loading')).toBe(false);
	});

	it('is a manager’s Team entry, left out when hidden', () => {
		const ids = (canManage: boolean, hidden?: ReadonlySet<'automations'>) =>
			entriesOfGroup('team', canManage, hidden).map((entry) => entry.id);
		expect(ids(true)).toContain('automations');
		expect(ids(false)).not.toContain('automations');
		expect(ids(true, new Set(['automations']))).not.toContain('automations');
		expect(ids(true, new Set(['automations']))).toContain('integrations');
	});
});

describe('the API tokens settings entry (#5209)', () => {
	it('shows only once the server says it has personal API tokens on', () => {
		expect(showsApiTokensEntry('enabled')).toBe(true);
		expect(showsApiTokensEntry('disabled')).toBe(false);
		expect(showsApiTokensEntry('loading')).toBe(false);
		expect(showsApiTokensEntry('error')).toBe(false);
	});

	it('hides each optional entry on its own answer', () => {
		const accountIds = (hidden: ReadonlySet<SettingsEntryId>) =>
			entriesOfGroup('account', true, hidden).map((entry) => entry.id);
		const bothShown = hiddenSettingsEntriesOf({
			showsAutomations: true,
			showsApiTokens: true,
			showsSecurity: true,
			showsEmbeds: true
		});
		const tokensHidden = hiddenSettingsEntriesOf({
			showsAutomations: true,
			showsApiTokens: false,
			showsSecurity: true,
			showsEmbeds: true
		});
		const automationsHidden = hiddenSettingsEntriesOf({
			showsAutomations: false,
			showsApiTokens: true,
			showsSecurity: true,
			showsEmbeds: true
		});

		expect([...bothShown]).toEqual([]);
		expect(accountIds(bothShown)).toContain('apiTokens');
		expect(accountIds(tokensHidden)).not.toContain('apiTokens');
		expect([...automationsHidden]).toEqual(['automations']);
		expect(accountIds(automationsHidden)).toContain('apiTokens');
	});
});

describe('the Embeds settings entry (#5437)', () => {
	it('shows only to an administrator, once the server says embeds are on', () => {
		expect(showsEmbedsEntry('enabled')).toBe(true);
		expect(showsEmbedsEntry('disabled')).toBe(false);
		expect(showsEmbedsEntry('forbidden')).toBe(false);
		expect(showsEmbedsEntry('error')).toBe(false);
		expect(showsEmbedsEntry('loading')).toBe(false);
	});

	it('is a Workspace entry, left out when hidden', () => {
		const ids = (hidden?: ReadonlySet<'embeds'>) =>
			entriesOfGroup('workspace', false, hidden).map((entry) => entry.id);
		expect(ids()).toContain('embeds');
		expect(ids(new Set(['embeds']))).toEqual(['workspaceGeneral']);
	});
});

describe('the Security settings entry', () => {
	it('shows once the platform answers the two-factor state, never on an API without it', () => {
		expect(showsSecurityEntry('ready')).toBe(true);
		expect(showsSecurityEntry('error')).toBe(true);
		expect(showsSecurityEntry('unsupported')).toBe(false);
		expect(showsSecurityEntry('loading')).toBe(false);
	});

	it('is an Account entry for everyone, left out when hidden', () => {
		const ids = (hidden?: ReadonlySet<'security'>) =>
			entriesOfGroup('account', false, hidden).map((entry) => entry.id);
		expect(ids()).toContain('security');
		expect(ids(new Set(['security']))).not.toContain('security');
		expect(ids(new Set(['security']))).toContain('notifications');
	});
});

describe('useHiddenSettingsEntries', () => {
	beforeEach(() => {
		jest.mocked(useTaskAutomationsAvailability)
			.mockReset()
			.mockReturnValue({ availability: 'loading' } as never);
		jest.mocked(useUserApiTokensAvailability)
			.mockReset()
			.mockReturnValue({ availability: 'loading' } as never);
		jest.mocked(useTwoFactorStatus)
			.mockReset()
			.mockReturnValue({ availability: 'loading' } as never);
		jest.mocked(useEmbedsAvailability)
			.mockReset()
			.mockReturnValue({ availability: 'loading' } as never);
	});

	// The command palette lists the settings pages on every page: a page load must not ask (startup-performance.cy.ts)
	it('asks the platform nothing while it is not asked to, and hides the optional entries meanwhile', () => {
		const { result } = renderHook(() => useHiddenSettingsEntries(true, false));

		expect(useTaskAutomationsAvailability).toHaveBeenLastCalledWith(false);
		expect(useUserApiTokensAvailability).toHaveBeenLastCalledWith(false);
		expect(useTwoFactorStatus).toHaveBeenLastCalledWith(false);
		expect(useEmbedsAvailability).toHaveBeenLastCalledWith(false);
		expect([...result.current].sort((a, b) => a.localeCompare(b))).toEqual([
			'apiTokens',
			'automations',
			'embeds',
			'security'
		]);
	});

	it('asks every probe once asked, the automations only of a manager', () => {
		renderHook(() => useHiddenSettingsEntries(true, true));
		expect(useTaskAutomationsAvailability).toHaveBeenLastCalledWith(true);
		expect(useUserApiTokensAvailability).toHaveBeenLastCalledWith(true);
		expect(useTwoFactorStatus).toHaveBeenLastCalledWith(true);
		expect(useEmbedsAvailability).toHaveBeenLastCalledWith(true);

		renderHook(() => useHiddenSettingsEntries(false));
		expect(useTaskAutomationsAvailability).toHaveBeenLastCalledWith(false);
		expect(useUserApiTokensAvailability).toHaveBeenLastCalledWith(true);
		expect(useTwoFactorStatus).toHaveBeenLastCalledWith(true);
	});
});
