"use client"
import React, { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { withAuthentication } from 'lib/app/authenticator';
import { Breadcrumb, Container, Divider } from 'lib/components';
import { Footer, MainLayout } from 'lib/layout';
import { useAuthenticateUser, useDailyPlan, useLocalStorageState, useOrganizationTeams } from '@app/hooks';
import { clsxm } from '@app/utils';
import { fullWidthState } from '@app/stores/fullWidth';
import { useAtomValue } from 'jotai';
import { ArrowLeftIcon } from 'assets/svg';
import { CalendarView, TimesheetCard, TimesheetFilter, TimesheetView } from './components';
import { CalendarDaysIcon, Clock, User2 } from 'lucide-react';
import { GrTask } from "react-icons/gr";
import { GoSearch } from "react-icons/go";
import { getGreeting } from '@/app/helpers';

type TimesheetViewMode = "ListView" | "CalendarView";

type ViewToggleButtonProps = {
    mode: TimesheetViewMode;
    active: boolean;
    icon: React.ReactNode;
    onClick: () => void;
};

interface FooterTimeSheetProps {
    fullWidth: boolean;
}

const TimeSheet = React.memo(function TimeSheetPage({ params }: { params: { memberId: string } }) {
    const t = useTranslations();
    const { user } = useAuthenticateUser();

    const { sortedPlans } = useDailyPlan();

    const username = user?.name || user?.firstName || user?.lastName || user?.username;

    const [timesheetNavigator, setTimesheetNavigator] = useLocalStorageState<TimesheetViewMode>('timesheet-viewMode', 'ListView');

    const fullWidth = useAtomValue(fullWidthState);
    const { isTrackingEnabled, activeTeam } = useOrganizationTeams();

    const paramsUrl = useParams<{ locale: string }>();
    const currentLocale = paramsUrl ? paramsUrl.locale : null;
    const breadcrumbPath = useMemo(
        () => [
            { title: JSON.parse(t('pages.home.BREADCRUMB')), href: '/' },
            { title: activeTeam?.name || '', href: '/' },
            { title: t("pages.timesheet.TIMESHEET_TITLE"), href: `/${currentLocale}/timesheet/${params.memberId}` }
        ],
        [activeTeam?.name, currentLocale, t]
    );
    return (
        < >
            <MainLayout
                showTimer={isTrackingEnabled}
                footerClassName="hidden"
                className="h-[calc(100vh-_22px)]">
                <div className="top-14 fixed flex flex-col border-b-[1px] dark:border-gray-800 z-10 mx-0 w-full bg-white dark:bg-dark-high shadow-2xl shadow-transparent dark:shadow-gray-800 ">
                    <Container fullWidth={fullWidth}>
                        <div className="flex flex-row items-start justify-between mt-12 bg-white  dark:bg-dark-high">
                            <div className="flex items-center justify-center h-10 gap-8">
                                <ArrowLeftIcon className="text-dark dark:text-[#6b7280] h-6 w-6" />
                                <Breadcrumb paths={breadcrumbPath} className="text-sm" />
                            </div>
                        </div>
                    </Container>
                </div>
                <div className="h-full py-4 ">
                    <Container fullWidth={fullWidth} className='h-full pt-14'>
                        <div className='py-5'>
                            <div className='flex flex-col justify-start items-start gap-y-2'>
                                <h1 className='!text-[23px] font-bold text-[#282048]'>{getGreeting(t)}, {username} !</h1>
                                <span className='text-[16px] text-[#3D5A80]'>{t('pages.timesheet.HEADING_DESCRIPTION')}</span>
                            </div>
                            <div className='flex items-center w-full justify-between gap-6 pt-4'>
                                <TimesheetCard
                                    count={72}
                                    title='Pending Tasks'
                                    description='Tasks waiting for your approval'
                                    icon={<GrTask className='font-bold' />}
                                    classNameIcon='bg-[#FBB650] shadow-[#fbb75095]'
                                />
                                <TimesheetCard
                                    hours='63:00h'
                                    title='Men Hours'
                                    date='10.04.2024 - 11.04.2024'
                                    icon={<Clock className='font-bold' />}
                                    classNameIcon='bg-[#3D5A80] shadow-[#3d5a809c] '
                                />
                                <TimesheetCard
                                    count={8}
                                    title='Members Worked'
                                    description='People worked since last time'
                                    icon={<User2 className='font-bold' />}
                                    classNameIcon='bg-[#30B366] shadow-[#30b3678f]'
                                />
                            </div>
                        </div>
                        <div className='border-b-2 border-b-[#E2E8F0] w-full  flex justify-between pt-2'>
                            <div className='w-full flex'>
                                <ViewToggleButton
                                    icon={<GrTask className='text-sm' />}
                                    mode='ListView'
                                    active={timesheetNavigator === 'ListView'}
                                    onClick={() => setTimesheetNavigator('ListView')}
                                />
                                <ViewToggleButton
                                    icon={<CalendarDaysIcon size={20} className='!text-sm' />}
                                    mode='CalendarView'
                                    active={timesheetNavigator === 'CalendarView'}
                                    onClick={() => setTimesheetNavigator('CalendarView')}
                                />
                            </div>
                            <div className='flex items-center h-9 w-[700px] bg-white gap-x-2 px-2 border border-gray-200 rounded-sm mb-2'>
                                <GoSearch className='text-[#7E7991]' />
                                <input
                                    role="searchbox"
                                    aria-label="Search timesheet"
                                    type="search"
                                    name="timesheet-search"
                                    id="timesheet-search"
                                    className="h-10 w-full bg-transparent focus:border-transparent focus:ring-2 focus:ring-transparent placeholder-gray-500 placeholder:font-medium shadow-sm outline-none"
                                    placeholder="Search.." />
                            </div>
                        </div>
                        {/* <DropdownMenuDemo /> */}
                        <div className='flex flex-col min-h-screen w-full border-1 rounded-lg bg-[#FFFFFF]  p-4 mt-4'>
                            <TimesheetFilter />
                            <div className='pt-4'>
                                {timesheetNavigator === 'ListView' ?
                                    <TimesheetView data={sortedPlans} />
                                    : <CalendarView />
                                }
                            </div>
                        </div>
                    </Container>
                </div>
            </MainLayout>
            <FooterTimeSheet fullWidth={fullWidth} />
        </>
    )
})

export default withAuthentication(TimeSheet, { displayName: 'TimeSheet' });

const FooterTimeSheet: React.FC<FooterTimeSheetProps> = ({ fullWidth }) => {
    return (
        <div className="bg-white dark:bg-[#1e2025] w-screen z-[5000] fixed bottom-0">
            <Divider />
            <Footer
                className={clsxm(
                    'justify-between w-full px-0 mx-auto',
                    fullWidth ? 'px-8' : 'x-container'
                )} />
        </div>
    )
}

const ViewToggleButton: React.FC<ViewToggleButtonProps> = ({
    mode,
    active,
    icon,
    onClick
}) => (
    <button
        onClick={onClick}
        className={clsxm(
            'text-[#7E7991]  font-medium w-[191px] h-[40px] flex items-center gap-x-4 text-[14px]',
            active && 'border-b-primary text-primary border-b-2 bg-[#F1F5F9]'
        )}>
        {icon}
        <span>{mode === 'ListView' ? 'List View' : 'Calendar View'}</span>
    </button>
);
