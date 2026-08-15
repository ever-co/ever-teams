import { useState } from 'react';

export interface MarginPaddingValues {
	t: number;
	r: number;
	b: number;
	l: number;
	isMultiple: boolean;
	all: number;
}

const filterMargin = (obj: MarginPaddingValues) => {
	return obj.isMultiple ? `${obj.t}px ${obj.r}px ${obj.b}px ${obj.l}px` : `${obj.all}px`;
};

export default filterMargin;
