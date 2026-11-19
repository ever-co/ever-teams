const pad = (value: number): string => String(value).padStart(2, '0');

/** HH:MM, in the time zone the command line runs in. */
export function clockOf(date: Date): string {
	const hours = pad(date.getHours());
	const minutes = pad(date.getMinutes());
	return `${hours}:${minutes}`;
}

/** YYYY-MM-DD, the day in the time zone the command line runs in. */
export function dayOf(date: Date): string {
	const month = pad(date.getMonth() + 1);
	const day = pad(date.getDate());
	return `${date.getFullYear()}-${month}-${day}`;
}

/** 1h 05m, or 12m under an hour. */
export function durationText(seconds: number): string {
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const restOfHour = minutes % 60;
	if (hours === 0) {
		return `${restOfHour}m`;
	}
	return `${hours}h ${pad(restOfHour)}m`;
}
