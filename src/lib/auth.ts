import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { prisma } from './prisma';

function getJwtSecret(): Uint8Array {
  const jwtSecret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'local-development-only-secret-change-me');
  if (!jwtSecret) throw new Error('JWT_SECRET must be set in production');
  return new TextEncoder().encode(jwtSecret);
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  name: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getJwtSecret());
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const verified = await jwtVerify(token, getJwtSecret());
    return verified.payload as unknown as JWTPayload;
  } catch (error) {
    return null;
  }
}

export async function getSessionUser() {
  const cookieStore = cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      businessAccess: {
        select: {
          businessId: true,
        },
      },
      permissions: {
        select: {
          businessId: true,
          permissionKey: true,
          enabled: true,
        },
      },
    },
  });

  return user;
}

export async function checkUserBusinessPermission(
  userId: string,
  businessId: string,
  requiredPermission?: string
): Promise<{ allowed: boolean; isSuperAdmin: boolean; permissions: Record<string, boolean> }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      businessAccess: true,
      permissions: {
        where: { businessId },
      },
    },
  });

  if (!user) {
    return { allowed: false, isSuperAdmin: false, permissions: {} };
  }

  if (user.role === 'SUPER_ADMIN') {
    // Super admin has full permissions
    const allPerms: Record<string, boolean> = {
      'orders:view': true,
      'orders:manage': true,
      'orders:status': true,
      'sales:view': true,
      'pdf:export': true,
      'products:manage': true,
      'admins:manage': true,
    };
    return { allowed: true, isSuperAdmin: true, permissions: allPerms };
  }

  // Admin role check
  const hasAccess = user.businessAccess.some((ba) => ba.businessId === businessId);
  if (!hasAccess) {
    return { allowed: false, isSuperAdmin: false, permissions: {} };
  }

  const permissionsMap: Record<string, boolean> = {};
  user.permissions.forEach((p) => {
    permissionsMap[p.permissionKey] = p.enabled;
  });

  if (requiredPermission && permissionsMap[requiredPermission] !== true) {
    return { allowed: false, isSuperAdmin: false, permissions: permissionsMap };
  }

  return { allowed: true, isSuperAdmin: false, permissions: permissionsMap };
}
