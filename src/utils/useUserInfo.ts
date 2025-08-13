import { useMemo } from "react";
import { decodeJWT } from "./jwt";
import { tokenManager } from "./tokenManager";

export function useUserInfo(token: string | null) {
  const decoded = useMemo(() => token ? decodeJWT(token) : null, [token]);
  const userEmail = useMemo(() => decoded?.email || '', [decoded]);
  const userRole = useMemo(() => decoded?.role || tokenManager.getUserRole(), [decoded]);
  return { decoded, userEmail, userRole };
}
