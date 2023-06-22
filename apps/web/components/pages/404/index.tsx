import { Button, Text } from 'lib/components';
import Link from 'next/link';

function NotFound() {
	return (
		<div className="mt-28">
			<div className="m-auto w-[218px] h-[218px] rounded-full relative flex justify-center items-center text-center p-5 bg-[#6755c933] dark:bg-light--theme-light">
				<Text className="text-6xl text-primary font-semibold">404</Text>
			</div>

			<Text className="text-2xl font-normal text-center mt-10 text-[#282048] dark:text-light--theme">
				Not Found
			</Text>
			<Text className="text-base font-normal text-gray-400 text-center mt-5">
				Resource you are looking for not found!
			</Text>
			<Link href="/">
				<Button className="m-auto rounded-lg mt-10 font-normal pl-7 pr-7">
					Go to homepage
				</Button>
			</Link>
		</div>
	);
}

export default NotFound;
