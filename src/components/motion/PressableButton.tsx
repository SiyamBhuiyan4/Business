'use client';

import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { springSnappy } from '@/lib/motion';

type PressableButtonProps = HTMLMotionProps<'button'>;

const PressableButton = React.forwardRef<HTMLButtonElement, PressableButtonProps>(
  ({ children, ...props }, ref) => (
    <motion.button
      ref={ref}
      whileTap={{ scale: 0.97 }}
      whileHover={{ y: -2 }}
      transition={springSnappy}
      {...props}
    >
      {children}
    </motion.button>
  )
);
PressableButton.displayName = 'PressableButton';

export default PressableButton;
