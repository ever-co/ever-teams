import { ShadCnSelect, SelectTrigger, SelectContent, SelectValue, Label } from '@ever-teams/toolkit-ui';
import { ToolbarDropdownProps } from '../../types';

export const ToolbarDropdown: React.FC<ToolbarDropdownProps> = ({ title, value, onChange, children }) => {
	return (
		<div className="flex flex-col">
			<Label>{title}</Label>
			<ShadCnSelect value={value} onValueChange={onChange}>
				<SelectTrigger>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>{children}</SelectContent>
			</ShadCnSelect>
		</div>
	);
};
