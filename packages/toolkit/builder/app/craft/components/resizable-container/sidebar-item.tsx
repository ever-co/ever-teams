import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import { IconDoubleArrow } from '../toggle-svg-icon';

const HeaderDiv = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0.625rem;
	cursor: pointer;
	position: relative;
	transition:
		background-color 0.2s,
		color 0.2s,
		border-color 0.2s;
`;

const Chevron = styled.div<{ $visible: boolean }>`
	transition: transform 0.3s cubic-bezier(0.19, 1, 0.22, 1);
	transform: ${(props) => (props.$visible ? 'rotate(180deg)' : 'none')};
`;

const ContentDiv = styled.div`
	overflow: hidden;
	transition:
		background-color 0.2s,
		border-color 0.2s;
`;

/**
 * Create a simple collapsible component.
 */
export interface SidebarItemProps {
	children: React.ReactNode;
	title: string;
	id?: string;
	defaultVisible?: boolean;
	isResizable?: boolean;
	titleClassName?: string;
	resizableId?: string;
	icon?: React.ReactNode;
	height?: string;
	onToggle?: (isVisible: boolean) => void;
}

export const SidebarItem = ({
	children,
	title,
	id,
	defaultVisible = true,
	isResizable = false,
	titleClassName = '',
	resizableId = '',
	icon,
	height,
	onToggle
}: SidebarItemProps) => {
	const [visible, setVisible] = useState<boolean>(defaultVisible);

	useEffect(() => {
		if (onToggle) {
			onToggle(visible);
		}
	}, [visible, onToggle]);

	const toggleVisibility = () => {
		setVisible(!visible);
	};

	return (
		<div className="border-b border-gray-200 dark:border-gray-700 last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors rounded-sm">
			<HeaderDiv
				onClick={toggleVisibility}
				className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200"
			>
				<div className="flex items-center gap-2.5">
					{icon && <div className="text-primary dark:text-primary-dark">{icon}</div>}
					<h2 className="text-xs font-medium uppercase tracking-wide">{title}</h2>
				</div>
				<Chevron $visible={visible}>
					<IconDoubleArrow className="text-gray-500 dark:text-gray-400" />
				</Chevron>
			</HeaderDiv>
			<AnimatePresence initial={false}>
				{visible && (
					<motion.div
						key="content"
						initial="collapsed"
						animate="open"
						exit="collapsed"
						variants={{
							open: { height: 'auto', opacity: 1 },
							collapsed: { height: 0, opacity: 0 }
						}}
						transition={{ duration: 0.3, ease: [0.19, 1, 0.22, 1] }}
					>
						<ContentDiv className={`bg-white dark:bg-gray-900 ${visible ? 'py-3.5 px-2.5' : ''}`}>
							{children}
						</ContentDiv>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
};
