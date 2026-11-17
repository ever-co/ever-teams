// The phone's local time one minute ago, as the start panel takes it (HH:MM).
var earlier = new Date(Date.now() - 60 * 1000);
function twoDigits(value) {
	return (value < 10 ? '0' : '') + value;
}
output.earlier = twoDigits(earlier.getHours()) + ':' + twoDigits(earlier.getMinutes());
