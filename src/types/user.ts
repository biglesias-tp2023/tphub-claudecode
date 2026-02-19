// ============================================
// USER PROFILE (Perfil del consultor en Supabase)
// ============================================
export type UserRole = 'owner' | 'superadmin' | 'admin' | 'manager' | 'consultant' | 'viewer';

/**
 * Role hierarchy levels - higher number = more permissions
 * Used to determine if a user can manage another user's role
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  owner: 100,
  superadmin: 80,
  admin: 60,
  manager: 40,
  consultant: 20,
  viewer: 10,
};

/**
 * Human-readable role labels
 */
export const ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Owner',
  superadmin: 'Superadmin',
  admin: 'Administrador',
  manager: 'Manager',
  consultant: 'Consultor',
  viewer: 'Visor',
};

/**
 * Role descriptions for UI
 */
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  owner: 'Propietario del sistema. No puede ser eliminado ni cambiado.',
  superadmin: 'Acceso total al sistema. Puede gestionar todos los usuarios excepto el Owner.',
  admin: 'Gestión de compañías asignadas. Puede invitar consultores y managers.',
  manager: 'Acceso a compañías asignadas con permisos de gestión limitados.',
  consultant: 'Acceso a compañías asignadas con todos los dashboards.',
  viewer: 'Acceso de solo lectura a compañías asignadas.',
};

/**
 * Check if a user with myRole can manage (edit/delete) a user with targetRole
 */
export function canManageRole(myRole: UserRole, targetRole: UserRole): boolean {
  // Owner cannot be managed by anyone (including themselves for role changes)
  if (targetRole === 'owner') return false;
  // User needs higher hierarchy to manage another user
  return ROLE_HIERARCHY[myRole] > ROLE_HIERARCHY[targetRole];
}

/**
 * Get roles that a user can invite based on their own role
 */
export function getInvitableRoles(myRole: UserRole): UserRole[] {
  switch (myRole) {
    case 'owner':
    case 'superadmin':
      // Can invite all roles except owner
      return ['superadmin', 'admin', 'manager', 'consultant', 'viewer'];
    case 'admin':
      // Can invite manager, consultant, viewer
      return ['manager', 'consultant', 'viewer'];
    case 'manager':
      // Managers cannot invite users
      return [];
    default:
      return [];
  }
}

/**
 * Profile stored in Supabase profiles table
 */
export interface Profile {
  id: string;                       // UUID, references auth.users
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: UserRole;
  assignedCompanyIds: string[];     // UUID[] of assigned companies
  createdAt: string;
  updatedAt: string;
}

/**
 * User type for frontend use (combines auth and profile data)
 */
export interface User {
  id: string;
  email: string;                    // Debe ser @thinkpaladar.com
  name: string;
  avatarUrl?: string;
  role: UserRole;
  assignedCompanyIds: string[];     // UUIDs de compañías asignadas
  createdAt: string;
  lastLoginAt?: string;
}

/**
 * Database row type for profiles
 */
export interface DbProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  assigned_company_ids: string[];
  created_at: string;
  updated_at: string;
}
