// Shared permission utilities for role-based management

export type UserRole = 'Admin' | 'Manager' | 'Clerk';

// Role hierarchy utility
export const getRoleLevel = (role: UserRole): number => {
  switch (role) {
    case 'Admin': return 3;
    case 'Manager': return 2;
    case 'Clerk': return 1;
    default: return 0;
  }
};

export const hasHigherOrEqualRole = (userRole: UserRole, requiredRole: UserRole): boolean => {
  return getRoleLevel(userRole) >= getRoleLevel(requiredRole);
};

// Global capabilities (Admin and Manager only)
export const canImportCSV = (userRole: UserRole): boolean => {
  return ['Admin', 'Manager'].includes(userRole);
};