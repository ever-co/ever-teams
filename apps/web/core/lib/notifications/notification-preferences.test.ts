import { EEmployeeNotificationType } from '@/core/types/interfaces/common/employee-notification';
import {
	defaultEmailModeOf,
	digestHourOf,
	emailModeOf,
	isTimeOfDay,
	ownEmailModeOf,
	pushOnFor,
	quietHoursOf,
	withPreferencePatch
} from './notification-preferences';

describe('notification preferences', () => {
	it('reads the email mode of every kind, with true as at once and false as never', () => {
		expect(defaultEmailModeOf(null)).toBe('immediate');
		expect(defaultEmailModeOf({ email: true })).toBe('immediate');
		expect(defaultEmailModeOf({ email: false })).toBe('off');
		expect(defaultEmailModeOf({ email: 'digest' })).toBe('digest');
	});

	it("reads a kind's own mode before the one of every kind", () => {
		const preferences = { email: 'digest' as const, emailByType: { Mention: 'immediate' as const } };
		expect(emailModeOf(preferences, EEmployeeNotificationType.Mention)).toBe('immediate');
		expect(emailModeOf(preferences, EEmployeeNotificationType.Comment)).toBe('digest');
		expect(emailModeOf({ emailByType: { Mention: 'sometimes' as never } }, EEmployeeNotificationType.Mention)).toBe('immediate');
		expect(ownEmailModeOf(preferences, EEmployeeNotificationType.Mention)).toBe('immediate');
		expect(ownEmailModeOf(preferences, EEmployeeNotificationType.Comment)).toBeNull();
	});

	it('keeps only a well-formed quiet-hours window, and a digest hour of the day', () => {
		expect(quietHoursOf({ dnd: { start: '22:00', end: '07:00', timeZone: 'Europe/Sofia' } })).toEqual({ start: '22:00', end: '07:00', timeZone: 'Europe/Sofia' });
		expect(quietHoursOf({ dnd: { start: 'late', end: '07:00' } })).toBeNull();
		expect(quietHoursOf({ dnd: null })).toBeNull();
		expect(isTimeOfDay('8:05')).toBe(true);
		expect(isTimeOfDay('24:00')).toBe(false);
		expect(digestHourOf({ digestHour: 17 })).toBe(17);
		expect(digestHourOf({ digestHour: 99 })).toBe(8);
		expect(digestHourOf(null)).toBe(8);
	});

	it('merges a patch into the preferences: per-type modes and the window merge, a null window clears it', () => {
		const current = { email: 'digest' as const, emailByType: { Mention: 'immediate' as const }, dnd: { start: '22:00', end: '07:00', timeZone: 'UTC' } };
		expect(withPreferencePatch(current, { emailByType: { Comment: 'off' } })).toEqual({
			email: 'digest',
			emailByType: { Mention: 'immediate', Comment: 'off' },
			dnd: { start: '22:00', end: '07:00', timeZone: 'UTC' }
		});
		expect(withPreferencePatch(current, { dnd: { start: '21:00', end: '07:00' } }).dnd).toEqual({ start: '21:00', end: '07:00', timeZone: 'UTC' });
		expect(withPreferencePatch(current, { emailByType: { Mention: undefined } }).emailByType).toEqual({});
		expect(withPreferencePatch(current, { dnd: null }).dnd).toBeNull();
		expect(withPreferencePatch(null, { digestHour: 9 })).toEqual({ digestHour: 9 });
	});

	it("reads a kind's own push switch before the one of every kind, and push as on when neither is set", () => {
		expect(pushOnFor(null, EEmployeeNotificationType.Mention)).toBe(true);
		expect(pushOnFor({ push: false }, EEmployeeNotificationType.Mention)).toBe(false);
		expect(pushOnFor({ push: false, pushByType: { Mention: true } }, EEmployeeNotificationType.Mention)).toBe(true);
		expect(pushOnFor({ pushByType: { Mention: false } }, EEmployeeNotificationType.Mention)).toBe(false);
		expect(pushOnFor({ pushByType: { Mention: false } }, EEmployeeNotificationType.Comment)).toBe(true);
		expect(pushOnFor({ pushByType: { Mention: 'no' as never } }, EEmployeeNotificationType.Mention)).toBe(true);
	});

	it('merges the per-type push switches like the email modes, and keeps the other preferences', () => {
		const current = { email: 'digest' as const, pushByType: { Mention: false } };
		expect(withPreferencePatch(current, { pushByType: { Comment: false } })).toEqual({
			email: 'digest',
			pushByType: { Mention: false, Comment: false }
		});
		expect(withPreferencePatch(current, { pushByType: { Mention: undefined } }).pushByType).toEqual({});
		expect(withPreferencePatch(current, { digestHour: 9 }).pushByType).toEqual({ Mention: false });
	});
});
