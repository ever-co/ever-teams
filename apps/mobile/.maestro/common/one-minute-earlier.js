// One minute before the start the panel shows (SHOWN_START, HH:MM in the phone's own time), as the panel takes it.
// Read from the panel, not from the clock of the computer that runs Maestro, whose time zone can differ.
var shown = /(\d{1,2}):(\d{2})/.exec(String(SHOWN_START));
if (!shown) {
	throw new Error('The start field does not show a time (HH:MM): ' + SHOWN_START);
}
var minutesOfDay = Number(shown[1]) * 60 + Number(shown[2]);
var earlier = (minutesOfDay + 24 * 60 - 1) % (24 * 60);
function twoDigits(value) {
	return (value < 10 ? '0' : '') + value;
}
output.earlier = twoDigits(Math.floor(earlier / 60)) + ':' + twoDigits(earlier % 60);
