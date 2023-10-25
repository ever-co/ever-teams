export function changeTimezone(date: Date, ianatz?: string) {
	const invdate = new Date(
		date.toLocaleString('en-US', {
			timeZone: ianatz
		})
	);

	const diff = date.getTime() - invdate.getTime();

	return new Date(date.getTime() - diff);
}

export function userTimezone() {
	return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function addHours(numOfHours: number, date = new Date()) {
	date.setTime(date.getTime() + numOfHours * 60 * 60 * 1000);

	return date;
}

export function secondsToTime(secs: number) {
	const hours = Math.floor(secs / (60 * 60));

	const divisor_for_minutes = secs % (60 * 60);
	const minutes = Math.floor(divisor_for_minutes / 60);

	const divisor_for_seconds = divisor_for_minutes % 60;
	const seconds = Math.ceil(divisor_for_seconds);

	return {
		h: hours,
		m: minutes,
		s: seconds
	};
}

export function convertMsToTime(milliseconds: number) {
	let seconds = Math.floor(milliseconds / 1000);
	let minutes = Math.floor(seconds / 60);
	let hours = Math.floor(minutes / 60);

	let ms = milliseconds % 1000;
	minutes = minutes % 60;
	seconds = seconds % 60;

	// �️ If you don't want to roll hours over, e.g. 24 to 00
	// �️ comment (or remove) the line below
	// commenting next line gets you `24:00:00` instead of `00:00:00`
	// or `36:15:31` instead of `12:15:31`, etc.
	// hours = hours % 24;

	return {
		hours,
		minutes,
		seconds,
		ms,
		ms_p: Math.floor((ms * 100) / 1000)
	};
}
