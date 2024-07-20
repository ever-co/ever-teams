"use client"

import { IDailyPlan } from "@app/interfaces";

export const dailyPlanCompareEstimated = (plans: IDailyPlan[]) => {

    const plan = plans.find((plan) => plan.date?.toString()?.startsWith(new Date()?.toISOString().split('T')[0]));

    const times = plan?.tasks?.map((task) => task?.estimate).filter((time): time is number => typeof time === 'number') ?? [];
    const estimated = plan?.tasks?.map((task) => task.estimate! > 0);

    let estimatedTime = 0;
    if (times.length > 0) estimatedTime = times.reduce((acc, cur) => acc + cur, 0) ?? 0;

    const workedTimes =
        plan?.tasks?.map((task) => task.totalWorkedTime).filter((time): time is number => typeof time === 'number') ??
        [];

    let totalWorkTime = 0;
    if (workedTimes?.length > 0) totalWorkTime = workedTimes.reduce((acc, cur) => acc + cur, 0) ?? 0;

    const result = estimated?.every(Boolean) ? estimatedTime - totalWorkTime : null;

    return {
        result,
        totalWorkTime,
        estimatedTime
    }
}
