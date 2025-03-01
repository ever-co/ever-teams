import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { IActivityReportGroupByDate, IEmployeeWithProjects, IProjectWithActivity } from '@app/interfaces/activity/IActivityReport';

// Create styles
// Register a default font
Font.register({
  family: 'Helvetica',
  src: 'https://fonts.gstatic.com/s/helveticaneue/v70/1Ptsg8zYS_SKggPNyC0IT0kLW-43aMEzIO6XUTLjad8.ttf'
});

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottom: '2 solid #E5E7EB',
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 5,
  },
  dateHeader: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    marginTop: 15,
    marginBottom: 8,
    borderRadius: 6,
  },
  dateText: {
    fontSize: 14,
    color: '#374151',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: '10px 20px',
    marginTop: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#E5E7EB',
  },
  headerCell: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#111827',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    borderLeftWidth: 1,
    borderLeftColor: '#E5E7EB',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    padding: '8px 20px',
    backgroundColor: '#FFFFFF',
  },
  memberInfo: {
    width: '20%',
    flexDirection: 'row',
    alignItems: 'center',
    fontSize: 12,
    color: '#374151',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    paddingRight: 8,
  },
  projectCell: {
    width: '25%',
    flexDirection: 'row',
    alignItems: 'center',
    fontSize: 12,
    color: '#374151',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    paddingLeft: 8,
    paddingRight: 8,
  },
  durationCell: {
    width: '15%',
    textAlign: 'right',
    color: '#374151',
    fontSize: 12,
  },
  percentageCell: {
    width: '15%',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  percentageText: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 4,
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  timeCell: {
    width: '15%',
    textAlign: 'right',
    color: '#374151',
    fontSize: 12,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    paddingLeft: 8,
    paddingRight: 8,
  },
  appCell: {
    width: '25%',
    color: '#374151',
    fontSize: 12,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    paddingLeft: 8,
    paddingRight: 8,
  },
  contentWrapper: {
    flex: 1,
    width: '100%'
  },
  summarySection: {
    marginTop: 40,
    backgroundColor: '#F9FAFB',
    padding: '25px',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 20,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  summaryGroup: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 15,
  },
  summaryGroupTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#4B5563',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingLeft: 10,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#374151',
    width: '60%',
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#111827',
    width: '40%',
    textAlign: 'right',
  },
  highlightValue: {
    color: '#059669',
  }
});

interface ProductivityPDFProps {
  data: IActivityReportGroupByDate[];
  title?: string;
}

const getEmployeeName = (employee: IEmployeeWithProjects) => {
  const { fullName } = employee.employee || {};
  return fullName || 'Unknown';
};

const getProjectName = (project: IProjectWithActivity) => {
  return project.project?.name || 'Ever Teams';
};

const formatDateHeader = (date: string) => {
  const d = new Date(date);
  return `${d.toLocaleDateString('en-US', { weekday: 'long' })} ${d.getDate().toString().padStart(2, '0')} ${d.toLocaleDateString('en-US', { month: 'short' })} ${d.getFullYear()}`;
};

export const ProductivityPDF = ({ data, title = 'Activity Report' }: ProductivityPDFProps) => {
  // Calculate summary statistics
  const calculateSummary = (data: IActivityReportGroupByDate[]) => {
    let totalDuration = 0;
    let totalActivities = 0;
    const employeeStats = new Map<string, { duration: number; activities: number }>();
    const projectStats = new Map<string, { duration: number; activities: number }>();

    data.forEach(dayData => {
      dayData.employees.forEach(employee => {
        const employeeName = getEmployeeName(employee);
        if (!employeeStats.has(employeeName)) {
          employeeStats.set(employeeName, { duration: 0, activities: 0 });
        }

        employee.projects.forEach(project => {
          const projectName = getProjectName(project);
          if (!projectStats.has(projectName)) {
            projectStats.set(projectName, { duration: 0, activities: 0 });
          }

          project.activity.forEach(activity => {
            const duration = parseFloat(activity.duration?.toString() || '0');
            totalDuration += duration;
            totalActivities++;

            const empStats = employeeStats.get(employeeName)!;
            empStats.duration += duration;
            empStats.activities++;

            const projStats = projectStats.get(projectName)!;
            projStats.duration += duration;
            projStats.activities++;
          });
        });
      });
    });

    // Find most active employee and project
    let mostActiveEmployee = { name: '', duration: 0 };
    let mostActiveProject = { name: '', duration: 0 };

    employeeStats.forEach((stats, name) => {
      if (stats.duration > mostActiveEmployee.duration) {
        mostActiveEmployee = { name, duration: stats.duration };
      }
    });

    projectStats.forEach((stats, name) => {
      if (stats.duration > mostActiveProject.duration) {
        mostActiveProject = { name, duration: stats.duration };
      }
    });

    return {
      totalDuration,
      totalActivities,
      averageDuration: totalActivities > 0 ? totalDuration / totalActivities : 0,
      mostActiveEmployee,
      mostActiveProject,
      uniqueEmployees: employeeStats.size,
      uniqueProjects: projectStats.size
    };
  };

  const summary = calculateSummary(data);
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const formatDuration = (duration: string | number) => {
    if (!duration) return '0h 0m';
    const minutes = typeof duration === 'string' ? parseInt(duration, 10) : duration;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes.toString().padStart(2, '0')}m`;
  };



  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>Generated on {today}</Text>
        </View>
        <View style={styles.contentWrapper}>
          {data.map((dayData, index) => (
            <React.Fragment key={index}>
              {/* Date Header */}
              <View style={styles.dateHeader}>
                <Text style={styles.dateText}>{formatDateHeader(dayData.date)}</Text>
              </View>

              {/* Table Header */}
              <View style={styles.tableHeader}>
                <View style={[styles.memberInfo, styles.headerCell]}>
                  <Text>Employee</Text>
                </View>
                <View style={[styles.projectCell, styles.headerCell]}>
                  <Text>Project</Text>
                </View>
                <View style={[styles.appCell, styles.headerCell]}>
                  <Text>Activity</Text>
                </View>
                <View style={[styles.timeCell, styles.headerCell]}>
                  <Text>Duration</Text>
                </View>
                <View style={[styles.percentageCell, styles.headerCell]}>
                  <Text>Progress</Text>
                </View>
              </View>

              {/* Activities for the day */}
              {dayData.employees.map((employee, empIndex) => (
                employee.projects.flatMap((project, projIndex) =>
                  project.activity.map((activity, actIndex) => (
                    <View style={styles.memberRow} key={`${index}-${empIndex}-${projIndex}-${actIndex}`}>
                      {/* Member */}
                      <View style={styles.memberInfo}>
                        <Text>{getEmployeeName(employee)}</Text>
                      </View>

                      {/* Project */}
                      <View style={styles.projectCell}>
                        <Text>{getProjectName(project)}</Text>
                      </View>

                        {/* Application */}
                        <View style={styles.appCell}>
                          <Text>{activity.title}</Text>
                        </View>

                        {/* Time Spent */}
                        <View style={styles.timeCell}>
                          <Text>{formatDuration(activity.duration)}</Text>
                        </View>

                        {/* Percent Used */}
                        <View style={styles.percentageCell}>
                          <Text style={styles.percentageText}>{parseFloat(activity.duration_percentage?.toString() || '0').toFixed(1)}%</Text>
                          <View style={styles.progressBar}>
                            <View style={[styles.progressFill, { width: `${Math.min(parseFloat(activity.duration_percentage?.toString() || '0'), 100)}%` }]} />
                          </View>
                        </View>
                      </View>
                    ))
                  )
              ))}
            </React.Fragment>
          ))}
          {/* Summary Section */}
          <View style={styles.summarySection}>
            <Text style={styles.summaryTitle}>Performance Summary</Text>

            {/* Time Statistics */}
            <View style={styles.summaryGroup}>
              <Text style={styles.summaryGroupTitle}>Time Overview</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Working Hours:</Text>
                <Text style={[styles.summaryValue, styles.highlightValue]}>{formatDuration(summary.totalDuration)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Average Time per Activity:</Text>
                <Text style={styles.summaryValue}>{formatDuration(summary.averageDuration)}</Text>
              </View>
            </View>

            {/* Activity Statistics */}
            <View style={styles.summaryGroup}>
              <Text style={styles.summaryGroupTitle}>Activity Metrics</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Activities Completed:</Text>
                <Text style={[styles.summaryValue, styles.highlightValue]}>{summary.totalActivities}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Active Projects:</Text>
                <Text style={styles.summaryValue}>{summary.uniqueProjects}</Text>
              </View>
            </View>

            {/* Team Performance */}
            <View style={styles.summaryGroup}>
              <Text style={styles.summaryGroupTitle}>Team Performance</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Team Size:</Text>
                <Text style={styles.summaryValue}>{summary.uniqueEmployees} members</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Top Performer:</Text>
                <Text style={[styles.summaryValue, styles.highlightValue]}>{summary.mostActiveEmployee.name}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Most Active Project:</Text>
                <Text style={[styles.summaryValue, styles.highlightValue]}>{summary.mostActiveProject.name}</Text>
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
};
