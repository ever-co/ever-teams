import { z } from 'zod';

/** One switch per notification type, the keys of Gauzy's notification setting DTO. */
export const notificationSettingSwitchesSchema = z
	.object({
		assignment: z.boolean().optional(),
		mention: z.boolean().optional(),
		comment: z.boolean().optional(),
		invitation: z.boolean().optional(),
		message: z.boolean().optional(),
		payment: z.boolean().optional()
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
