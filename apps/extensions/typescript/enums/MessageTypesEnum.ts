/** What the popup tells the background: the timer as the popup just read it, for the toolbar badge. */
export enum MessageTypesToBackgroundEnum {
	statusRead = 'statusRead'
}

/** What the background tells an open popup: the timer as the API answered it last. */
export enum MessageTypesFromBackgroundEnum {
	statusUpdate = 'statusUpdate'
}
