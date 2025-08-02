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

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
  company: {
    id: number;
    name: string;
    ICE: string;
    identifiantFiscal?: string;
    address: string;
  };
}