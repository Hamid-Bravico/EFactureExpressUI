export interface User {
  id: string;
  email: string;
  roles: string[];
}

export interface NewUser {
  email: string;
  password: string;
  role: 'Clerk' | 'Manager';
}

export interface UpdateUser {
  email: string;
  role: 'Admin' | 'Manager' | 'Clerk';
  password?: string;
}