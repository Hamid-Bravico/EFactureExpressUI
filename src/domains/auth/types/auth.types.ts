export interface LoginPageProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onToggleLanguage: () => void;
  currentLanguage: string;
}

export interface RegisterPageProps {
  onToggleLanguage: () => void;
  currentLanguage: string;
}

export interface RegisterFormData {
  companyName: string;
  ICE: string;
  identifiantFiscal: string;
  address: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginData {
  token: string;
  companyDetails: {
    id: string;
    name: string;
    ice: string;
    address: string | null;
    identifiantFiscal: string;
    isActive: boolean;
    isVerified: boolean;
  };
}

export interface ApiResponse<T> {
  succeeded: boolean;
  message: string;
  data?: T;
  errors?: string[];
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
  companyDetails: {
    id: number;
    name: string;
    ICE?: string;
    ice?: string;
    identifiantFiscal?: string;
    identifiantfiscal?: string;
    address: string;
  };
}