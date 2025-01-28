'use client';

import { useModal } from "@/app/hooks";
import { Modal } from "@/lib/components";
import { ITimerLogGrouped } from '@/app/interfaces/ITimer';
import { formatDuration } from '@/app/helpers';

interface ActivityModalProps {
  employeeLog: ITimerLogGrouped;
  isOpen: boolean;
  closeModal: () => void;
}

export const ActivityModal = ({ employeeLog, isOpen, closeModal }: ActivityModalProps) => {
  const totalTime = employeeLog.sum || 0;
  const activeTime = totalTime * 0.57; // 57% active time
  const idleTime = totalTime * 0.13; // 13% idle time
  const unknownTime = totalTime * 0.30; // 30% unknown time

  return (
    <Modal isOpen={isOpen} closeModal={closeModal}>
      <div className="p-6 space-y-6">
        <div className="relative w-48 h-48 mx-auto">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            {/* Active Time Segment - 57% */}
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="#2563EB"
              strokeWidth="20"
              strokeDasharray="143.25639 251.327"
              className="transition-all"
            />
            {/* Idle Time Segment - 13% */}
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="#F59E0B"
              strokeWidth="20"
              strokeDasharray="32.67251 251.327"
              strokeDashoffset="-143.25639"
              className="transition-all"
            />
            {/* Unknown Time Segment - 30% */}
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="#EF4444"
              strokeWidth="20"
              strokeDasharray="75.3981 251.327"
              strokeDashoffset="-175.9289"
              className="transition-all"
            />
          </svg>
        </div>
      </div>
    </Modal>
  );
}
