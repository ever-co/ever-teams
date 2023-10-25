import { Text } from 'lib/components';

export function NoData({ text }: { text: string }) {
	return (
		<div className="w-full flex flex-col p-5 gap-2">
			<div className="m-auto w-[6rem] h-[6rem] rounded-full relative flex justify-center items-center text-center p-5 bg-[#6755c933] dark:bg-light--theme-light">
				<Text className="text-3xl text-primary font-semibold">0</Text>
			</div>

			<Text className="text-lg font-normal text-center  text-[#282048] dark:text-light--theme">{text}</Text>
		</div>
	);
}
