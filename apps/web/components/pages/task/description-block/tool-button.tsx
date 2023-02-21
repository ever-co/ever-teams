import Image from 'next/image';
interface IToolButtonProps {
	activity?: boolean;
	onSelect?: () => void;
	iconSource: string;
}

const ToolButton = (props: IToolButtonProps) => {
	return (
		<>
			<button
				className={`${
					props.activity ? 'bg-zinc-200 dark:text-black' : ''
				}  w-6 my-2 rounded-md mr-1 flex items-center justify-center text-white `}
				onClick={props.onSelect}
			>
				<Image
					className="text-white"
					width={22}
					height={22}
					alt="bold"
					src={props.iconSource}
				/>
			</button>
		</>
	);
};
export default ToolButton;
