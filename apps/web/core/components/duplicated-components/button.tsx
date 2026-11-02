import { Button as ButtonPrimitive } from './_button';

interface IButtonProps {
	value: string;
}

const Button = ({ value }: IButtonProps) => {
	return (
		<ButtonPrimitive className="w-full my-1" size="lg" type="submit">
			{value}
		</ButtonPrimitive>
	);
};

export default Button;
