
import { clsxm } from '@app/utils';
import { ArrowRightIcon } from 'assets/svg';
import { Button, Card } from 'lib/components';
import { ReactNode } from 'react';

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
    const { icon, title, date, description, hours, count, onClick, classNameIcon } = props;
    return (
        <Card
            aria-label={`Timesheet card for ${title}`}
            shadow='custom'
            className='w-full h-[175px] rounded-md border border-gray-200 flex  gap-8 shadow shadow-gray-100 p-3'>
            <div className='!gap-8 w-full space-y-4 '>
                <div className='flex flex-col gap-1 justify-start items-start'>
                    <h1 className='text-2xl md:text-[25px] font-bold truncate w-full'>{hours ?? count}</h1>
                    <h2 className='text-base md:text-[16px] font-medium text-[#282048] truncate w-full'>{title}</h2>
                    <span className='text-sm md:text-[14px] text-[#3D5A80] truncate w-full'>{date ?? description}</span>
                </div>
                <Button
                    variant='outline'
                    className={clsxm(
                        'h-9 px-3 py-2',
                        'border border-gray-200',
                        'text-[#282048] text-sm',
                        'flex items-center',
                        'hover:bg-gray-50 focus:ring-2 focus:ring-offset-2 focus:ring-gray-200'
                    )}
                    aria-label="View timesheet details"
                    onClick={onClick}>
                    <span>View Details</span>
                    <ArrowRightIcon className={clsxm(
                        'h-6 w-6',
                        'text-[#282048] dark:text-[#6b7280]'
                    )} />
                </Button>
            </div>
            <Card
                shadow='custom'
                className={clsxm(
                    'h-7 w-7',
                    'flex items-center justify-center',
                    'text-white font-bold text-sm',
                    'shadow-lg',
                    classNameIcon
                )}
                aria-hidden="true">
                {icon}
            </Card>
        </Card>
    )
}
