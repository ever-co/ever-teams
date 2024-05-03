'use client';
import SadCry from '@components/ui/svgs/sad-cry';
import { Button, Text } from 'lib/components';
import Link from 'next/link';

function NotFound() {
	return (
		<div className=" w-screen h-screen flex flex-col  items-center justify-center">
			<div className="flex flex-col items-center justify-center gap-4">
				<div className="m-auto relative flex justify-center items-center gap-4 text-center ">
					<SadCry width={97} height={97} />
					<Text className="text-[78px] font-semibold text-chetwodeBlue">404!</Text>
				</div>

				<Text className="text-[40px] font-bold text-center text-[#282048] dark:text-light--theme">
					Page not found !
				</Text>

				<Text className="text-[20px] font-normal text-center text-gray-400">
					{`We looked, but can't find it ....`}
				</Text>

				<Button className="m-auto font-normal rounded-lg ">
					<Link href="/">Go back to home</Link>
				</Button>
			</div>
		</div>
	);
}

export default NotFound;
