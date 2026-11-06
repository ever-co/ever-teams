/** How a control the user may not use is dimmed, as the other settings a member may not change. */
const READ_ONLY_OPACITY = 0.5;

/** The opacity of a control: dimmed when the user may not use it. */
export function readOnlyOpacity(readOnly: boolean): number {
	if (readOnly) {
		return READ_ONLY_OPACITY;
	}
	return 1;
}
