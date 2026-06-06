'use client';

import { cn, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@ever-teams/toolkit-ui';

import { ChartConfig, IChartProps } from '@ever-teams/toolkit-types';

import { ChartContainer as RechartChartContainer } from './chart';

export interface IChartContainerProps extends Pick<IChartProps, 'title' | 'description' | 'footer'> {
	children: React.ReactNode & React.ReactElement<any, string | React.JSXElementConstructor<any>>;
	className?: string;
	config: ChartConfig;
}

const ChartContainer: React.FC<IChartContainerProps> = ({
	title,
	description,
	footer,
	children,
	className,
	config
}) => {
	return (
		<div className={cn('flex flex-col  p-0 max-h-[400px]', className)}>
			{(title || description) && (
				<CardHeader className="items-center p-0">
					{title && <CardTitle>{title}</CardTitle>}
					{description && <CardDescription>{description}</CardDescription>}
				</CardHeader>
			)}
			<CardContent className="flex-1 p-0">
				<RechartChartContainer className="mx-auto aspect-square h-[350px] w-full" config={config}>
					{children}
				</RechartChartContainer>
			</CardContent>
			{footer && <CardFooter className="flex-col gap-2 text-sm">{footer}</CardFooter>}
		</div>
	);
};
ChartContainer.displayName = 'PieChart';
export { ChartContainer };
