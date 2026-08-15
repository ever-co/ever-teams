import { useEditor } from '@craftjs/core';

// Custom hooks
import { useDragDropAnimation } from '../hooks/use-drag-drop-animation';
import { useSectionState } from './atoms-panel/use-section-state';

// Component data
import { componentSections, SECTION_IDS } from './atoms-panel/data';

// UI Components
import { CollapsibleSection, ComponentCard, ComponentPreview } from './atoms-panel/components';

export const AtomsPanel = () => {
	const {
		connectors: { create }
	} = useEditor();
	const dragProps = useDragDropAnimation();
	const { sectionStates, toggleSection } = useSectionState();

	return (
		<div className="py-2 space-y-3">
			{componentSections.map((section) => (
				<CollapsibleSection
					key={section.id}
					title={section.title}
					icon={section.icon}
					isExpanded={sectionStates[section.id]}
					onToggle={() => toggleSection(section.id)}
				>
					{sectionStates[section.id] && (
						<div className="grid grid-cols-2 gap-3">
							{section.components.map((comp) => (
								<ComponentCard
									key={comp.id}
									label={comp.label}
									id={comp.id}
									dragProps={dragProps}
									create={create}
									component={comp.component}
								>
									<ComponentPreview
										component={comp.component}
										customPreview={comp.customPreview}
										imageSrc={comp.imageSrc}
										label={comp.label}
									/>
								</ComponentCard>
							))}
						</div>
					)}
				</CollapsibleSection>
			))}
		</div>
	);
};

export default AtomsPanel;
