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
  taxeProfessionnelle: string;
  address: string;
  email: string;
  password: string;
  confirmPassword: string;
  verificationDocument: File | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export enum VerificationStatus {
  PendingVerification = 0,
  NeedsCorrection = 1,
  Verified = 2
}

export interface LoginData {
  token: string;
  companyDetails: {
    id: string;
    name: string;
    ice: string;
    address: string;
    identifiantFiscal: string;
    createdAt: string;
    verificationStatus: VerificationStatus;
    verificationRejectionReason: string | null;
    taxeProfessionnelle: string;
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
    taxeProfessionnelle: string;
    address: string;
    verificationDocument: string;
  };
}