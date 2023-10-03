export const TodoTaskIcon = ({
	color = '#56f000'
}: {
	color?: string;
	background: string;
}) => {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 16 16"
			width="13"
			height="13"
			className="mr-1"
		>
			<path d="M8 9.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" fill={color}></path>
			<path
				fillRule="evenodd"
				d="M8 0a8 8 0 100 16A8 8 0 008 0zM1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0z"
				fill={color}
			></path>
		</svg>
	);
};
