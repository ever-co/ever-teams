import moment from 'moment';

/**
 * Calendar day ('YYYY-MM-DD') a daily plan belongs to.
 *
 * Plans are created from a date-only value, which the API stores at UTC midnight of that day, so
 * that day is read in UTC. Older plans hold the instant they were created at, whose day is local.
 */
export const getDailyPlanDay = (date: moment.MomentInput): string => {
	const utcDate = moment.utc(date);

	return utcDate.isSame(utcDate.clone().startOf('day'))
		? utcDate.format('YYYY-MM-DD')
		: moment(date).format('YYYY-MM-DD');
};
