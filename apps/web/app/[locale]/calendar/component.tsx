import { clsxm } from "@app/utils";
import { QueueListIcon } from "@heroicons/react/20/solid";
import { Button } from "lib/components";
import { LuCalendarDays } from "react-icons/lu";

export function HeadCalendar({ openModal }: { openModal?: () => void }) {
    return (
        <div className="flex justify-between items-center mt-10 bg-white dark:bg-dark-high py-2">
            <h1 className="text-4xl font-semibold">CALENDAR</h1>
            <div className='flex items-center space-x-3'>
                <button
                    className='hover:bg-gray-100 text-xl h-10 w-10 rounded-lg flex items-center justify-center'
                >
                    <QueueListIcon className={clsxm('w-5 h-5')} />
                </button>
                <button
                    className='bg-gray-100 text-xl h-10 w-10 rounded-lg flex items-center justify-center'
                >
                    <LuCalendarDays />
                </button>
                <Button
                    onClick={openModal}
                    variant='primary'
                    className='bg-primary dark:bg-primary-light'
                >
                    Add Manual Time
                </Button>
            </div>
        </div>
    );
}
