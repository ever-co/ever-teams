import { z } from 'zod';
import { MAX_EMAILS_PER_INVITE } from './invite';

/** The longest workspace or team name the form takes: Gauzy keeps them in short text columns. */
export const MAX_WORKSPACE_NAME_LENGTH = 60;

const nameSchema = z.string().trim().min(1).max(MAX_WORKSPACE_NAME_LENGTH);

/**
 * The body of `POST /api/auth/create-workspace` (#5025): the workspace's name, its first team's (the workspace's
 * name when left out), and the addresses invited to that team. Who creates it comes from the session.
 */
export const createWorkspaceBodySchema = z.object({
	name: nameSchema,
	teamName: nameSchema.optional(),
	invites: z
		.array(z.email())
		.max(MAX_EMAILS_PER_INVITE)
		.default([])
		.transform((emails) => [...new Set(emails.map((email) => email.trim().toLowerCase()))])
});

export type CreateWorkspaceBody = z.infer<typeof createWorkspaceBodySchema>;

/**
 * The addresses typed in the invite field, one per line or separated by commas, semicolons or spaces: the valid ones
 * (once each, in lower case) and the ones that are not addresses, to say so.
 */
export function inviteAddressesOf(text: string): { valid: string[]; invalid: string[] } {
	const parts = text
		.split(/[\s,;]+/)
		.map((part) => part.trim())
		.filter(Boolean);
	const valid: string[] = [];
	const invalid: string[] = [];
	for (const part of parts) {
		if (z.email().safeParse(part).success) {
			const address = part.toLowerCase();
			if (!valid.includes(address)) valid.push(address);
		} else {
			invalid.push(part);
		}
	}
	return { valid, invalid };
}
