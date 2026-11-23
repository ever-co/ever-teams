/** A workspace an email and password open: what the kit lists, and the token that signs in to it. */
export interface WorkspaceChoice {
	token: string;
	// The workspace's name (its tenant's); empty when the API names none.
	name: string;
}

type UnknownRecord = Record<string, unknown>;

function recordOf(value: unknown): UnknownRecord | null {
	if (typeof value !== 'object' || value === null) {
		return null;
	}
	return value as UnknownRecord;
}

function textOf(value: unknown): string {
	if (typeof value !== 'string') {
		return '';
	}
	return value;
}

function choiceOf(workspace: unknown): WorkspaceChoice | null {
	const entry = recordOf(workspace);
	const token = textOf(entry?.token);
	if (!token) {
		return null;
	}
	const tenant = recordOf(recordOf(entry?.user)?.tenant);
	return { token, name: textOf(tenant?.name) };
}

/**
 * The workspaces of the answer of `POST /auth/signin.email.password` (ever-co/ever-teams#5700), in the API's order;
 * an entry without a token is left out, since nothing could sign in to it.
 *
 * @param answer The list of workspaces the email and password open.
 */
export function workspaceChoicesOf(answer: object): WorkspaceChoice[] {
	const workspaces = (answer as { workspaces?: unknown }).workspaces;
	if (!Array.isArray(workspaces)) {
		return [];
	}
	const choices: WorkspaceChoice[] = [];
	for (const workspace of workspaces) {
		const choice = choiceOf(workspace);
		if (choice) {
			choices.push(choice);
		}
	}
	return choices;
}
