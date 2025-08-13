import { useEffect } from "react";
import { toast } from 'react-hot-toast';

export function useTokenRefresh(setToken: (token: string | null) => void, setCompany: (company: any) => void, t: any) {
  useEffect(() => {
    const handleTokenRefresh = (event: CustomEvent) => {
      const newToken = event.detail?.token;
      if (newToken) {
        setToken(newToken);
        toast.success(t('auth.tokenRefreshed'));
      }
    };

    const handleTokenRefreshFailed = () => {
      setToken(null);
      setCompany(null);
      toast.error(t('auth.tokenRefreshFailed'));
    };

    window.addEventListener('tokenRefreshed', handleTokenRefresh as EventListener);
    window.addEventListener('tokenRefreshFailed', handleTokenRefreshFailed);

    return () => {
      window.removeEventListener('tokenRefreshed', handleTokenRefresh as EventListener);
      window.removeEventListener('tokenRefreshFailed', handleTokenRefreshFailed);
    };
  }, [setToken, setCompany, t]);
}
