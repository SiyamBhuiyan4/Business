export interface PermissionDefinition {
  key: string;
  label: string;
  description: string;
  defaultForAdmin: boolean;
}

export const PERMISSION_LIST: PermissionDefinition[] = [
  {
    key: 'orders:view',
    label: 'View Orders',
    description: 'Can view pending and historical orders for this business',
    defaultForAdmin: true,
  },
  {
    key: 'orders:manage',
    label: 'Create & Edit Orders',
    description: 'Can create new orders and modify existing order details',
    defaultForAdmin: true,
  },
  {
    key: 'orders:status',
    label: 'Update Order Status',
    description: 'Can mark orders as Delivered, Cancelled, or In-Progress',
    defaultForAdmin: true,
  },
  {
    key: 'sales:view',
    label: 'View Sales Analytics',
    description: 'Can view revenue charts, sales heatmaps, and sales summary totals',
    defaultForAdmin: true,
  },
  {
    key: 'investment:manage',
    label: 'Manage Total Invested',
    description: 'Can edit the total invested amount for this business',
    defaultForAdmin: false,
  },
  {
    key: 'revenue:manage',
    label: 'Manage Admin Revenue',
    description: 'Can edit how much revenue is held by each admin',
    defaultForAdmin: false,
  },
  {
    key: 'pdf:export',
    label: 'Export Delivery PDF',
    description: 'Can download delivery sheet PDFs for orders',
    defaultForAdmin: true,
  },
  {
    key: 'products:manage',
    label: 'Manage Products',
    description: 'Can create, edit, or toggle product availability',
    defaultForAdmin: false,
  },
  {
    key: 'admins:manage',
    label: 'Manage Business Admins',
    description: 'Can manage other admin access and permission profiles for this business',
    defaultForAdmin: false,
  },
];

export function getDefaultPermissions(): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  PERMISSION_LIST.forEach((p) => {
    result[p.key] = p.defaultForAdmin;
  });
  return result;
}
