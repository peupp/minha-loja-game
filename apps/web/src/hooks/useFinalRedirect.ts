import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { SessionState } from "@minha-loja/shared-types";

export function useFinalRedirect(sessionId: string | null, session: SessionState | null) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!sessionId || session?.phase !== "FINAL" || location.pathname === "/telao") return;
    navigate(`/telao?session=${sessionId}`, { replace: true });
  }, [location.pathname, navigate, session?.phase, sessionId]);
}
