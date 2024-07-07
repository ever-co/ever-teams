import * as React from 'react';
import * as Toast from '@radix-ui/react-toast';
type Props = {
  title: string;
  message: string;
  show: boolean;
  autoClose: boolean;
  timeout: number;
  onClose: () => void;
};
export const ToastComponent = ({
  title,
  message,
  show,
  autoClose,
  timeout,
  onClose,
}: Props) => {
  const timerRef = React.useRef(0);
  React.useEffect(() => {
    // return () => clearTimeout(timerRef.current);
    if (autoClose) {
      clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        onClose();
      }, timeout);
    }
  }, []);

  return (
    <Toast.Provider swipeDirection="up">
      <Toast.Root
        className="bg-gray rounded-md shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] p-[15px] grid [grid-template-areas:_'title_action'_'description_action'] grid-cols-[auto_max-content] gap-x-[15px] items-center data-[state=open]:animate-slideIn data-[state=closed]:animate-hide data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:transition-[transform_200ms_ease-out] data-[swipe=end]:animate-swipeOut"
        open={show}
        duration={timeout}
      >
        <Toast.Title className="[grid-area:_title] mb-[5px] font-medium text-slate12 text-[15px] text-bold">
          {title}
        </Toast.Title>
        <Toast.Description asChild>
          <span className="text-base fs-4">{message}</span>
        </Toast.Description>
        <Toast.Action
          className="[grid-area:_action]"
          asChild
          altText="Goto schedule to undo"
        >
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center rounded font-medium text-xs px-[10px] leading-[25px] h-[25px] bg-green2 text-green11 shadow-[inset_0_0_0_1px] shadow-green7 hover:shadow-[inset_0_0_0_1px] hover:shadow-green8 focus:shadow-[0_0_0_2px] focus:shadow-green8"
          >
            Close
          </button>
        </Toast.Action>
      </Toast.Root>
      <Toast.Viewport className="[--viewport-padding:_25px] fixed bottom-0 right-0 flex flex-col p-[var(--viewport-padding)] gap-[10px] w-[390px] max-w-[100vw] m-0 list-none z-[2147483647] outline-none" />
    </Toast.Provider>
  );
};
