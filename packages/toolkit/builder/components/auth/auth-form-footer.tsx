import { Button } from '../button';
import Link from 'next/link';

interface AuthFormFooterProps {
  onSwitchMethod: () => void;
  switchMethodText: string;
  loading: boolean;
}

export function AuthFormFooter({ onSwitchMethod, switchMethodText, loading }: AuthFormFooterProps) {
  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex flex-col items-start gap-2">
        <div className="flex items-center justify-start gap-2 text-sm">
          <span
            onClick={onSwitchMethod}
            className="text-[#3826A6] dark:text-[#6755c9] cursor-pointer dark:text-primary-light"
          >
            {switchMethodText}
          </span>
        </div>
        <div className="flex items-center justify-start gap-2 text-sm w-full dark:text-white/60">
          <span>Don&apos;t have an account?</span>
          <Link href="#" className="text-[#3826A6] dark:text-[#6755c9]">
            <span>Register Now!</span>
          </Link>
        </div>
      </div>

      <Button type="submit" loading={loading} disabled={loading}>
        Continue
      </Button>
    </div>
  );
}