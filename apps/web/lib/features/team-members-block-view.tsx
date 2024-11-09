import * as React from 'react';
import { OT_Member } from '@app/interfaces';
import { Transition } from '@headlessui/react';
import { UserTeamBlock } from './team/user-team-block';
import { useAtomValue } from 'jotai';
import { taskBlockFilterState } from '@app/stores/task-filter';
import { UserTeamCardSkeleton } from './team/user-team-card/task-skeleton';
import { useTranslations } from 'next-intl';

interface Props {
  teamMembers: OT_Member[];
  publicTeam: boolean;
  currentUser: OT_Member | undefined;
  teamsFetching: boolean;
}

const TeamMembersBlockView: React.FC<Props> = ({
  teamMembers: members,
  publicTeam = false,
  currentUser,
  teamsFetching
}) => {
  const activeFilter = useAtomValue(taskBlockFilterState);

  let emptyMessage = '';
  const t = useTranslations();

  switch (activeFilter) {
    case 'online':
      emptyMessage = t('common.NO_USERS_ONLINE');
      break;
    case 'running':
      emptyMessage = t('common.NO_USERS_WORKING');
      break;
    case 'pause':
      emptyMessage = t('common.NO_USERS_PAUSED_WORK');
      break;
    case 'idle':
      emptyMessage = t('common.NO_USERS_IDLE');
      break;
  }

  return (
    <>
      <div className="mt-7">
        {/* Current authenticated user members */}
        <Transition
          show={!!currentUser}
          enter="transition-opacity duration-75"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          {/* <UserTeamBlock member={currentUser} publicTeam={publicTeam} /> */}
        </Transition>
        <div className="flex w-full flex-wrap items-center">
          {members.map((member) => {
            return (
              <div className="p-1 w-full md:w-1/2  lg:w-1/4" key={member.id}>
                <Transition
                  key={member.id}
                  show={true}
                  enter="transition-opacity duration-75"
                  enterFrom="opacity-0"
                  enterTo="opacity-100"
                  leave="transition-opacity duration-150"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <UserTeamBlock member={member} publicTeam={publicTeam} />
                </Transition>
              </div>
            );
          })}
        </div>
        <Transition
          show={teamsFetching}
          enter="transition-opacity duration-75"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          {[1, 2].map((_, i) => {
            return (
              <li key={i} className="mt-3">
                <UserTeamCardSkeleton />
              </li>
            );
          })}
        </Transition>
        {members.length < 1 && !teamsFetching && (
          <div className="py-16 flex justify-center items-center">
            <p className="text-lg">{emptyMessage}</p>
          </div>
        )}
      </div>
    </>
  );
};

export default TeamMembersBlockView;
