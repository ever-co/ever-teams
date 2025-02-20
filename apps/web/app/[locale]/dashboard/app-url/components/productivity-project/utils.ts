import { IActivityReportGroupByDate } from '@/app/interfaces/activity/IActivityReport';
import { ProjectGroups } from './types';

export const formatDuration = (seconds: string): string => {
  const totalSeconds = parseInt(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

export const groupActivitiesByProjectAndDate = (reportData: IActivityReportGroupByDate[]): ProjectGroups => {
  return reportData.reduce((projectAcc, dayData) => {
    dayData.employees.forEach((employeeData: any) => {
      const activities = employeeData.projects?.[0]?.activity || employeeData.activity || [];
      activities.forEach((activity: any) => {
        const projectName = activity.projectId || 'No project';
        if (!projectAcc[projectName]) {
          projectAcc[projectName] = {};
        }

        if (!projectAcc[projectName][dayData.date]) {
          projectAcc[projectName][dayData.date] = {
            activities: [],
            totalDuration: 0,
            members: new Set()
          };
        }

        const dateGroup = projectAcc[projectName][dayData.date];
        dateGroup.activities.push({
          employee: employeeData.employee || employeeData,
          activity
        });
        dateGroup.totalDuration += (activity.duration as number);
        dateGroup.members.add((employeeData.employee || employeeData).id);
      });
    });
    return projectAcc;
  }, {} as ProjectGroups);
};
