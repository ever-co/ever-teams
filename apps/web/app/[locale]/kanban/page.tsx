'use client';

import { KanbanTabs } from '@app/constants';
import {
  useAuthenticateUser,
  useModal,
  useOrganizationTeams
} from '@app/hooks';
import { useKanban } from '@app/hooks/features/useKanban';
import KanbanBoardSkeleton from '@components/shared/skeleton/KanbanBoardSkeleton';
import { withAuthentication } from 'lib/app/authenticator';
import { Breadcrumb, Button, InputField } from 'lib/components';
import { KanbanView } from 'lib/features/team-members-kanban-view';
import { MainLayout } from 'lib/layout';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import ImageComponent, {
  ImageOverlapperProps
} from 'lib/components/image-overlapper';
import Separator from '@components/ui/separator';
import { clsxm } from '@app/utils';
import HeaderTabs from '@components/pages/main/header-tabs';
import {
  AddIcon,
  SearchNormalIcon,
  SettingFilterIcon,
  PeoplesIcon
} from 'assets/svg';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger
} from '@components/ui/select';
import { InviteFormModal } from 'lib/features/team/invite/invite-form-modal';
import { userTimezone } from '@app/helpers';

const Kanban = () => {
  const { data } = useKanban();

  const { activeTeam } = useOrganizationTeams();
  const t = useTranslations();
  const params = useParams<{ locale: string }>();
  const currentLocale = params ? params.locale : null;
  const [activeTab, setActiveTab] = useState(KanbanTabs.TODAY);
  const breadcrumbPath = [
    { title: JSON.parse(t('pages.home.BREADCRUMB')), href: '/' },
    { title: activeTeam?.name || '', href: '/' },
    { title: t('common.KANBAN'), href: `/${currentLocale}/kanban` }
  ];

  const activeTeamMembers = activeTeam?.members ? activeTeam.members : [];

  const teamMembers: ImageOverlapperProps[] = [];

  activeTeamMembers.map((member: any) => {
    teamMembers.push({
      id: member.employee.user.id,
      url: member.employee.user.imageUrl,
      alt: member.employee.user.firstName
    });
  });
  const tabs = [
    { name: t('common.TODAY'), value: KanbanTabs.TODAY },
    { name: t('common.YESTERDAY'), value: KanbanTabs.YESTERDAY },
    { name: t('common.TOMORROW'), value: KanbanTabs.TOMORROW }
  ];
  const { user } = useAuthenticateUser();
  const { openModal, isOpen, closeModal } = useModal();
  const timezone = userTimezone();

  return (
    <>
      <MainLayout showTimer={true}>
        <div className="h-[263.4px] z-10 bg-white dark:bg-dark--theme fixed w-full"></div>
        <div className={'sticky top-16 flex flex-col  z-10 mx-[0px] w-full'}>
          <div className="flex flex-row items-start justify-between px-8 pt-12 bg-white dark:bg-dark--theme">
            <div className="flex items-center justify-center h-10 gap-8">
              <PeoplesIcon className="text-dark dark:text-[#6b7280] h-6 w-6" />
              <Breadcrumb paths={breadcrumbPath} className="text-sm" />
            </div>
            <div className="flex items-center justify-center h-10 gap-1 w-max">
              <HeaderTabs kanban={true} linkAll={true} />
            </div>
          </div>
          <div className="flex items-center justify-between px-8 pt-10 bg-white dark:bg-dark--theme">
            <h1 className="text-4xl font-semibold ">
              {t('common.KANBAN')} {t('common.BOARD')}
            </h1>
            <div className="flex items-center space-x-2 w-fit">
              <strong className="text-gray-400">
                {`(`}
                {timezone.split('(')[1]}
              </strong>
              <div className="mt-1">
                <Separator />
              </div>
              <ImageComponent images={teamMembers} />
              <div className="mt-1">
                <Separator />
              </div>

              <button
                onClick={openModal}
                className="p-2 rounded-full border-2 border-[#0000001a] dark:border-white"
              >
                {/* <AddIcon width={24} height={24} className={'dark:stroke-white'} /> */}
                <AddIcon className="w-6 h-6 text-foreground" />
              </button>
            </div>
          </div>
          <div className="relative flex flex-col items-center justify-between px-8 pt-10 bg-white lg:flex-row dark:bg-dark--theme">
            <div className="flex flex-row">
              {tabs.map((tab) => (
                <div
                  key={tab.name}
                  onClick={() => setActiveTab(tab.value)}
                  className={`cursor-pointer pt-2.5 px-5 pb-[30px] text-base font-semibold ${
                    activeTab === tab.value
                      ? 'border-b-[#3826A6] text-[#3826A6] dark:text-white dark:border-b-white'
                      : 'border-b-white dark:border-b-[#191A20] dark:text-white text-[#282048]'
                  }`}
                  style={{
                    borderBottomWidth: '3px',
                    borderBottomStyle: 'solid'
                  }}
                >
                  {tab.name}
                </div>
              ))}
            </div>
            <div className="flex mt-5 space-x-2 lg:mt-0">
              <Select>
                <SelectTrigger className="py-0 flex text-sm font-semibold px-4 w-24  justify-between items-center rounded-xl h-11 border-[1px] input-border bg-light--theme-light dark:bg-dark--theme-light dark:text-white ">
                  <p>{t('pages.taskDetails.EPIC')}</p>
                </SelectTrigger>
                <SelectContent className="bg-light--theme-light border-[1px] input-border dark:bg-dark--theme-light dark:text-white font-normal focus:ring-0 ">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <SelectItem
                      className="hover:dark:bg-dark--theme-light hover:bg-white hover:font-bold"
                      key={index}
                      value={index.toString()}
                    >
                      {t('pages.taskDetails.EPIC')} {index + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="py-0 flex text-sm font-semibold px-4 w-24  justify-between items-center rounded-xl h-11 border-[1px] input-border bg-light--theme-light dark:bg-dark--theme-light dark:text-white ">
                  <p>{t('common.LABEL')}</p>
                </SelectTrigger>
                <SelectContent className="bg-light--theme-light border-[1px] input-border dark:bg-dark--theme-light dark:text-white font-normal focus:ring-0 ">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <SelectItem
                      className="hover:dark:bg-dark--theme-light hover:bg-white hover:font-bold"
                      key={index}
                      value={index.toString()}
                    >
                      {t('common.LABEL')} {index + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                className={clsxm(
                  'p-3 px-5 flex space-x-2 input-border rounded-xl items-center text-sm',
                  'h-[2.75rem]'
                )}
              >
                <SettingFilterIcon className="w-4 h-4 text-foreground" />
                <span>{t('common.FILTER')}</span>
              </button>
              <div className="mt-1">
                <Separator />
              </div>
              <div className="w-44">
                <InputField
                  type="text"
                  placeholder={t('common.SEARCH')}
                  className="h-10 mb-0"
                  leadingNode={
                    <Button
                      variant="ghost"
                      className="p-0 m-0 ml-[0.9rem] min-w-0 absolute right-3"
                      type="submit"
                    >
                      <SearchNormalIcon className="w-4 h-4" />
                    </Button>
                  }
                />
              </div>
            </div>
          </div>
          {/* <div className="w-full h-20 bg-red-500/50"></div> */}
        </div>
        {/** TODO:fetch teamtask based on days */}
        {activeTab && ( // add filter for today, yesterday and tomorrow
          <div className="overflow-x-auto">
            {Object.keys(data).length > 0 ? (
              <KanbanView kanbanBoardTasks={data} />
            ) : (
              <KanbanBoardSkeleton />
            )}
          </div>
        )}
      </MainLayout>
      <InviteFormModal
        open={isOpen && !!user?.isEmailVerified}
        closeModal={closeModal}
      />
    </>
  );
};

export default withAuthentication(Kanban, { displayName: 'Kanban' });
