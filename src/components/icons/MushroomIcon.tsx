import React from 'react';

interface MushroomIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

/** A simple line-style mushroom glyph, drawn to match the lucide-react icon set used elsewhere in the app. */
const MushroomIcon = React.forwardRef<SVGSVGElement, MushroomIconProps>(
  ({ color = 'currentColor', size = 24, strokeWidth = 2, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4 13a8 8 0 0 1 16 0z" />
      <path d="M9 13v5a3 3 0 0 0 6 0v-5" />
    </svg>
  )
);
MushroomIcon.displayName = 'MushroomIcon';

export default MushroomIcon;
