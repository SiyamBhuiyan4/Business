'use client';

import { useRouter } from 'next/navigation';
import { ShieldCheck, UserCog } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';
import PressableButton from '@/components/motion/PressableButton';

export default function RootPage() {
  const router = useRouter();

  return (
    <AuthLayout
      as="div"
      eyebrow="Rise"
      title="Business Dashboard"
      subtitle="Sign in to access your assigned business workspace, or the full control panel."
      accent="teal"
    >
      <div className="space-y-3 pt-2">
        <PressableButton
          onClick={() => router.push('/admin/login')}
          className="glass-button flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-xs font-extrabold"
        >
          <UserCog className="h-4 w-4" />
          Admin Sign In
        </PressableButton>

        <PressableButton
          onClick={() => router.push('/super-admin/login')}
          className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-xs font-extrabold text-white"
          style={{
            background: 'linear-gradient(135deg, var(--copper), var(--copper-deep))',
            boxShadow: '0 10px 25px -5px rgba(166,99,60,.4)',
          }}
        >
          <ShieldCheck className="h-4 w-4" />
          Super Admin Sign In
        </PressableButton>
      </div>
    </AuthLayout>
  );
}
