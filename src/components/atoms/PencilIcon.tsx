import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface PencilIconProps {
    size?: number;
    color?: string;
}

export default function PencilIcon({ size = 16, color = '#000' }: PencilIconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Path
                d="M13.26 3.6l-8.21 8.69c-.31.33-.61.98-.67 1.43l-.37 3.24c-.13 1.17.71 1.97 1.87 1.77l3.22-.55c.45-.08 1.08-.4 1.39-.72l8.21-8.69c1.42-1.5 2.06-3.21-.15-5.3-2.2-2.07-3.87-1.37-5.29.13Z"
                stroke={color}
                strokeWidth={1.5}
                strokeMiterlimit={10}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <Path
                d="M11.89 5.05a6.126 6.126 0 0 0 5.45 5.15M3 22h18"
                stroke={color}
                strokeWidth={1.5}
                strokeMiterlimit={10}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </Svg>
    );
}
