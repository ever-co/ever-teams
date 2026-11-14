/** What the popup tells the background: something changed the timer or the session, read the API again. */
export enum MessageTypesToBackgroundEnum {
	refreshStatus = 'refreshStatus'
}

/** What the background tells an open popup: the timer as the API answered it last. */
export enum MessageTypesFromBackgroundEnum {
	statusUpdate = 'statusUpdate'
}
