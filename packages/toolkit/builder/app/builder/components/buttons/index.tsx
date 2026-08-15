import React from 'react';
import { Button as  ShadcnBtn } from '@/components/ui/button';
export const Button = ({ size, variant, width, height, color, text, ...props }: any) => {
    return (
        <ShadcnBtn
            style={{ height: height + 'px', width: width + 'px' }}
            variant={variant}
            {...props}
        >
            {text}
        </ShadcnBtn>
    );
};
