import { z } from 'zod';

/** One request invites at most this many people; a longer list is sent in several requests. */
export const MAX_EMAILS_PER_INVITE = 50;

/** An older client sends an empty role when none is picked: it still means the employee role. */
const pickedRoleIdSchema = z.union([z.guid(), z.literal('')]).optional();

/**
 * The body of `POST /api/invite/emails`: the addresses to invite and, from an admin, the role. An older client may
 * still send one `email`; it is read as a list of one. The team, organization and tenant come from the session.
 */
export const inviteEmailsBodySchema = z
	.union([
		z.object({ emails: z.array(z.email()).min(1).max(MAX_EMAILS_PER_INVITE), roleId: pickedRoleIdSchema }),
		z.object({ email: z.email(), roleId: pickedRoleIdSchema })
	])
	.transform((body) => {
		if ('emails' in body) {
			return { emails: body.emails, roleId: body.roleId };
		}

		return { emails: [body.email], roleId: body.roleId };
	});
