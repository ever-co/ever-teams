import { Text } from '@/core/components';

export function NoData({ text, component }: { text: string; component?: React.ReactNode }) {
	return (
		<div className="w-full flex flex-col items-center p-5 gap-3">
			<div className="size-10 rounded-lg relative flex justify-center items-center text-center bg-foreground/5 text-muted-foreground [&_svg]:size-5">
				<Text className="text-sm font-semibold tabular-nums text-muted-foreground">{component ?? '0'}</Text>
			</div>

			<Text className="text-sm font-semibold text-center text-balance text-foreground">{text}</Text>
		</div>
	);
}
