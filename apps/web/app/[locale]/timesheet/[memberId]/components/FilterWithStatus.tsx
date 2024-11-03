import React, { HTMLAttributes } from 'react';
import { Button } from 'lib/components';
import { clsxm } from '@app/utils';

export type FilterStatus = "All Tasks" | "Pending" | "Approved" | "Rejected";
export function FilterWithStatus({
    activeStatus,
    onToggle,
    className
}: {
    activeStatus: FilterStatus;
    onToggle: (status: FilterStatus) => void;
    className?: HTMLAttributes<HTMLDivElement>
}) {
    const buttonData: { label: FilterStatus; count: number; icon: React.ReactNode }[] = [
        { label: 'All Tasks', count: 46, icon: <i className="icon-all" /> },
        { label: 'Pending', count: 12, icon: <i className="icon-pending" /> },
        { label: 'Approved', count: 28, icon: <i className="icon-approved" /> },
        { label: 'Rejected', count: 6, icon: <i className="icon-rejected" /> },
    ];

    return (
        <div className={clsxm('flex flex-nowrap h-[2.2rem] items-center bg-[#e2e8f0aa] rounded-xl w-[520px]', className)}>
            {buttonData.map(({ label, count, icon }, index) => (
                <Button
                    key={index}
                    className={clsxm(
                        'group flex items-center justify-start h-[2.2rem] rounded-xl w-full',
                        'dark:bg-dark--theme-light dark:border-gray-700 bg-transparent text-[#71717A] w-[80px]',
                        activeStatus === label && 'text-primary bg-white shadow-lg font-bold border'
                    )}
                    onClick={() => onToggle(label)}>
                    <span className={clsxm('font-medium ml-1 text-[#7E7991]', `${activeStatus === label ? "text-primary" : ""}`)}>{label}</span>
                    <span className='font-medium ml-1 text-[#71717A]'>{count}</span>
                </Button>
            ))}
        </div>
    );
}
