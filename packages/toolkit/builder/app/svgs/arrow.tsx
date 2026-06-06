const Arrow= ({ size = 24, ...props }: { size: number; className?: string }) => {
    return (<svg
        {...props}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg" >
        <title>ChevronDownMedium</title>
        <rect id="ToDelete" fill="#ff13dc" opacity="0" />
        <path 
        fill="#FD1414"
        fillOpacity="0.75"
        d="M9.99,1.01A.9999.9999,0,0,0,8.28266.30327L5,3.58594,1.71734.30327A.9999.9999,0,1,0,.30327,1.71734L4.29266,5.69673a.99965.99965,0,0,0,1.41468,0L9.69673,1.71734A.99669.99669,0,0,0,9.99,1.01Z" />
    </svg>
    );
};

export { Arrow };
