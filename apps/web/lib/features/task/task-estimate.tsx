import { useTaskEstimation } from '@app/hooks';
import { TimeInputField } from 'lib/components';

export function TaskEstimate() {
	const {
		targetEl,
		value,
		onChange,
		handleSubmit,
		handleFocus,
		activeTeamTask,
		handleBlur,
		handleFocusMinutes,
		handleBlurMinutes,
		updateLoading,
	} = useTaskEstimation();

	return (
		<div className="flex items-center space-x-1" ref={targetEl}>
			<TimeInputField
				value={value['hours']}
				onChange={onChange('hours')}
				onKeyUp={(e) => {
					e.key === 'Enter' && handleSubmit();
				}}
				disabled={activeTeamTask ? false : true}
				onFocus={handleFocus}
				onBlur={handleBlur}
				label="h"
			/>
			<span>:</span>
			<TimeInputField
				value={value['minutes']}
				onChange={onChange('minutes')}
				onKeyUp={(e) => {
					e.key === 'Enter' && handleSubmit();
				}}
				disabled={activeTeamTask ? false : true}
				onFocus={handleFocusMinutes}
				onBlur={handleBlurMinutes}
				label="m"
				loading={updateLoading}
			/>
		</div>
	);
}
