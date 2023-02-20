import Image from 'next/image';

type TaskLabelProps = {
	iconSrc?: string;
	label: string;
	alignWithIconLabel?: boolean;
};

const TaskLabel: React.FC<TaskLabelProps> = ({
	iconSrc,
	label,
	alignWithIconLabel,
}) => {
	return (
		<div className="flex">
			{iconSrc ? (
				<Image
					src={iconSrc}
					alt="issue type"
					width={14}
					height={14}
					style={{ marginRight: '5px', height: '14px' }}
				/>
			) : (
				alignWithIconLabel && (
					<div style={{ height: '14px', width: '14px', marginRight: '5px' }} />
				)
			)}
			<div className="details-label">{label}</div>
		</div>
	);
};

export default TaskLabel;
