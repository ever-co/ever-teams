import { ChartConfig, ChartData, IWeeklyReports } from '@ever-teams/toolkit-types';

const convertWorkTime = (seconds: number): number => {
	return seconds / 3600; // Convert seconds to hours
};

// Main transform function
export function transformData(data: IWeeklyReports | null): ChartData[] {
	// Initialize result array with default days of the week
	// const result: ChartData[] = daysOfWeek.map((day) => ({ day }));
	const result: ChartData[] = data && data[0] ? Object.keys(data[0].dates).map((day) => ({ day })) : [];

	// Iterate over each employee entry
	data &&
		data[0] &&
		data.forEach((entry) => {
			const employeeName = entry.employee.fullName; // Use lowercase for uniformity

			// Iterate over the dates and their corresponding values
			Object.entries(entry.dates).forEach(([, value], index) => {
				// Determine the sum based on the type of value (number or object with sum)
				const sumInSeconds = typeof value === 'number' ? value : value?.sum || 0;
				const sumInHours = convertWorkTime(sumInSeconds); // Convert seconds to hours

				// If the day exists, update the result with the employee's worked time
				if (result[index]) {
					result[index][employeeName] = sumInHours.toFixed(1);
				}
			});
		});

	return result;
}

export function generateChartConfig(data: ChartData[]): ChartConfig {
	const transformed: ChartConfig = {};

	// Iterate through each day's data
	data.forEach((dayData) => {
		// Iterate through each employee's data, ignoring the "day" property
		Object.entries(dayData).forEach(([key]) => {
			if (key !== 'day') {
				// Ensure each employee is represented in the transformed object
				if (!transformed[key]) {
					transformed[key] = {
						label: key.charAt(0).toUpperCase() + key.slice(1) // Capitalize employee name
					};
				}
			}
		});
	});

	return transformed;
}
