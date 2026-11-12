/** The member of an Add time form that offers no choice of member: read as text, so it never looks like a field. */
export function FixedMemberField({ label, name, hint }: Readonly<{ label: string; name: string; hint: string }>) {
	return (
		<div className="flex flex-col gap-1.5">
			<span className="text-sm font-medium leading-none text-foreground">{label}</span>
			<span className="text-sm text-foreground">{name}</span>
			<span className="text-xs text-muted-foreground">{hint}</span>
		</div>
	);
}
