import { z } from 'zod';

const timeOfDaySchema = z.string().regex(/^([01]?\d|2[0-3]):([0-5]\d)$/, 'HH:mm');
const emailModeSchema = z.enum(['immediate', 'digest', 'off']);

/** The delivery preferences of the setting (`preferences`): the email modes, the quiet hours, the digest hour. */
export const notificationPreferencesSchema = z
	.object({
		email: z.union([emailModeSchema, z.boolean()]).optional(),
		emailByType: z.record(z.string().max(64), emailModeSchema).optional(),
		push: z.boolean().optional(),
		taskUpdate: z.boolean().optional(),
		dnd: z
			.object({ start: timeOfDaySchema, end: timeOfDaySchema, timeZone: z.string().max(64).optional() })
			.strict()
			.nullable()
			.optional(),
		digestHour: z.number().int().min(0).max(23).optional()
	})
	.strict();

/** One switch per notification type, the keys of Gauzy's notification setting DTO, and the preferences. */
export const notificationSettingSwitchesSchema = z
	.object({
		assignment: z.boolean().optional(),
		mention: z.boolean().optional(),
		comment: z.boolean().optional(),
		invitation: z.boolean().optional(),
		message: z.boolean().optional(),
		payment: z.boolean().optional(),
		preferences: notificationPreferencesSchema.optional()
	})
	.strip();

/**
 * The receiver's own state on one notification. Gauzy's update route writes the body as given, so the sender,
 * the receiver, the type and the text never go through.
 */
export const notificationPatchSchema = z
	.object({
		isRead: z.boolean().optional(),
		readAt: z.iso.datetime().nullable().optional(),
		isArchived: z.boolean().optional(),
		archivedAt: z.iso.datetime().nullable().optional(),
		onHoldUntil: z.iso.datetime().nullable().optional()
	})
	.strict();
