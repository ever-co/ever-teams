import { hasTokens, readStoredSession } from '../../app/services/client/secure-session';
import type { StoredSession } from '../../app/services/client/secure-session';
import { sessionInSnapshot, someoneWasSignedIn } from '../../app/models/helpers/session-snapshot';
import { sessionStateFrom } from './session';
import type { SessionState } from './session';

type ReadStoredSession = () => Promise<StoredSession>;

interface SavedWorkspace {
	tenantId?: string;
	organizationId?: string;
}

function workspaceIn(snapshot: unknown): SavedWorkspace {
	const authentication = (snapshot as { authenticationStore?: SavedWorkspace } | null)?.authenticationStore;
	return {
		tenantId: authentication?.tenantId || undefined,
		organizationId: authentication?.organizationId || undefined
	};
}

/**
 * The session the current app restores at start (`restoreSession` in setup-root-store.ts), in the same order and with
 * the same refusal, without writing anything: the current app moves and deletes tokens at its own next start.
 * Tokens an earlier version left in the snapshot come first. Tokens in the secure storage count only while the
 * snapshot says someone is signed in: otherwise a sign-out whose delete failed, or an iOS Keychain that outlived the
 * app, left them. A secure storage that cannot be read throws, and the caller treats that as signed out.
 */
export async function restoreSessionState(
	snapshot: unknown,
	readStored: ReadStoredSession = readStoredSession
): Promise<SessionState> {
	const workspace = workspaceIn(snapshot);
	const tokensOfAnEarlierVersion = sessionInSnapshot(snapshot);
	if (hasTokens(tokensOfAnEarlierVersion)) {
		return sessionStateFrom({ ...tokensOfAnEarlierVersion, ...workspace });
	}
	if (!someoneWasSignedIn(snapshot)) {
		return { status: 'signed-out' };
	}
	const stored = await readStored();
	return sessionStateFrom({ ...stored, ...workspace });
}
