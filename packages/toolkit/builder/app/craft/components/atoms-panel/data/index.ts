import { sectionConfig, SECTION_IDS } from './section-config';
import { timerComponents } from './timer-components';
import { chartComponents } from './chart-components';
import { dateComponents } from './date-components';
import { typographyComponents } from './typography-components';
import { uiComponents } from './ui-components';
import { layoutComponents } from './layout-components';
import { ComponentDefinition, ComponentSection } from '../../../types/component-types';

export { SECTION_IDS };

// Component section mappings
const componentMap: Record<string, ComponentDefinition[]> = {
	[SECTION_IDS.TIMER]: timerComponents,
	[SECTION_IDS.CHART]: chartComponents,
	[SECTION_IDS.DATE]: dateComponents,
	[SECTION_IDS.TYPOGRAPHY]: typographyComponents,
	[SECTION_IDS.UI]: uiComponents,
	[SECTION_IDS.LAYOUT]: layoutComponents
};

// Assemble component sections
export const componentSections: ComponentSection[] = sectionConfig.map((section) => ({
	...section,
	components: componentMap[section.id] || []
}));
