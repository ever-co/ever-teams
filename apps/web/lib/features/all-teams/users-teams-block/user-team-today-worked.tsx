import { secondsToTime } from '@app/helpers';
import { useTaskStatistics, useTeamMemberCard } from '@app/hooks';
import { OT_Member } from '@app/interfaces';
import { timerSecondsState } from '@app/stores';
import { clsxm } from '@app/utils';
import { Text } from 'lib/components';
import { useTranslations } from 'next-intl';
import { useAtomValue } from 'jotai';

export function BlockCardMemberTodayWorked({ member }: { member: OT_Member }) {
  const t = useTranslations();
  const memberInfo = useTeamMemberCard(member);

  const seconds = useAtomValue(timerSecondsState);
  const { activeTaskTotalStat, addSeconds } = useTaskStatistics(seconds);

  const { h, m } = secondsToTime(
    ((member?.totalTodayTasks &&
      member?.totalTodayTasks.reduce(
        (previousValue, currentValue) => previousValue + currentValue.duration,
        0
      )) ||
      activeTaskTotalStat?.duration ||
      0) + addSeconds
  );

  return (
    <div
      className={clsxm(
        'flex space-x-2 items-center justify-center  font-normal flex-col mr-4'
      )}
    >
      <span className="text-xs text-gray-500 text-center	capitalize">
        {t('common.TOTAL_WORKED_TODAY')}
      </span>
      <Text className="text-sm">
        {memberInfo.isAuthUser ? `${h}h : ${m}m` : `0h : 0m`}
      </Text>
    </div>
  );
}
