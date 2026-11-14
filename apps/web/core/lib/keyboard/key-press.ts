import { chordOfEvent, isTypingTarget, sameChord, type ShortcutBinding } from './shortcuts';

type KeyPress = Pick<
	KeyboardEvent,
	'key' | 'code' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey' | 'target' | 'defaultPrevented' | 'isComposing'
>;

/**
 * Whether a key press is the one chord of a binding, taken the way the registry's listener takes a press: never one
 * another listener already took, never one made while composing a character, never a bare key typed in a field (a
 * chord with ⌘/Ctrl counts there too). A sequence never matches: one press is one chord. `byPhysicalKey` false reads
 * every key by the character typed, as the app does while the registry is off.
 */
export function pressesBinding(
	event: KeyPress,
	binding: ShortcutBinding | null | undefined,
	byPhysicalKey: boolean
): boolean {
	const isTaken = event.defaultPrevented || event.isComposing;
	if (isTaken) {
		return false;
	}
	if (binding?.length !== 1) {
		return false;
	}
	const chord = chordOfEvent(event, byPhysicalKey);
	if (!chord) {
		return false;
	}
	const isTextTyped = isTypingTarget(event.target) && !chord.mod;
	if (isTextTyped) {
		return false;
	}
	return sameChord(binding[0], chord);
}
