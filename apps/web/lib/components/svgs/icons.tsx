import { IClassName } from '@app/interfaces';
import { clsxm } from '@app/utils';

export function SettingsOutlineIcon({ className }: IClassName) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			strokeWidth="1.5"
			stroke="currentColor"
			className={clsxm('w-6 h-6', className)}
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
			/>
			<path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
		</svg>
	);
}
// ============================= TrashIcon ===========================//
// common
export function TrashIcon({ className }: IClassName) {
	return (
		<svg
			width="20"
			height="20"
			viewBox="0 0 20 20"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
		>
			<path
				d="M14 3.98665C11.78 3.76665 9.54667 3.65332 7.32 3.65332C6 3.65332 4.68 3.71999 3.36 3.85332L2 3.98665"
				stroke="#DE5536"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M5.66699 3.31325L5.81366 2.43992C5.92033 1.80659 6.00033 1.33325 7.12699 1.33325H8.87366C10.0003 1.33325 10.087 1.83325 10.187 2.44659L10.3337 3.31325"
				stroke="#DE5536"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M12.5669 6.09326L12.1336 12.8066C12.0603 13.8533 12.0003 14.6666 10.1403 14.6666H5.86026C4.00026 14.6666 3.94026 13.8533 3.86693 12.8066L3.43359 6.09326"
				stroke="#DE5536"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M6.88672 11H9.10672"
				stroke="#DE5536"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M6.33301 8.33325H9.66634"
				stroke="#DE5536"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

// ============================= ArrowLeft ===========================//
// common
export function ArrowLeft({ className }: IClassName) {
	return (
		<svg
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
		>
			<path
				d="M9.57 5.93018L3.5 12.0002L9.57 18.0702"
				className="stroke-[#292D32] dark:stroke-white"
				strokeWidth="1.5"
				strokeMiterlimit="10"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M20.4999 12H3.66992"
				className="stroke-[#292D32] dark:stroke-white"
				strokeWidth="1.5"
				strokeMiterlimit="10"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

// ============================= ArrowRight ===========================//

export function ArrowRight({ className }: IClassName) {
	return (
		<svg
			width="24"
			height="24"
			viewBox="0 0 26 27"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
		>
			<path
				d="M16.835 6.91833L23.9166 14L16.835 21.0817"
				strokeWidth="3"
				strokeMiterlimit="10"
				strokeLinecap="round"
				strokeLinejoin="round"
				className="stroke-primary dark:stroke-white"
			/>
			<path
				d="M4.08301 14H23.718"
				strokeWidth="3"
				strokeMiterlimit="10"
				strokeLinecap="round"
				strokeLinejoin="round"
				className="stroke-primary dark:stroke-white"
			/>
		</svg>
	);
}

// ============================= ArrowDown ===========================//

export function ArrowDown({ className }: IClassName) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="14"
			height="14"
			viewBox="0 0 14 14"
			fill="none"
			className={className}
		>
			<path
				d="M11.6209 9.27917L7.81753 5.47584C7.36836 5.02667 6.63336 5.02667 6.18419 5.47584L2.38086 9.27917"
				strokeWidth="1.5"
				strokeMiterlimit="10"
				strokeLinecap="round"
				strokeLinejoin="round"
				className="stroke-[#B1AEBC]"
			/>
		</svg>
	);
}
// common -> arrows -> chevron
export function SimpleArrowRight({ className }: IClassName) {
	return (
		<svg
			width="16"
			height="16"
			viewBox="0 0 16 16"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
		>
			<path
				d="M5.94 13.2802L10.2867 8.93355C10.8 8.42021 10.8 7.58021 10.2867 7.06688L5.94 2.72021"
				// stroke="#B1AEBC"
				strokeWidth="1.5"
				strokeMiterlimit="10"
				strokeLinecap="round"
				strokeLinejoin="round"
				className={className}
			/>
		</svg>
	);
}
// ============================= DevicesIcon ===========================//
// unique device icon
export function DevicesIcon({ className }: IClassName) {
	return (
		<svg
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
		>
			<path
				d="M17.0104 12.7298C17.6014 12.7298 18.0804 12.2507 18.0804 11.6598C18.0804 11.0688 17.6014 10.5898 17.0104 10.5898C16.4195 10.5898 15.9404 11.0688 15.9404 11.6598C15.9404 12.2507 16.4195 12.7298 17.0104 12.7298Z"
				className="stroke-default dark:stroke-white"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M20 6V7.78998C19.75 7.75998 19.46 7.73999 19.15 7.73999H14.87C12.73 7.73999 12.02 8.45003 12.02 10.59V15.7H6C2.8 15.7 2 14.9 2 11.7V6C2 2.8 2.8 2 6 2H16C19.2 2 20 2.8 20 6Z"
				className="stroke-default dark:stroke-white"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M9 15.7002V20.0002"
				className="stroke-default dark:stroke-white"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M2 11.8999H12"
				className="stroke-default dark:stroke-white"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M5.9502 20H12.0002"
				className="stroke-default dark:stroke-white"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M17.0095 12.7303C17.6004 12.7303 18.0794 12.2512 18.0794 11.6603C18.0794 11.0693 17.6004 10.5903 17.0095 10.5903C16.4185 10.5903 15.9395 11.0693 15.9395 11.6603C15.9395 12.2512 16.4185 12.7303 17.0095 12.7303Z"
				className="stroke-default dark:stroke-white"
				strokeWidth="1.5"
				strokeMiterlimit="10"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M19.9995 7.79022C19.7495 7.76022 19.4595 7.74023 19.1495 7.74023H14.8695C12.7295 7.74023 12.0195 8.45027 12.0195 10.5903V19.1503C12.0195 21.2903 12.7295 22.0002 14.8695 22.0002H19.1495C21.2895 22.0002 21.9995 21.2903 21.9995 19.1503V10.5903C21.9995 8.76027 21.4795 7.98022 19.9995 7.79022ZM17.0096 10.5903C17.5996 10.5903 18.0795 11.0702 18.0795 11.6602C18.0795 12.2502 17.5996 12.7302 17.0096 12.7302C16.4196 12.7302 15.9395 12.2502 15.9395 11.6602C15.9395 11.0702 16.4196 10.5903 17.0096 10.5903ZM17.0096 19.1503C15.8296 19.1503 14.8695 18.1903 14.8695 17.0103C14.8695 16.5203 15.0395 16.0603 15.3195 15.7003C15.7095 15.2003 16.3196 14.8702 17.0096 14.8702C17.5496 14.8702 18.0395 15.0703 18.4095 15.3903C18.8595 15.7903 19.1495 16.3703 19.1495 17.0103C19.1495 18.1903 18.1896 19.1503 17.0096 19.1503Z"
				className="stroke-default dark:stroke-white"
				strokeWidth="1.5"
				strokeMiterlimit="10"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M19.1491 17.0101C19.1491 18.1901 18.1892 19.1501 17.0092 19.1501C15.8292 19.1501 14.8691 18.1901 14.8691 17.0101C14.8691 16.5201 15.0392 16.0601 15.3192 15.7001C15.7092 15.2001 16.3192 14.8701 17.0092 14.8701C17.5492 14.8701 18.0391 15.0701 18.4091 15.3901C18.8591 15.7901 19.1491 16.3701 19.1491 17.0101Z"
				className="stroke-default dark:stroke-white"
				strokeWidth="1.5"
				strokeMiterlimit="10"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M17.0095 12.7303C17.6004 12.7303 18.0794 12.2512 18.0794 11.6603C18.0794 11.0693 17.6004 10.5903 17.0095 10.5903C16.4185 10.5903 15.9395 11.0693 15.9395 11.6603C15.9395 12.2512 16.4185 12.7303 17.0095 12.7303Z"
				className="stroke-default dark:stroke-white"
				strokeWidth="1.5"
				strokeMiterlimit="10"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

// ============================= Timer Stop ===============================//

export function TimerStopIcon({ className }: IClassName) {
	return (
		<svg
			width="28"
			height="28"
			viewBox="0 0 28 28"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
		>
			<path
				d="M23.7533 9.07667L5.29667 20.16C4.585 20.5917 3.62833 20.16 3.535 19.3317C3.51167 19.11 3.5 18.8883 3.5 18.6667V9.33333C3.5 5.83333 5.83333 3.5 9.33333 3.5H18.6667C22.1667 3.5 23.6017 5.29667 24.2783 7.75833C24.4183 8.27167 24.1967 8.80833 23.7533 9.07667Z"
				fill="white"
			/>
			<path
				d="M24.4999 12.9383V18.6666C24.4999 22.1666 22.1666 24.4999 18.6666 24.4999H9.33323C8.2599 24.4999 7.2449 24.2083 6.38156 23.6949C5.6349 23.2633 5.68156 22.1666 6.41656 21.7233L22.7266 11.9349C23.5082 11.4683 24.4999 12.0283 24.4999 12.9383Z"
				fill="white"
			/>
		</svg>
	);
}

// ============================= Timer Play ===============================//

export function TimerPlayIcon({ className }: IClassName) {
	return (
		<svg
			width="28"
			height="28"
			viewBox="0 0 28 28"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={clsxm('fill-white', className)}
		>
			<path d="M20.4043 11.2L6.53268 19.565C5.71602 20.055 4.66602 19.4717 4.66602 18.515V9.18168C4.66602 5.11002 9.06435 2.56668 12.5993 4.59668L17.9544 7.67668L20.3927 9.07668C21.1977 9.55502 21.2094 10.7217 20.4043 11.2Z" />
			<path d="M21.1056 18.0367L16.3806 20.7667L11.6673 23.485C9.97559 24.4533 8.06226 24.255 6.67393 23.275C5.99726 22.8083 6.07893 21.77 6.79059 21.35L21.6189 12.46C22.3189 12.04 23.2406 12.4367 23.3689 13.2417C23.6606 15.05 22.9139 16.9983 21.1056 18.0367Z" />
		</svg>
	);
}

// ============================= User Online Icon ===============================//

export function UserOnlineIcon({ className }: IClassName) {
	return (
		<svg
			width="10"
			height="11"
			viewBox="0 0 10 11"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
		>
			<path
				d="M8.14048 3.53982C8.26401 3.73335 8.19813 3.99276 8.00048 4.11217L7.75754 4.25629L2.3593 7.49276C2.16166 7.61217 1.90224 7.54629 1.78695 7.34452C1.37519 6.62805 1.18989 5.75511 1.35048 4.84099C1.62224 3.28864 2.89871 2.05335 4.4593 1.83099C6.00342 1.61276 7.3993 2.35394 8.14048 3.53982Z"
				fill="#307D50"
			/>
			<path
				d="M8.65933 6.08872C8.37933 7.83872 6.83109 9.17695 5.05639 9.20577C4.27403 9.21813 3.54933 8.99166 2.94815 8.58401C2.69286 8.41519 2.70109 8.03636 2.96462 7.87989L8.07462 4.87813C8.34227 4.72166 8.67168 4.90283 8.69639 5.21166C8.71698 5.49989 8.70462 5.79225 8.65933 6.08872Z"
				fill="#307D50"
			/>
		</svg>
	);
}
// ============================= User Online & Tracking Time Icon ===============================//

export function UserOnlineAndTrackingTimeIcon({ className }: IClassName) {
	return (
		<svg
			width="10"
			height="10"
			viewBox="0 0 10 10"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
		>
			<path
				d="M7.26027 4.01184L2.36439 6.96419C2.07615 7.13713 1.70557 6.93125 1.70557 6.5936V3.29948C1.70557 1.86242 3.25792 0.964776 4.50557 1.68125L6.39557 2.76831L7.25615 3.26242C7.54027 3.43125 7.54439 3.84301 7.26027 4.01184Z"
				fill="#307D50"
			/>
			<path
				d="M7.50763 6.42462L5.83998 7.38815L4.17645 8.34756C3.57939 8.68932 2.9041 8.61932 2.4141 8.27344C2.17527 8.10874 2.2041 7.74227 2.45527 7.59403L7.6888 4.45638C7.93586 4.30815 8.26116 4.44815 8.30645 4.73227C8.40939 5.3705 8.14586 6.05815 7.50763 6.42462Z"
				fill="#307D50"
			/>
		</svg>
	);
}

//  ============================= Logout Icons ============================= //


export function LogoutIcon2({ className }: IClassName) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			className={clsxm(className)}
		>
			<path
				d="M17.4414 14.62L20.0014 12.06L17.4414 9.5"
				className={clsxm(className)}
				strokeWidth="1.5"
				strokeMiterlimit="10"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M9.76172 12.0601H19.9317"
				className={clsxm(className)}
				strokeWidth="1.5"
				strokeMiterlimit="10"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M11.7617 20C7.34172 20 3.76172 17 3.76172 12C3.76172 7 7.34172 4 11.7617 4"
				className={clsxm(className)}
				strokeWidth="1.5"
				strokeMiterlimit="10"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

//  ============================= Tick Circle Icon ============================= //
// common -> tick
export function TickCircleIcon({ className }: IClassName) {
	return (
		<svg
			width="16"
			height="16"
			viewBox="0 0 16 16"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={clsxm('stroke-[#BEBCC8]', className)}
		>
			<path
				d="M7.99992 14.6666C11.6666 14.6666 14.6666 11.6666 14.6666 7.99992C14.6666 4.33325 11.6666 1.33325 7.99992 1.33325C4.33325 1.33325 1.33325 4.33325 1.33325 7.99992C1.33325 11.6666 4.33325 14.6666 7.99992 14.6666Z"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M5.16675 7.99995L7.05341 9.88661L10.8334 6.11328"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}
export function TickCircleIconV2({ className }: IClassName) {
	return (
		<svg
			width="20"
			height="21"
			viewBox="0 0 20 21"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={clsxm('stroke-[#BEBCC8]', className)}
		>
			<path
				d="M10 0.5C4.49 0.5 0 4.99 0 10.5C0 16.01 4.49 20.5 10 20.5C15.51 20.5 20 16.01 20 10.5C20 4.99 15.51 0.5 10 0.5ZM14.78 8.2L9.11 13.87C8.97 14.01 8.78 14.09 8.58 14.09C8.38 14.09 8.19 14.01 8.05 13.87L5.22 11.04C4.93 10.75 4.93 10.27 5.22 9.98C5.51 9.69 5.99 9.69 6.28 9.98L8.58 12.28L13.72 7.14C14.01 6.85 14.49 6.85 14.78 7.14C15.07 7.43 15.07 7.9 14.78 8.2Z"
				className={clsxm('stroke-[#BEBCC8]', className)}
			/>
		</svg>
	);
}

export function TickSaveIcon({ className }: IClassName) {
	return (
		<svg
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={clsxm('stroke-green-600 dark:stroke-green-400', className)}
		>
			<path
				d="M12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22Z"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M7.75 11.9999L10.58 14.8299L16.25 9.16992"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}
export function TickSquareIcon({ className }: IClassName) {
	return (
		<svg
			width="18"
			height="18"
			viewBox="0 0 18 17"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={clsxm(className)}
		>
			<path
				d="M12.4917 0.166748H5.50841C2.47508 0.166748 0.666748 1.97508 0.666748 5.00841V11.9834C0.666748 15.0251 2.47508 16.8334 5.50841 16.8334H12.4834C15.5167 16.8334 17.3251 15.0251 17.3251 11.9917V5.00841C17.3334 1.97508 15.5251 0.166748 12.4917 0.166748ZM12.9834 6.58342L8.25841 11.3084C8.14175 11.4251 7.98341 11.4917 7.81675 11.4917C7.65008 11.4917 7.49175 11.4251 7.37508 11.3084L5.01675 8.95008C4.77508 8.70842 4.77508 8.30841 5.01675 8.06675C5.25841 7.82508 5.65841 7.82508 5.90008 8.06675L7.81675 9.98341L12.1001 5.70008C12.3417 5.45842 12.7417 5.45842 12.9834 5.70008C13.2251 5.94175 13.2251 6.33342 12.9834 6.58342Z"
				stroke="#34AC6B"
				strokeWidth="1.3"
				fill="transparent"
			/>
		</svg>
	);
}
export function TickIcon({ className }: IClassName) {
	return (
		<svg
			width="26"
			height="26"
			viewBox="0 0 24 24"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={clsxm(className, 'dark:stroke-gray-500 stroke-gray-700')}
		>
			<path
				d="M7.75 11.9999L10.58 14.8299L16.25 9.16992"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

//  ============================= Timer Icon ============================= //
// timer
export function TimerIcon({ className }: IClassName) {
	return (
		<svg
			width="18"
			height="18"
			viewBox="0 0 18 18"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={clsxm('stroke-[#292D32]', className)}
		>
			<path
				d="M11.43 1.5H6.57003C3.75003 1.5 3.53253 4.035 5.05503 5.415L12.945 12.585C14.4675 13.965 14.25 16.5 11.43 16.5H6.57003C3.75003 16.5 3.53253 13.965 5.05503 12.585L12.945 5.415C14.4675 4.035 14.25 1.5 11.43 1.5Z"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}
//  ============================= Search Normal Icon ============================= //

export function SearchNormalIcon({ className }: IClassName) {
	return (
		<svg
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={clsxm('stroke-[#282048]', className)}
		>
			<path
				d="M11.5 21C16.7467 21 21 16.7467 21 11.5C21 6.25329 16.7467 2 11.5 2C6.25329 2 2 6.25329 2 11.5C2 16.7467 6.25329 21 11.5 21Z"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path d="M22 22L20 20" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}


//  ============================= Close Circle Icon ============================= //

export function CloseCircleIcon({ className }: IClassName) {
	return (
		<svg
			width="18"
			height="18"
			viewBox="0 0 18 18"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={clsxm('stroke-[#292D32]', className)}
		>
			<path
				d="M9 16.5C13.125 16.5 16.5 13.125 16.5 9C16.5 4.875 13.125 1.5 9 1.5C4.875 1.5 1.5 4.875 1.5 9C1.5 13.125 4.875 16.5 9 16.5Z"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path d="M6.87744 11.1224L11.1224 6.87744" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
			<path d="M11.1224 11.1224L6.87744 6.87744" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}
//  ============================= Close Icon ============================= //

export function CloseIcon({ className }: IClassName) {
	return (
		<svg
			width="20"
			height="20"
			viewBox="0 0 20 20"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={clsxm('stroke-[#7E7991]', className)}
		>
			<path d="M4.16748 4.16675L15.8334 15.8326" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
			<path d="M4.16664 15.8326L15.8325 4.16675" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}
export function CloseAlternateIcon({ className }: IClassName) {
	return (
		<svg
			width="26"
			height="26"
			viewBox="0 0 24 24"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={clsxm('dark:stroke-gray-500 stroke-gray-700', className)}
		>
			<path d="M9.16992 14.8299L14.8299 9.16992" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
			<path d="M14.8299 14.8299L9.16992 9.16992" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

//  ============================= Check Icon ============================= //

export const CheckIcon = ({ className }: IClassName) => (
	<svg xmlns="http://www.w3.org/2000/svg" width={17} height={19} fill="none" viewBox="0 0 14 15">
		<path
			className={clsxm('fill-[#fff]', className)}
			d="M5.571 11 2.246 7.675l.831-.831 2.494 2.493 5.352-5.352.831.832L5.571 11Z"
		/>
	</svg>
);

//  ============================= Edit Icon ============================= //

export function EditIcon({ className }: IClassName) {
	return (
		<svg
			width="20"
			height="20"
			viewBox="0 0 20 20"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={clsxm('stroke-[#292D32] dark:stroke-slate-300', className)}
		>
			<path
				d="M9.1665 1.6665H7.49984C3.33317 1.6665 1.6665 3.33317 1.6665 7.49984V12.4998C1.6665 16.6665 3.33317 18.3332 7.49984 18.3332H12.4998C16.6665 18.3332 18.3332 16.6665 18.3332 12.4998V10.8332"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M13.3666 2.51688L6.7999 9.08354C6.5499 9.33354 6.2999 9.82521 6.2499 10.1835L5.89157 12.6919C5.75823 13.6002 6.3999 14.2335 7.30823 14.1085L9.81657 13.7502C10.1666 13.7002 10.6582 13.4502 10.9166 13.2002L17.4832 6.63354C18.6166 5.50021 19.1499 4.18354 17.4832 2.51688C15.8166 0.850211 14.4999 1.38354 13.3666 2.51688Z"
				strokeWidth="1.5"
				strokeMiterlimit="10"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M12.4248 3.4585C12.9831 5.45016 14.5415 7.0085 16.5415 7.57516"
				strokeWidth="1.5"
				strokeMiterlimit="10"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

//  ============================= Edit2 Icon ============================= //

export function Edit2Icon({ className }: IClassName) {
	return (
		<svg
			width="20"
			height="20"
			viewBox="0 0 20 20"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={clsxm('stroke-[#292D32] dark:stroke-slate-300', className)}
		>
			<path
				d="M8.83958 2.40006L3.36624 8.1934C3.15958 8.4134 2.95958 8.84673 2.91958 9.14673L2.67291 11.3067C2.58624 12.0867 3.14624 12.6201 3.91958 12.4867L6.06624 12.1201C6.36624 12.0667 6.78624 11.8467 6.99291 11.6201L12.4662 5.82673C13.4129 4.82673 13.8396 3.68673 12.3662 2.2934C10.8996 0.913397 9.78624 1.40006 8.83958 2.40006Z"
				strokeWidth="1.5"
				strokeMiterlimit="10"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M7.92676 3.3667C8.21342 5.2067 9.70676 6.61337 11.5601 6.80003"
				strokeWidth="1.5"
				strokeMiterlimit="10"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M2 14.6667H14"
				strokeWidth="1.5"
				strokeMiterlimit="10"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

//  ============================= Edit Icon ============================= //

//  ============================= More Icon ============================= //

export function MoreIcon({ className }: IClassName) {
	return (
		<svg
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={clsxm('stroke-[#282048] dark:stroke-[#CCCCCC]', className)}
		>
			<path
				d="M10 19C10 20.1 10.9 21 12 21C13.1 21 14 20.1 14 19C14 17.9 13.1 17 12 17C10.9 17 10 17.9 10 19Z"
				strokeWidth="1.5"
			/>
			<path
				d="M10 5C10 6.1 10.9 7 12 7C13.1 7 14 6.1 14 5C14 3.9 13.1 3 12 3C10.9 3 10 3.9 10 5Z"
				strokeWidth="1.5"
			/>
			<path
				d="M10 12C10 13.1 10.9 14 12 14C13.1 14 14 13.1 14 12C14 10.9 13.1 10 12 10C10.9 10 10 10.9 10 12Z"
				strokeWidth="1.5"
			/>
		</svg>
	);
}

//  ============================= Pause Icon ============================= //

export function PauseIcon({ className }: IClassName) {
	return (
		<svg
			width="10"
			height="10"
			viewBox="0 0 10 10"
			xmlns="http://www.w3.org/2000/svg"
			className={clsxm('fill-[#B87B1E]', className)}
		>
			<path d="M4.44395 7.92772V2.07242C4.44395 1.51654 4.20924 1.29419 3.6163 1.29419H2.12159C1.52865 1.29419 1.29395 1.51654 1.29395 2.07242V7.92772C1.29395 8.4836 1.52865 8.70595 2.12159 8.70595H3.6163C4.20924 8.70595 4.44395 8.4836 4.44395 7.92772Z" />
			<path d="M8.70566 7.92772V2.07242C8.70566 1.51654 8.47096 1.29419 7.87802 1.29419H6.38331C5.79449 1.29419 5.55566 1.51654 5.55566 2.07242V7.92772C5.55566 8.4836 5.79037 8.70595 6.38331 8.70595H7.87802C8.47096 8.70595 8.70566 8.4836 8.70566 7.92772Z" />
		</svg>
	);
}

//  ============================= Stop Circle Icon ============================= //

export function StopCircleIcon({ className }: IClassName) {
	return (
		<svg
			width="10"
			height="10"
			viewBox="0 0 10 10"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={clsxm('fill-[#E65B5B]', className)}
		>
			<path d="M4.98728 0.882324C2.71433 0.882324 0.869629 2.72703 0.869629 4.99997C0.869629 7.27291 2.71433 9.11762 4.98728 9.11762C7.26022 9.11762 9.10492 7.27291 9.10492 4.99997C9.10492 2.72703 7.26434 0.882324 4.98728 0.882324ZM6.74139 5.50644C6.74139 6.18997 6.18963 6.74174 5.5061 6.74174H4.49316C3.80963 6.74174 3.25786 6.18997 3.25786 5.50644V4.4935C3.25786 3.80997 3.80963 3.25821 4.49316 3.25821H5.5061C6.18963 3.25821 6.74139 3.80997 6.74139 4.4935V5.50644Z" />
		</svg>
	);
}

//
export function NotWorkingIcon({ className }: IClassName) {
	return (
		<svg
			aria-hidden="true"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
			className={clsxm('stroke-[#282048]', className)}
		>
			<path
				d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
				strokeLinecap="round"
				strokeLinejoin="round"
			></path>
		</svg>
	);
}

export function OnlineIcon({ className }: IClassName) {
	return (
		<svg
			aria-hidden="true"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
			className={clsxm('stroke-[#282048]', className)}
		>
			<path
				d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
				strokeLinecap="round"
				strokeLinejoin="round"
			></path>
		</svg>
	);
}

//  ============================= Refresh Icon ============================= //

export function RefreshIcon({ className }: IClassName) {
	return (
		<svg
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={clsxm('stroke-[#7E7991]', className)}
		>
			<path
				d="M14.55 21.67C18.84 20.54 22 16.64 22 12C22 6.48 17.56 2 12 2C5.33 2 2 7.56 2 7.56M2 7.56V3M2 7.56H4.01H6.44"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M2 12C2 17.52 6.48 22 12 22"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeDasharray="3 3"
			/>
		</svg>
	);
}

// don't change
export const MenuIcon = ({ className }: IClassName) => (
	<svg width={24} height={24} fill="none" xmlns="http://www.w3.org/2000/svg">
		<path
			d="M5 10.5c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2ZM19 10.5c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2ZM12 10.5c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2Z"
			className={className}
			strokeWidth={1.5}
		/>
	</svg>
);
