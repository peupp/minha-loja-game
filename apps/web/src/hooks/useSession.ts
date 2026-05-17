import { useEffect, useState, useCallback } from "react";
import { io } from "socket.io-client";
import type { SessionState } from "@minha-loja/shared-types";
import { fetchSession } from "../api";

export function useSession(sessionId: string | null) {
  const [session, setSession] = useState<SessionState | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!sessionId) return;
    const data = await fetchSession(sessionId);
    setSession(data);
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    refresh();
    const socket = io({ path: "/socket.io" });
    socket.emit("join:session", sessionId);
    socket.on("session:update", (data: SessionState) => {
      setSession(data);
      setLoading(false);
    });
    return () => {
      socket.disconnect();
    };
  }, [sessionId, refresh]);

  return { session, loading, refresh };
}
