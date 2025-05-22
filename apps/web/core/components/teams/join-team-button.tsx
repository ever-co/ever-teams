interface IJoinTeamButton {
	value: string;
}

const JoinTeamButton = ({ value }: IJoinTeamButton) => {
	return (
		<button
			type={undefined}
			className="w-full mt-1 px-4 py-2 h-[45px] border border-[#D7E1EB] tracking-wide text-primary dark:text-primary transition-colors duration-200 transform bg-[#F4F7FF] rounded-[12px] hover:opacity-80 font-bold focus:outline-none"
		>
			{value}
		</button>
	);
};
export default JoinTeamButton;
