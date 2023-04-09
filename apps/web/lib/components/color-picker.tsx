import { useCallbackRef } from '@app/hooks';
import { clsxm } from '@app/utils';
import { useState, useEffect } from 'react';
import { HexColorPicker } from 'react-colorful';
import { Dropdown } from './dropdown';

export const ColorPicker = ({
	defaultColor,
	onChange,
}: {
	defaultColor?: string;
	onChange?: (color?: string) => void;
}) => {
	const randomColor = Math.floor(Math.random() * 16777215).toString(16);
	const [color, setColor] = useState(defaultColor || '#' + randomColor);
	const onChangeRef = useCallbackRef(onChange);

	useEffect(() => {
		if (defaultColor) {
			setColor(defaultColor);
		}
	}, [defaultColor]);

	useEffect(() => {
		if (color && onChangeRef.current) {
			onChangeRef.current(color);
		}
	}, [color, onChangeRef]);

	return (
		<Dropdown
			className="min-w-[150px] max-w-sm"
			buttonClassName={clsxm('py-0 font-medium h-[54px] w-[150px]')}
			value={{
				key: color,
				Label: () => (
					<div className="flex items-center space-x-2">
						<span
							className="w-5 h-5 rounded-full block"
							style={{ backgroundColor: color }}
						/>
						<span>{color}</span>
					</div>
				),
			}}
			items={[]}
			closeOnChildrenClick={false}
		>
			<HexColorPicker color={color} onChange={setColor} />
		</Dropdown>
	);
};
