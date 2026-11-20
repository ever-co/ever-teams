import { areDatesEqual, getWeekStartAndEnd } from '@ever-teams/toolkit-ui';
import { useTranslation } from 'react-i18next';
import { useTeamsContext } from '@lib/context/teams-context';

interface IWeekLabels {
	thisWeek: 'REPORT.worked_this_week' | 'REPORT.week_activity';
	overPeriod: 'REPORT.worked_over_period' | 'REPORT.activity_over_period';
}

/** The label of a weekly widget: "this week" while the report dates are this week, "over the period" otherwise. */
export const useWeekLabel = ({ thisWeek, overPeriod }: IWeekLabels): string => {
	const { t } = useTranslation();
	const { reportDates } = useTeamsContext();
	const dates = getWeekStartAndEnd();
	const startsThisWeek = areDatesEqual(reportDates?.from, dates.start);
	const endsThisWeek = areDatesEqual(reportDates?.to, dates.end);
	if (startsThisWeek && endsThisWeek) {
		return t(thisWeek);
	}
	return t(overPeriod);
};
