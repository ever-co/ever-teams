import { clsxm } from '@/core/lib/utils';
import { PropsWithChildren, cloneElement, isValidElement } from 'react';
import { SpinnerLoader } from './loader';
import { useTranslations } from 'next-intl';
import { ChevronLeft } from '@/core/components/icons/hugeicons';
import { buttonVariants } from '../duplicated-components/_button';
import type { ButtonSize, ButtonVariant } from '../duplicated-components/_button';

type LegacyVariant =
	| 'primary'
	| 'secondary'
	| 'outline'
	| 'outline-dark'
	| 'outline-danger'
	| 'ghost'
	| 'light'
	| 'dark'
	| 'grey'
	| 'danger';

type Props = {
	variant?: LegacyVariant;
	size?: ButtonSize;
	loading?: boolean;
	asChild?: boolean;
} & PropsWithChildren &
	React.ComponentPropsWithRef<'button'>;

const RECIPE_BY_LEGACY_VARIANT: Record<LegacyVariant, ButtonVariant> = {
	primary: 'default',
	danger: 'destructive',
	outline: 'outline',
	'outline-dark': 'outline',
	'outline-danger': 'outline',
	grey: 'outline',
	dark: 'outline',
	secondary: 'ghost',
	ghost: 'ghost',
	light: 'ghost'
};

const FILLED_VARIANTS: ReadonlySet<LegacyVariant> = new Set(['primary', 'danger']);

function spinnerVariantFor(variant: LegacyVariant) {
	if (FILLED_VARIANTS.has(variant)) {
		return 'light';
	}
	return 'primary';
}

function recipeVariantFor(variant: LegacyVariant): ButtonVariant {
	return RECIPE_BY_LEGACY_VARIANT[variant];
}

function legacyButtonClasses(variant: LegacyVariant, size: ButtonSize, className?: string) {
	const recipe = buttonVariants({ variant: recipeVariantFor(variant), size });
	const isDangerOutline = variant === 'outline-danger';
	return clsxm(recipe, isDangerOutline && 'text-destructive-ink', className);
}

/**
 * The app-wide button with the legacy variant names. Each legacy name resolves to one recipe of
 * `buttonVariants`; `size` defaults to `lg` because this component carries the call-to-action buttons.
 */
export function Button({
	children,
	className,
	variant = 'primary',
	size = 'lg',
	loading,
	asChild = false,
	...rest
}: Props) {
	const buttonClasses = legacyButtonClasses(variant, size, className);
	const spinner = <SpinnerLoader size={16} variant={spinnerVariantFor(variant)} />;

	if (asChild && isValidElement(children)) {
		const childProps = children.props as any;
		const newProps = {
			...rest,
			// Announce loading state for non-button children (e.g., <a/>, <Link/>)
			'aria-busy': loading || undefined,
			className: clsxm(buttonClasses, childProps.className)
		};

		const newChildren = loading ? (
			<>
				{spinner}
				{childProps.children}
			</>
		) : (
			childProps.children
		);

		return cloneElement(children as any, newProps, newChildren);
	}

	return (
		<button
			data-slot="button"
			{...rest}
			type={rest?.type ?? 'button'}
			disabled={rest?.disabled ?? !!loading}
			aria-busy={loading || undefined}
			className={buttonClasses}
		>
			{loading && spinner}
			{children}
		</button>
	);
}

type RoundedButtonProps = PropsWithChildren & React.ComponentPropsWithRef<'button'>;

export function RoundedButton({ children, className, ...rest }: RoundedButtonProps) {
	return (
		<button
			className={clsxm(
				'bg-card text-foreground rounded-full hairline-ring ring-foreground/10 shadow-md shadow-black/10 dark:ring-foreground/15',
				'flex justify-center items-center outline-none transition-colors hover:bg-muted/50',
				'focus-visible:ring-[3px] focus-visible:ring-ring/25',
				className
			)}
			{...rest}
		>
			{children}
		</button>
	);
}

export function BackButton({ onClick, className }: { onClick?: () => void; className?: string }) {
	const t = useTranslations();
	return (
		<button
			type="button"
			onClick={onClick}
			className={clsxm(
				'inline-flex items-center gap-1 rounded-md text-sm text-muted-foreground outline-none transition-colors',
				'hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25',
				className
			)}
		>
			<ChevronLeft className="size-4" />
			<span>{t('common.BACK')}</span>
		</button>
	);
}
