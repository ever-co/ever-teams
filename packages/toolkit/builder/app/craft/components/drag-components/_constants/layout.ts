/**
 * Layout related default props
 */

// Define all objects as constants first
const marginPaddingObject = {
	margin: {
		t: 0,
		r: 0,
		b: 0,
		l: 0,
		isMultiple: false,
		all: 0
	},
	padding: {
		t: 0,
		r: 0,
		b: 0,
		l: 0,
		isMultiple: false,
		all: 0
	}
};

const containerProps = {
	width: 470,
	backgroundImage: '',
	padding: 0,
	borderRadius: marginPaddingObject.margin
};

const gridProps = {
	cols: 2,
	rows: 2,
	gap: 0,
	margin: marginPaddingObject.margin
};

const colLayoutProps = {
	rows: 3,
	margin: marginPaddingObject.margin
};

const flexLayoutProps = {
	cols: 3,
	margin: marginPaddingObject.margin
};

// Then export them as named exports
export {
	marginPaddingObject as marginpaddingObj,
	containerProps as ContainerDefaultProps,
	gridProps as GridDefaultProps,
	colLayoutProps as ColLayoutDefaultProps,
	flexLayoutProps as FlexLayoutDefaultProps
};
