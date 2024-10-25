
import { clsxm } from '@app/utils';
import { ArrowRightIcon } from 'assets/svg';
import { Button, Card } from 'lib/components';
import React, { ReactNode } from 'react'

interface ITimesheetCard {
    title?: string;
    date?: string
    description?: string;
    hours?: string;
    count?: number;
    color?: string;
    icon?: ReactNode;
    classNameIcon?: string
    onClick?: () => void;
}


export function TimesheetCard({ ...props }: ITimesheetCard) {
    const { icon, title, date, description, hours, count, color, onClick, classNameIcon } = props;
    return (
        <Card
            shadow='custom'
            className='w-full h-[180px] rounded-md border border-gray-200 flex  gap-8 shadow shadow-gray-100 p-3'>
            <div className='!gap-8 w-full space-y-4 '>
                <div className='flex flex-col gap-1 justify-start items-start'>
                    <h1 className='text-[25px] font-bold'>{hours ?? count}</h1>
                    <h1 className='text-[16px] font-medium text-[#282048]'>{title}</h1>
                    <span className='text-[#3D5A80] text-[14px]'>{date ?? description}</span>
                </div>
                <Button
                    variant='outline'
                    className={clsxm('h-[36px] pt-[8px] pb-[8px]  pr-[12px] pl-[12px]  border border-gray-200 text-[#282048] flex items-center text-[14px]')}
                    onClick={onClick}>
                    <span>View Details</span>
                    <ArrowRightIcon className="text-[#282048] dark:text-[#6b7280] h-6 w-6" />
                </Button>
            </div>
            <Card
                shadow='custom'
                className={clsxm('bg-[#FBB650] h-[36px] w-[36px] text-white  flex items-center shadow-lg font-bold text-sm', classNameIcon)}>
                {icon}
            </Card>
        </Card>
    )
}
