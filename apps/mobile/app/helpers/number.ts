export function pad(num: number, totalLength = 2) {
	return String(num).padStart(totalLength, '0');
}
