import {
	Excalidraw,
	LiveCollaborationTrigger,
	THEME,
} from '@excalidraw/excalidraw';

import { useTheme } from 'next-themes';
import { EverTeamsLogo } from 'lib/components/svgs';
import debounce from 'lodash/debounce';
import { Card, Modal } from 'lib/components';
import { IHookModal, useModal } from '@app/hooks';
import { useWhiteboard } from './hooks';

export default function ExcalidrawComponent() {
	const modal = useModal();
	const { theme } = useTheme();
	const { saveChanges, setExcalidrawAPI, excalidrawAPI } = useWhiteboard();

	return (
		<>
			<div style={{ height: '100vh' }}>
				<Excalidraw
					ref={(api) => setExcalidrawAPI(api)}
					onChange={debounce(saveChanges, 500)}
					theme={theme || THEME.LIGHT}
					renderTopRightUI={() => (
						<LiveCollaborationTrigger
							isCollaborating={false}
							type="button"
							onSelect={modal.openModal}
						/>
					)}
				/>
			</div>

			{excalidrawAPI?.ready && (
				<div className="absolute z-50 top-5 left-14 scale-75">
					<EverTeamsLogo color={THEME ? 'auto' : 'dark'} dash />
				</div>
			)}

			<SaveListModal modal={modal} />
		</>
	);
}

function SaveListModal({ modal }: { modal: IHookModal }) {
	return (
		<Modal isOpen={modal.isOpen} closeModal={modal.closeModal} alignCloseIcon>
			<Card className="w-full min-w-[600px]" shadow="custom"></Card>
		</Modal>
	);
}
