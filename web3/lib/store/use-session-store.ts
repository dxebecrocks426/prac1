import { create } from "zustand";
import { persist } from "zustand/middleware";

interface EphemeralSession {
  id: string;
  parentWallet: string;
  ephemeralWallet: string;
  vaultPda: string;
  sessionStart: number;
  sessionExpiry: number;
  isActive: boolean;
}

interface SessionStore {
  currentSession: EphemeralSession | null;
  createSession: (
    parentWallet: string,
    ephemeralWallet: string,
    vaultPda: string,
    durationSeconds: number
  ) => void;
  endSession: () => void;
  isSessionActive: () => boolean;
  getTimeRemaining: () => number | null; // seconds remaining
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      currentSession: null,

      createSession: (
        parentWallet,
        ephemeralWallet,
        vaultPda,
        durationSeconds
      ) => {
        const now = Date.now();
        const session: EphemeralSession = {
          id: `session-${now}`,
          parentWallet,
          ephemeralWallet,
          vaultPda,
          sessionStart: now,
          sessionExpiry: now + durationSeconds * 1000,
          isActive: true,
        };
        set({ currentSession: session });
      },

      endSession: () => {
        const session = get().currentSession;
        if (session) {
          set({
            currentSession: {
              ...session,
              isActive: false,
            },
          });
        }
      },

      isSessionActive: () => {
        const session = get().currentSession;
        if (!session || !session.isActive) return false;
        return Date.now() < session.sessionExpiry;
      },

      getTimeRemaining: () => {
        const session = get().currentSession;
        if (!session || !session.isActive) return null;
        const remaining = session.sessionExpiry - Date.now();
        return remaining > 0 ? Math.floor(remaining / 1000) : 0;
      },
    }),
    {
      name: "session-storage",
    }
  )
);


