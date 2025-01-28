'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ITimerLogGrouped } from '@/app/interfaces/ITimer';
import { formatDuration } from '@/app/helpers';

interface ActivityModalProps {
  employeeLog: ITimerLogGrouped;
  children: React.ReactNode;
}

export function ActivityModal({ employeeLog, children }: ActivityModalProps) {
  const totalTime = employeeLog.sum || 0;
  const activeTime = totalTime * (employeeLog.activity || 0) / 100;
  const idleTime = totalTime * 0.13; // Example: 13% idle time
  const unknownTime = totalTime * 0.30; // Example: 30% unknown time

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="pb-4">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage
                src={employeeLog.employee?.user?.imageUrl || ''}
                alt={employeeLog.employee?.user?.name || 'User'}
              />
              <AvatarFallback>
                {employeeLog.employee?.user?.name?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            <DialogTitle className="text-xl">
              {employeeLog.employee?.user?.name || 'Unknown User'}
            </DialogTitle>
          </div>
        </DialogHeader>

        <Tabs defaultValue="activity" className="w-full">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="activity" className="flex-1">Activity Breakdown</TabsTrigger>
            <TabsTrigger value="tracked" className="flex-1">Tracked vs Manual</TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="space-y-6">
            <div className="relative w-48 h-48 mx-auto">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                {/* Active Time Segment */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="20"
                  strokeDasharray={`${(employeeLog.activity || 0) * 2.51327} 251.327`}
                  className="transition-all"
                />
                {/* Idle Time Segment */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth="20"
                  strokeDasharray="32.67251 251.327"
                  strokeDashoffset={`${-(employeeLog.activity || 0) * 2.51327}`}
                  className="transition-all"
                />
                {/* Unknown Time Segment */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#EF4444"
                  strokeWidth="20"
                  strokeDasharray="75.3981 251.327"
                  strokeDashoffset={`${-(employeeLog.activity || 0) * 2.51327 - 32.67251}`}
                  className="transition-all"
                />
              </svg>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-600" />
                  <span>Active Time</span>
                </div>
                <span className="font-medium">{formatDuration(activeTime)} (57%)</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span>Idle Time</span>
                </div>
                <span className="font-medium">{formatDuration(idleTime)} (13%)</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span>Unknown Activity</span>
                </div>
                <span className="font-medium">{formatDuration(unknownTime)} (30%)</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tracked" className="space-y-6">
            <div className="relative w-48 h-48 mx-auto">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                {/* Tracked Time Segment */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="20"
                  strokeDasharray="188.49555 251.327"
                  className="transition-all"
                />
                {/* Manual Time Segment */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#EF4444"
                  strokeWidth="20"
                  strokeDasharray="62.83185 251.327"
                  strokeDashoffset="-188.49555"
                  className="transition-all"
                />
              </svg>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-600" />
                  <span>Tracked Time</span>
                </div>
                <span className="font-medium">{formatDuration(totalTime * 0.75)} (75%)</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span>Manual Time</span>
                </div>
                <span className="font-medium">{formatDuration(totalTime * 0.25)} (25%)</span>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
