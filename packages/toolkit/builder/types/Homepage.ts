import React from 'react';

export interface Feature {
	main: string;
	sub?: string[];
}

export interface Builder {
	name: string;
	icon: string;
	href: string;
	features: Feature[];
	tags: string[];
}

export interface ImageConfig {
	src: string;
	width: number;
	height: number;
}

export interface ComparisonRow {
	feature: string;
	plasmic: string | React.ReactNode;
	builder: string | React.ReactNode;
	grapes: string;
	craft: string;
}

export interface UserType {
	title: string;
	explanation: string;
}
