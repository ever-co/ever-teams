"use client"
import { useModal, useOrganizationTeams } from '@app/hooks';
import { fullWidthState } from '@app/stores/fullWidth';
import { clsxm } from '@app/utils';
import HeaderTabs from '@components/pages/main/header-tabs';
import { PeoplesIcon } from 'assets/svg';
import { withAuthentication } from 'lib/app/authenticator';
import { Breadcrumb, Button, Container, Divider } from 'lib/components';
import { SetupFullCalendar } from 'lib/features'
import { Footer, MainLayout } from 'lib/layout';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import React, { useMemo } from 'react'
import { useRecoilValue } from 'recoil';
import { LuCalendarDays } from "react-icons/lu";
import { CreateManualTimeModal } from 'lib/features/activity/create-modal-manual-time';
import { QueueListIcon } from '@heroicons/react/20/solid';


const CalendarPage = () => {
    const t = useTranslations();
    const fullWidth = useRecoilValue(fullWidthState);
    const { activeTeam, isTrackingEnabled } = useOrganizationTeams();
    const {
        isOpen,
        openModal,
        closeModal
    } = useModal();
    const params = useParams<{ locale: string }>();
    const currentLocale = params ? params.locale : null;
    const breadcrumbPath = useMemo(
        () => [
            { title: JSON.parse(t('pages.home.BREADCRUMB')), href: '/' },
            { title: activeTeam?.name || '', href: '/' },
            { title: "CALENDAR", href: `/${currentLocale}/calendar` }
        ],
        [activeTeam?.name, currentLocale, t]
    );
    return (
        <>
            <CreateManualTimeModal open={isOpen} setOpen={closeModal} />
            <MainLayout
                showTimer={isTrackingEnabled}
                footerClassName="hidden"
                // footerClassName={clsxm("fixed flex flex-col  items-end justify-center bottom-0 z-50 bg-white dark:bg-dark-high", !fullWidth && 'left-0 right-0')}
                className="h-[calc(100vh-_22px)]"
            >
                <div className="h-[263.4px] z-10 bg-white  dark:bg-dark-high fixed w-full"></div>
                <div
                    className={
                        'fixed top-20 flex flex-col border-b-[1px] dark:border-[#26272C]  z-10 mx-[0px] w-full bg-white dark:bg-dark-high'
                    }
                >
                    <Container fullWidth={fullWidth}>
                        <div className="flex bg-white dark:bg-dark-high flex-row items-start justify-between mt-12">
                            <div className="flex justify-center items-center gap-8 h-10">
                                <PeoplesIcon className="text-dark dark:text-[#6b7280] h-6 w-6" />
                                <Breadcrumb paths={breadcrumbPath} className="text-sm" />
                            </div>
                            <div className="flex h-10 w-max items-center justify-center   gap-1">
                                <HeaderTabs kanban={true} linkAll={true} />
                            </div>
                        </div>
                        <HeadCalendar openModal={openModal} />
                    </Container>
                </div>
                <div className='mt-[256px] mb-24 '>
                    <SetupFullCalendar />
                </div>
            </MainLayout>
            <div className="bg-white dark:bg-[#1e2025]  w-screen z-[5000] fixed bottom-0">
                <Divider />
                <Footer
                    className={clsxm(' justify-between w-full px-0  mx-auto', fullWidth ? 'px-8' : 'x-container')}
                />
            </div>
        </>
    )
}

export default withAuthentication(CalendarPage, { displayName: 'Calender' });


export function HeadCalendar({ openModal }: { openModal: () => void }) {
    return (<div className="flex justify-between items-center  mt-10 bg-white dark:bg-dark-high py-2">
        <h1 className="text-4xl font-semibold ">
            CALENDAR
        </h1>
        <div className='flex items-center space-x-3'>
            <button
                className=' hover:!bg-gray-100 text-xl h-10 w-10 rounded-lg flex items-center justify-center'>
                <QueueListIcon className={clsxm('w-5 h-5')} />
            </button>
            <button
                className='bg-gray-100 text-xl !h-10 !w-10 rounded-lg flex items-center justify-center'>
                <LuCalendarDays />
            </button>
            <Button
                onClick={openModal}
                variant='primary'
                className='bg-primary dark:!bg-primary-light'
            >Add Manuel Time
            </Button>
        </div>
    </div>)
}
