import { Card, Modal, Text, Button } from 'lib/components'
import { PiWarningCircleFill } from "react-icons/pi";
import '../../../styles/style-input.css';

import React from 'react'
import Separator from '@components/ui/separator';
import { TaskBlockInfo } from '../team/user-team-block/task-info';
import { TaskStatus } from '../task/task-status';

export function DailyPlanCompareEstimatedModal({
    open,
    closeModal
}: { open: boolean, closeModal: () => void, }) {

    return (
        <Modal isOpen={open} closeModal={closeModal}>
            <div className='w-[98%] md:w-[500px] relative   '>
                <Card className="w-full h-[620px] flex flex-col justify-start bg-gray-50" shadow='custom'>
                    <div className='flex flex-col items-center justify-between'>
                        <div >
                            <Text.Heading as='h3' className='mb-3 text-center font-bold'>
                                TODAY'S PLAN
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
                    </div>
                    <div className='flex items-start flex-col justify-start w-full px-2'>
                        <input
                            className=' mb-3 w-full p-1 focus:border-[#1B005D] border rounded-md border-[#D7E1EB] dark:focus:border-[#D7E1EB] bg-white pb-1 font-normal dark:text-white outline-none dark:bg-transparent text-[13px]'
                            type="time" />
                        <div className='flex items-center space-x-1 w-auto'>
                            <Text.Heading as='h4' className=' text-center text-gray-500 text-[12px]'>
                                Tasks with no time estimations
                            </Text.Heading>
                            <Text.Heading as='h4' className='text-center text-red-600'>
                                *
                            </Text.Heading>
                        </div>
                    </div>
                    <div className='flex h-full w-full p-2'>
                        <div>
                            <div className='flex items-center w-full bg-white border h-16  drop-shadow rounded-lg px-1 font-normal'>
                                <span className='pr-1 w-full text-[12px] text-ellipsis text-inherit leading-4'>Working on UI Design & Mating prototype for user testing tomorrow</span>
                                <Separator />
                                <div className='flex items-center'>
                                    <span className='pl-1 w-2/3 text-[12px] text-gray-500'>Estimations: </span>
                                    <span className='text-[12px]'>00h:00m</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className='flex flex-col'>
                        <div className='flex items-center pb-2 text-red-500 text-[12px]'>
                            <PiWarningCircleFill className='text-[14px]' />
                            <span>Please correct planned work hours or re-estimate task(s)</span>
                        </div>
                        <div className='flex items-center justify-between'>
                            <Button
                                onClick={closeModal}
                                variant='outline'
                                className='font-normal rounded-sm text-md h-9'>
                                Cancel
                            </Button>
                            <Button className='font-normal rounded-sm text-md h-9'>
                                Start working
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        </Modal>
    )
}
