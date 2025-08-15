import { z } from 'zod';
import { uuIdSchema } from '../common/base.schema';

export const taskStatisticSchema = z.object({
	id: uuIdSchema,
	title: z.string(),
	duration: z.number().nonnegative(),
	todayDuration: z.number().nonnegative(),
	updatedAt: z.string().or(z.date()).optional(),
	durationPercentage: z.number()
});

export const taskStatisticsSchema = z.array(taskStatisticSchema);
export type TTaskStatistics = z.infer<typeof taskStatisticsSchema>;
export type TTaskStatistic = z.infer<typeof taskStatisticSchema>;
