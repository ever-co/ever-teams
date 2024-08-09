"use client"

import { clsxm } from '@app/utils';
import { DatePicker } from '@components/ui/DatePicker';
import { PencilSquareIcon } from '@heroicons/react/20/solid';
import { format } from 'date-fns';
import { Button, SelectItems, Modal, TimePicker, TimePickerValue } from 'lib/components';
import React, { useState } from 'react'
import { FaRegCalendarAlt } from 'react-icons/fa';
import { IoTime } from "react-icons/io5";

interface CreateManualTimeProps {
  open: boolean,
  setOpen: () => void
}
export function CreateManualTimeModal({ open, setOpen }: CreateManualTimeProps) {

  const [date, setDate] = useState<Date>(new Date());
  const [isBillable, setIsBillable] = useState(false)

  const [times, setTimes] = useState<TimePickerValue>({
    hours: '6',
    meridiem: 'PM',
    minute: '--'
  });

  return (
    <Modal
      isOpen={open}
      closeModal={setOpen}
      title={'Add Manuel time'}
      className="bg-light--theme-light dark:bg-dark--theme-light p-5 rounded-xl w-full md:w-40 md:min-w-[24rem] h-[auto] justify-start shadow-xl"
      titleClass="font-bold"
    >
      <form className="text-sm w-[408px] md:w-full  flex flex-col justify-between gap-4">
        <div className="">
          <label className="block text-gray-500 mb-1">
            Date<span className="text-[#de5505e1] ml-1">*</span>
          </label>
          <div className="w-full p-2 border border-slate-100 dark:border-slate-600 rounded-md">
            <DatePicker
              buttonVariant={'link'}
              className="dark:bg-dark--theme-light"
              buttonClassName={'decoration-transparent h-[0.875rem] w-full flex items-center'}
              customInput={
                <div
                  className={clsxm(
                    'not-italic cursor-pointer font-semibold text-[0.625rem] 3xl:text-xs w-full',
                    'leading-[140%] tracking-[-0.02em] text-[#282048] dark:text-white w-full'
                  )}
                >
                  {date ? (
                    <div className="flex justify-start items-center w-full space-x-2">
                      <FaRegCalendarAlt
                        size={20}
                        fill={'#3826A6'}
                        className="mr-[2px] text-[#3826A6]"
                      />
                      {format(date, 'PPP')}
                    </div>
                  ) : (
                    <PencilSquareIcon className="dark:text-white text-dark w-4 h-4" />
                  )}
                </div>
              }
              selected={date}
              onSelect={(value) => value && setDate(value)}
              mode={'single'}
            />
          </div>
        </div>

        <div className=" flex items-center">
          <label className="block text-gray-500 mr-2">Billable</label>
          <div
            className={`w-12 h-6 flex items-center bg-[#6c57f4b7] rounded-full p-1 cursor-pointer `}
            onClick={() => setIsBillable((prev) => !prev)}
            style={
              isBillable
                ? { background: 'linear-gradient(to right, #9d91efb7, #8a7bedb7)' }
                : { background: '#6c57f4b7' }
            }
          >
            <div
              className={` bg-[#3826A6] w-4 h-4 rounded-full shadow-md transform transition-transform
                ${isBillable ? 'translate-x-6' : 'translate-x-0'}`
                // isBillable
              }
            />
          </div>
        </div>
        <div className="flex items-center">
          <div className=" w-[48%] mr-[4%]">
            <label className="block text-gray-500 mb-1">
              Start time<span className="text-[#de5505e1] ml-1">*</span>
            </label>
            <TimePicker
              defaultValue={{
                hours: times.hours,
                meridiem: 'AM',
                minute: times.meridiem
              }}
              onChange={(value) => setTimes(value)}
            />
          </div>

          <div className=" w-[48%]">
            <label className="block text-gray-500 mb-1">
              End time<span className="text-[#de5505e1] ml-1">*</span>
            </label>

            <TimePicker
              defaultValue={{
                hours: times.hours,
                meridiem: 'AM',
                minute: times.meridiem
              }}
              onChange={(value) => setTimes(value)}
            />
          </div>
        </div>

        <div className=" flex items-center">
          <label className="block text-primary mb-1">Total hours: </label>
          <div className="ml-[10px] p-1 flex items-center font-bold dark:border-regal-rose  pr-3">
            <div className="mr-[10px] bg-gradient-to-tl text-[#3826A6]  rounded-full ">
              <IoTime
                size={20}
                className="rounded-full text-primary dark:text-[#8a7bedb7]"
              />
            </div>
            6h
            {/* {timeDifference} */}
          </div>
        </div>

        <div className="">
          <label className="block text-gray-500 mb-1">
            Projects<span className="text-[#de5505e1] ml-1">*</span>
          </label>
          <SelectItems
            defaultValue={null}
            items={[]}
            onValueChange={(task) => null}
            itemId={(task) => task as any}
            itemToString={(task) => task as any}
            triggerClassName="border-slate-100 dark:border-slate-600"
          />
        </div>
        <div className="">
          <label className="block text-gray-500 mb-1">
            Employee<span className="text-[#de5505e1] ml-1">*</span>
          </label>
          <SelectItems
            defaultValue={null}
            items={[]}
            onValueChange={(task) => null}
            itemId={(task) => task as any}
            itemToString={(task) => task as any}
            triggerClassName="border-slate-100 dark:border-slate-600"
          />
        </div>

        <div className="">
          <label className="block text-gray-500 mb-1">
            Task<span className="text-[#de5505e1] ml-1">*</span>
          </label>
          <SelectItems
            defaultValue={null}
            items={[]}
            onValueChange={(task) => null}
            itemId={(task) => task as any}
            itemToString={(task) => task as any}
            triggerClassName="border-slate-100 dark:border-slate-600"
          />
        </div>

        <div className="flex flex-col">
          <label className="block text-gray-500 shrink-0">Description</label>
          <textarea
            // value={description}
            placeholder="What worked on?"
            onChange={(e) => null}
            className="w-full p-2 grow border border-slate-100 dark:border-slate-600 dark:bg-dark--theme-light rounded-md"
          />
        </div>

        <div className="flex justify-center items-center w-full pt-6">

          <Button
            type="submit"
            className="bg-[#3826A6] font-bold  flex items-center text-white w-full "
          >
            Add Manuel time
          </Button>
        </div>
        {/* <div className="m-4 text-[#ff6a00de]">{errorMsg}</div> */}
      </form>
    </Modal>
  )
}
