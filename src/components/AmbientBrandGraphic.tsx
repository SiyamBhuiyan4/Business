import React from 'react';
import { Sprout } from 'lucide-react';

export default function AmbientBrandGraphic({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute -z-10 ${className}`}>
      <Sprout className="ambient-sprout h-[420px] w-[420px] text-[#C88A58]" strokeWidth={0.7} />
    </div>
  );
}
