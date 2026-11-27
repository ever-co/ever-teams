/**
 * The history scope (user, workspace, team, as `chatHistoryKey` spells it) Ever SI works in right now, known without
 * loading the chat or the AI SDK: the shell reports it (`useEverSiScopeWatcher`), sign-out ends it
 * (`clearChatHistoryForUser`), and the chat's store, once loaded, stops the answers of a scope that ended.
 */
type LiveChatScopeListener = (liveKey: string | null) => void;

/** `undefined` until the shell first reports a scope, `null` once none is live (signed out). */
let liveKey: string | null | undefined;
const listeners = new Set<LiveChatScopeListener>();

export function setLiveChatScope(key: string | null) {
	if (key === liveKey) {
		return;
	}
	liveKey = key;
	for (const listener of listeners) {
		listener(key);
	}
}

/** Whether a conversation of this scope may still be written: not once its scope has ended. */
export function isChatScopeLive(key: string) {
	if (liveKey === undefined) {
		return true;
	}
	return liveKey === key;
}

export function onLiveChatScopeChange(listener: LiveChatScopeListener) {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}
