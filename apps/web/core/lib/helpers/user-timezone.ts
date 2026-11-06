import * as momentTimezone from 'moment-timezone';

// Its own module, outside date-and-time and the helpers barrel: moment-timezone ships every zone's data, and only the
// few screens that compute the user's timezone should load it.
export function userTimezone() {
	const userTimezone = momentTimezone.tz.guess();
	const offset = momentTimezone.tz(userTimezone).format('Z');
	const formattedTimezone = `${userTimezone.replace(/_/, ' ')} (UTC ${offset})`;
	return formattedTimezone;
}
