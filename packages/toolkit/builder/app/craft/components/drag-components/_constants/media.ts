/**
 * Media component related default props
 */
import { marginpaddingObj } from './layout';

// Define constant
const imageProps = {
	src: '',
	width: 224,
	height: 224,
	margin: marginpaddingObj.margin,
	objectFit: 'cover',
	opacity: 100,
	align: 'left'
};

// Export as named export
export { imageProps as ImageDefaultProps };
