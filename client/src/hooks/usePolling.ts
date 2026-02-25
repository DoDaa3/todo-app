import { useEffect, useRef } from "react";
import { getSocket } from "../lib/socket";

/**
 * Polls a callback at the given interval when Socket.io is NOT connected.
 * When the socket is connected, polling stops (socket events handle updates).
 * This makes the app feel live on deployments where WebSockets are unavailable (e.g. Vercel).
 */
export function usePolling(
  callback: () => void,
  intervalMs: number,
  enabled = true
) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    const socket = getSocket();

    function shouldPoll() {
      return !socket.connected;
    }

    // Do an immediate poll on mount if socket isn't connected
    if (shouldPoll()) {
      savedCallback.current();
    }

    const id = setInterval(() => {
      if (shouldPoll()) {
        savedCallback.current();
      }
    }, intervalMs);

    return () => clearInterval(id);
  }, [intervalMs, enabled]);
}
