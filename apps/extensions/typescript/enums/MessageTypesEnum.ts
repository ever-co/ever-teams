/**
 * What the popup tells the background: the timer as the popup just read it, for the toolbar badge (`statusRead`), and
 * the stop of a run (`stopRun`), which the background credits and sends in turn with its own heartbeats (stop-run.ts).
 */
export enum MessageTypesToBackgroundEnum {
	statusRead = 'statusRead',
	stopRun = 'stopRun'
}

/** What the background tells an open popup: the timer as the API answered it last. */
export enum MessageTypesFromBackgroundEnum {
	statusUpdate = 'statusUpdate'
}
