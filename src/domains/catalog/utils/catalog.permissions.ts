import { UserRole } from '../../../utils/shared.permissions';

export const CATALOG_TYPE = {
  PRODUCT: 'Product',
  SERVICE: 'Service'
} as const;

export const canModifyCatalog = (userRole: UserRole): boolean => {
  switch (userRole) {
    case 'Clerk':
      return false;
    case 'Manager':
    case 'Admin':
      return true;
    default:
      return false;
  }
};

export const canDeleteCatalog = (userRole: UserRole): boolean => canModifyCatalog(userRole);

export const canChangeCatalogStatus = (userRole: UserRole): boolean => {
  switch (userRole) {
    case 'Clerk':
      return false;
    case 'Manager': 
    case 'Admin':
      return true;
    default:
      return false;
  }
};

export const canSelectCatalogForBulkOperation = (): boolean => true;

export const getCatalogActionPermissions = (userRole: UserRole) => {
  return {
    canEdit: canModifyCatalog(userRole),
    canDelete: canDeleteCatalog(userRole)
  };
};