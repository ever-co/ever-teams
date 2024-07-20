import { Card, Modal, Text, Button } from 'lib/components'
import { PiWarningCircleFill } from "react-icons/pi";
import React, { InputHTMLAttributes } from 'react'
import Separator from '@components/ui/separator';
import { IDailyPlan, ITeamTask } from '@app/interfaces';
import { TaskNameInfoDisplay } from '../task/task-displays';
import { clsxm } from '@app/utils';
import { TaskEstimateInput } from '../team/user-team-card/task-estimate';
import { useTeamMemberCard, useTimer, useTMCardTaskEdit } from '@app/hooks';
import { dailyPlanCompareEstemated } from '@app/helpers/daily-plan-estimated';
import { secondsToTime } from '@app/helpers';


export function DailyPlanCompareEstimatedModal({
    open,
    closeModal,
    todayPlan,
    profile
}: { open: boolean, closeModal: () => void, todayPlan?: IDailyPlan[], profile: any }) {

    const { estimatedTime } = dailyPlanCompareEstemated(todayPlan!);
    const { h: dh, m: dm, s: ds } = secondsToTime(estimatedTime || 0);
    const { startTimer } = useTimer()

    const onClick = () => {
        startTimer()
        window.localStorage.setItem('daily-plan-modal', new Date().toISOString().split('T')[0]);
    }
    return (
        <Modal isOpen={open} closeModal={closeModal}>
            <div className='w-[98%] md:w-[550px] relative'>
                <Card className="w-full h-[620px] flex flex-col justify-start bg-gray-50" shadow='custom'>
                    <div className='flex flex-col items-center justify-between'>
                        <DailyPlanCompareHeader />
                    </div>
                    <div className='flex items-start flex-col justify-start w-full px-2'>
                        <DailyPlanWorkTimeInput estimated={`${dh}:${dm}:${ds}`} />
                    </div>
                    <div className='flex h-full w-full p-2'>
                        {todayPlan?.map((plan, i) => {
                            return <div key={i}>
                                {plan.tasks?.map((data, index) => {
                                    return <DailyPlanTask
                                        key={index}
                                        task={data}
                                        profile={profile}
                                    />
                                })}
                            </div>
                        })}
                    </div>
                    <div className='flex flex-col'>
                        <div className='flex items-center pb-2 text-red-500 text-[12px]'>
                            <PiWarningCircleFill className='text-[14px]' />
                            <span>Please correct planned work hours or re-estimate task(s)</span>
                        </div>
                        <DailyPlanCompareActionButton closeModal={closeModal} onClick={onClick} />
                    </div>
                </Card>
            </div>
        </Modal>
    )
}
export function DailyPlanTask({ task, profile }: { task?: ITeamTask, profile: any }) {
    const taskEdition = useTMCardTaskEdit(task);
    const member = task?.selectedTeam?.members.find((member) => {
        return member?.employee?.user?.id === profile?.userProfile?.id
    });

    const memberInfo = useTeamMemberCard(member);
    return (
        <div className='flex items-center w-full bg-white border h-16  drop-shadow rounded-lg px-1 font-normal'>
            <div className='flex items-center space-x-1'>
                <TaskNameInfoDisplay
                    task={task}
                    className={clsxm("text-2xl")}
                    taskTitleClassName={clsxm('pr-1 w-full text-[12px] text-ellipsis text-inherit leading-4 capitalize font-medium')}
                    showSize={true}
                    dash={true}
                />
            </div>
            <Separator />
            <div className='flex items-center pl-1 w-2/3 text-[12px]'>
                <TaskEstimateInput
                    type='HORIZONTAL'
                    showTime={true}
                    memberInfo={memberInfo}
                    edition={taskEdition}
                />
            </div>
        </div>
    );
}


export function DailyPlanCompareActionButton({ closeModal, onClick }: { closeModal?: () => void, onClick?: () => void }) {
    return (
        <div className='flex items-center justify-between'>
            <Button
                onClick={closeModal}
                variant='outline'
                className='font-normal rounded-sm text-md h-9'>
                Cancel
            </Button>
            <Button onClick={onClick} className='font-normal rounded-sm text-md h-9'>
                Start working
            </Button>
        </div>
    )
}


export function DailyPlanCompareHeader() {
    return (
        <>
            <div >
                <Text.Heading as='h3' className='mb-3 text-center font-bold'>
                    TODAY&apos;S PLAN
                </Text.Heading>
            </div>
            <div className='flex items-center justify-start w-full px-2 mb-3'>
                <div className='flex items-center space-x-1'>
                    <Text.Heading as='h4' className='mb-3 text-center text-gray-500 text-[12px]'>
                        Add planned working hours
                    </Text.Heading>
                    <Text.Heading as='h4' className='mb-3 text-center text-red-600'>*
                    </Text.Heading>
                </div>
            </div>
        </>
    )
}


export function DailyPlanWorkTimeInput({ onChange, estimated }: { onChange?: (_: InputHTMLAttributes<HTMLInputElement>) => void, estimated?: string }) {
    return (
        <>
            <input
                onChange={onChange}
                defaultValue={estimated}
                className='custom-time-input mb-3 w-full p-1 focus:border-[#1B005D] border rounded-md border-[#D7E1EB] dark:focus:border-[#D7E1EB] bg-white pb-1 font-normal dark:text-white outline-none dark:bg-transparent text-[13px]'
                type="time" />
            <div className='flex items-center space-x-1 w-auto'>
                <Text.Heading as='h4' className=' text-center text-gray-500 text-[12px]'>
                    Tasks with no time estimations
                </Text.Heading>
                <Text.Heading as='h4' className='text-center text-red-600'>
                    *
                </Text.Heading>
            </div>
        </>
    )
}
