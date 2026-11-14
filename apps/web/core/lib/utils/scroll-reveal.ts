/** A stretch of a horizontal scroller's content, measured from the content's left edge. */
export interface ContentSpan {
	start: number;
	end: number;
}

/** What a horizontal scroller shows: how far it is scrolled, how wide it is, how wide its content is. */
export interface ScrollerView {
	scrollLeft: number;
	viewWidth: number;
	contentWidth: number;
}

function clampedScrollLeft(scrollLeft: number, maxScrollLeft: number) {
	const atLeastStart = Math.max(0, scrollLeft);
	return Math.min(atLeastStart, maxScrollLeft);
}

/** A position within `room` of an end goes all the way to it, so the scroller never stops a few pixels short. */
function snappedToEnds(scrollLeft: number, maxScrollLeft: number, room: number) {
	if (scrollLeft <= room) {
		return 0;
	}
	const isNearEnd = maxScrollLeft - scrollLeft <= room;
	if (isNearEnd) {
		return maxScrollLeft;
	}
	return scrollLeft;
}

/** A span cut on the left lines up with the view's left; one cut on the right with its right, its start first. */
function targetScrollLeftOf(view: ScrollerView, wantedStart: number, wantedEnd: number, isCutAtTheStart: boolean) {
	if (isCutAtTheStart) {
		return wantedStart;
	}
	const endAligned = wantedEnd - view.viewWidth;
	return Math.min(endAligned, wantedStart);
}

/**
 * Where to scroll so `span` shows whole with `room` on each side, moving as little as possible: the current position
 * when it already shows.
 */
export function revealedScrollLeftOf(view: ScrollerView, span: ContentSpan, room: number) {
	const wantedStart = span.start - room;
	const wantedEnd = span.end + room;
	const viewEnd = view.scrollLeft + view.viewWidth;
	const isCutAtTheStart = wantedStart < view.scrollLeft;
	const isCutAtTheEnd = wantedEnd > viewEnd;
	const isWhole = !isCutAtTheStart && !isCutAtTheEnd;
	if (isWhole) {
		return view.scrollLeft;
	}
	const target = targetScrollLeftOf(view, wantedStart, wantedEnd, isCutAtTheStart);
	const maxScrollLeft = Math.max(0, view.contentWidth - view.viewWidth);
	const clamped = clampedScrollLeft(target, maxScrollLeft);
	return snappedToEnds(clamped, maxScrollLeft, room);
}
