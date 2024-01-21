'use client';
import { RocketIcon } from '@components/ui/svgs/rocket';
import { Text } from 'lib/components';
function Maintenance() {
	return (
		<div className="mt-28 flex flex-col gap-7 jutify-center items-center">
			<div className="m-auto relative flex justify-center items-center gap-4 text-center ">
				<RocketIcon width={97} height={97} />
				<Text className="text-[78px] font-semibold text-chetwodeBlue">We&apos;re Under Maintenance</Text>
			</div>

			<Text className="text-[40px] font-bold text-center text-[#282048] dark:text-light--theme">
				We&apos;re currently updating our website to serve you better. Please check back later.
			</Text>
		</div>
	);
}

export default Maintenance;
