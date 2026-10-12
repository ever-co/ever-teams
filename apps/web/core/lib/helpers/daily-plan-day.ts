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

/**
 * Today's plan, when it holds tasks, and tomorrow's plan: the two plans the timer checks read.
 */
export const findTimerPlans = <T extends { date: moment.MomentInput; tasks?: unknown[] | null }>(
	plans: T[] | undefined
): { hasPlan: T | undefined; hasPlanForTomorrow: T | undefined } => {
	const today = moment().format('YYYY-MM-DD');
	const tomorrow = moment().add(1, 'days').format('YYYY-MM-DD');

	return {
		hasPlan: plans?.find((plan) => getDailyPlanDay(plan.date) === today && !!plan.tasks?.length),
		hasPlanForTomorrow: plans?.find((plan) => getDailyPlanDay(plan.date) === tomorrow)
	};
};
