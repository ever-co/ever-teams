import { EBaseEntityEnum } from '@/core/types/generics/enums/entity';
import { EEmployeeNotificationType } from '@/core/types/interfaces/common/employee-notification';
import { meetingNoticeOf, meetingReminderMinutesOf, minutesOfLeadText } from './meeting-notices';

describe('meetingReminderMinutesOf', () => {
	it('reads the lead as Gauzy does: 15 by default, none for null or 0, the default for a value it would not take', () => {
		expect(meetingReminderMinutesOf(undefined)).toBe(15);
		expect(meetingReminderMinutesOf({})).toBe(15);
		expect(meetingReminderMinutesOf({ meetingReminderMinutes: 30 })).toBe(30);
		expect(meetingReminderMinutesOf({ meetingReminderMinutes: null })).toBeNull();
		expect(meetingReminderMinutesOf({ meetingReminderMinutes: 0 })).toBeNull();
		expect(meetingReminderMinutesOf({ meetingReminderMinutes: 2.5 })).toBe(15);
		expect(meetingReminderMinutesOf({ meetingReminderMinutes: 2000 })).toBe(15);
	});
});

const meeting = (title: string) => ({
	type: EEmployeeNotificationType.Meeting,
	title,
	entity: EBaseEntityEnum.EmployeeAppointment,
	entityId: 'appointment-1'
});

describe('meetingNoticeOf', () => {
	// The titles Gauzy files (`meeting-notification.rules.ts`), word for word: change both sides, or neither
	it('reads the titles Gauzy files', () => {
		expect(meetingNoticeOf(meeting('You are invited to "Sprint review"'))).toEqual({
			kind: 'invited',
			title: 'Sprint review',
			minutes: null,
			appointmentId: 'appointment-1'
		});
		expect(meetingNoticeOf(meeting('You are no longer invited to "Sprint review"'))?.kind).toBe('removed');
		expect(meetingNoticeOf(meeting('"Sprint review" was changed'))?.kind).toBe('changed');
		expect(meetingNoticeOf(meeting('"Sprint review" was cancelled'))?.kind).toBe('cancelled');
		expect(meetingNoticeOf(meeting('"Sprint review" starts in 15 minutes'))).toEqual({
			kind: 'reminder',
			title: 'Sprint review',
			minutes: 15,
			appointmentId: 'appointment-1'
		});
		expect(meetingNoticeOf(meeting('"Sprint review" is starting'))?.kind).toBe('starting');
	});

	it('keeps a title that holds quotes and words of the patterns', () => {
		expect(meetingNoticeOf(meeting('"Review "Q4" - was changed?" starts in 1 hour 30 minutes'))).toEqual({
			kind: 'reminder',
			title: 'Review "Q4" - was changed?',
			minutes: 90,
			appointmentId: 'appointment-1'
		});
	});

	it('reads a title of another shape as a change of the meeting, and nothing of another kind', () => {
		expect(meetingNoticeOf(meeting('Something new happened'))).toEqual({
			kind: 'changed',
			title: null,
			minutes: null,
			appointmentId: 'appointment-1'
		});
		expect(meetingNoticeOf({ ...meeting('"x" was changed'), type: EEmployeeNotificationType.Assignment })).toBeNull();
		expect(meetingNoticeOf({ ...meeting('"x" was changed'), entity: 'Task' })?.appointmentId).toBeNull();
	});
});

describe('minutesOfLeadText', () => {
	it('reads the lead Gauzy names', () => {
		expect(minutesOfLeadText('1 minute')).toBe(1);
		expect(minutesOfLeadText('15 minutes')).toBe(15);
		expect(minutesOfLeadText('2 hours')).toBe(120);
		expect(minutesOfLeadText('1 hour 5 minutes')).toBe(65);
		expect(minutesOfLeadText('soon')).toBeNull();
		expect(minutesOfLeadText('')).toBeNull();
	});
});
