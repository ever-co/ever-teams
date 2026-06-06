/**
 * Text component related default props
 */
import { marginpaddingObj } from './layout';

// Define constants
const textProps = {
	text: 'Your Title Here',
	fontWeight: 'normal',
	...marginpaddingObj,
	color: '#000000',
	fontSize: 20,
	opacity: 100,
	fontDecoration: 'none',
	align: 'left'
};

const paragraphProps = {
	text: `Lorem ipsum dolor sit amet, consectetur adipisicing elit. Et reprehenderit alias
  exercitationem cupiditate nostrum? Vel illo reprehenderit, sed distinctio iure quod,
  dicta at rem consequatur labore minus`,
	fontSize: 18,
	opacity: 100,
	color: '#000000',
	width: 300,
	height: 300,
	lineHeight: 1.5,
	...marginpaddingObj,
	fontWeight: '400',
	fontDecoration: 'none',
	align: 'left'
};

const linkProps = {
	text: 'link',
	href: 'https://www.ever.team',
	openInNewTab: false,
	...marginpaddingObj,
	fontSize: 20,
	color: '#007bff',
	hoverColor: '#0056b3',
	visitedColor: '#6c757d',
	opacity: 100,
	fontDecoration: 'none',
	align: 'left'
};

// Export as named exports
export { textProps as TextDefaultProps, paragraphProps as ParagraphDefaultProps, linkProps as LinkDefaultProps };
