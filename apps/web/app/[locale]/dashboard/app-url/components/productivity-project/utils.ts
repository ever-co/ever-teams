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
  if (!Array.isArray(reportData)) {
    console.warn('reportData must be an array');
    return {} as ProjectGroups;
  }

  return reportData.reduce((projectAcc, dayData) => {
    if (!dayData || !Array.isArray(dayData.employees)) {
      console.warn('Invalid data structure for dayData:', dayData);
      return projectAcc;
    }

    dayData.employees.forEach((employeeData: any) => {
      if (!employeeData) {
        console.warn('employeeData is undefined');
        return;
      }

      const activities = employeeData.projects?.[0]?.activity || employeeData.activity || [];

      if (!Array.isArray(activities)) {
        console.warn('activities must be an array');
        return;
      }

      activities.forEach((activity: any) => {
        if (!activity) {
          console.warn('activity is undefined');
          return;
        }

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
        const employee = employeeData.employee || employeeData;

        if (!employee || !employee.id) {
          console.warn('Invalid employee data:', employee);
          return;
        }

        dateGroup.activities.push({
          employee,
          activity
        });
        dateGroup.totalDuration += parseInt(activity.duration || '0');
        dateGroup.members.add(employee.id);
      });
    });
    return projectAcc;
  }, {} as ProjectGroups);
};
