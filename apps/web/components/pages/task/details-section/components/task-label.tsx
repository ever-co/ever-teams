import Image from 'next/image';

type TaskLabelProps = {
	labelIconPath?: string;
	afterIconPath?: string;
	labelTitle?: string;
	alignWithIconLabel?: boolean;
};

const TaskLabel: React.FC<TaskLabelProps> = ({ labelIconPath, afterIconPath, labelTitle, alignWithIconLabel }) => {
	return (
		<div
			className={`flex ${
				labelTitle === 'Assignees' || labelTitle === 'Estimations' || labelTitle === 'Total Group Time'
					? 'h-6'
					: ''
			} items-center `}
		>
			{labelIconPath ? (
				<Image
					src={labelIconPath}
					alt="issue type"
					width={14}
					height={14}
					style={{ marginRight: '5px', height: '14px' }}
				/>
			) : (
				alignWithIconLabel && <div style={{ height: '14px', width: '14px', marginRight: '5px' }} />
			)}
			<div className="details-label">{labelTitle}</div>
			{afterIconPath && (
				<Image
					src={afterIconPath}
					alt="issue type"
					width={14}
					height={14}
					style={{ marginLeft: '5px', height: '14px' }}
				/>
			)}
		</div>
	);
};

export default TaskLabel;

// ${labelTitle !== 'Assignees' && 'items-center'}
