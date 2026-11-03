import { z } from 'zod';

const reportUserSchema = z
	.object({
		id: z.string().optional(),
		firstName: z.string().nullable().optional(),
		lastName: z.string().nullable().optional(),
		name: z.string().nullable().optional(),
		imageUrl: z.string().nullable().optional()
	})
	.passthrough();

/** Gauzy stores rates as numeric columns, which some drivers serialise as strings. */
const optionalNumberSchema = z.coerce.number().nullable().optional();

export const owedReportEmployeeSchema = z
	.object({
		id: z.string(),
		userId: z.string().nullable().optional(),
		billRateValue: optionalNumberSchema,
		billRateCurrency: z.string().nullable().optional(),
		user: reportUserSchema.nullable().optional()
	})
	.passthrough();

export const owedReportDaySchema = z
	.object({
		date: z.string(),
		employees: z.array(
			z
				.object({
					employee: owedReportEmployeeSchema.nullable(),
					amount: z.coerce.number().catch(0),
					duration: z.coerce.number().min(0).catch(0)
				})
				.passthrough()
		)
	})
	.passthrough();

export const projectBudgetReportSchema = z
	.object({
		project: z
			.object({
				id: z.string(),
				name: z.string().nullable().optional(),
				imageUrl: z.string().nullable().optional(),
				membersCount: optionalNumberSchema,
				currency: z.string().nullable().optional(),
				color: z.string().nullable().optional()
			})
			.passthrough(),
		budgetType: z.string().nullable().optional(),
		budget: z.coerce.number().catch(0),
		spent: z.coerce.number().catch(0),
		remainingBudget: z.coerce.number().catch(0),
		spentPercentage: z.coerce.number().catch(0)
	})
	.passthrough();

export type TOwedReportEmployee = z.infer<typeof owedReportEmployeeSchema>;
export type TOwedReportDay = z.infer<typeof owedReportDaySchema>;
export type TProjectBudgetReport = z.infer<typeof projectBudgetReportSchema>;
