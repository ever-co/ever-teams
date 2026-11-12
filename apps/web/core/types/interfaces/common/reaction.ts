import { ID } from './base-interfaces';

/** Someone who reacted, as a reader of the comment sees them. */
export interface IReactionReactor {
	employeeId: ID;
	name: string;
	imageUrl?: string | null;
}

/**
 * The reactions of one emoji on one comment, as the platform's `GET /reaction/comments` answers them: how many, who
 * (in the order they reacted), and whether the caller is one of them.
 */
export interface IReactionSummary {
	entity: 'Comment';
	entityId: ID;
	emoji: string;
	count: number;
	reactedByMe: boolean;
	reactionId?: ID | null;
	reactors: IReactionReactor[];
}

/** A reaction to post: the platform toggles it (a second post of the same emoji takes it back). */
export interface IReactionToggleInput {
	entity: 'Comment';
	entityId: ID;
	emoji: string;
	tenantId: ID;
	organizationId: ID;
}
