import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { onSnapshot, type DocumentData } from "firebase/firestore";
import { auth } from "./config";
import { friendsCol, outgoingFriendRequestsCol, pantryCol } from "./userDataService";

export type RawDoc = { id: string; data: DocumentData };

type Key = "pantry" | "friends" | "outgoing";
type Status = "loading" | "loaded" | "error";
type Flags = Record<Key, boolean>;

// loading = !loaded && !errors; empty = loaded && no data; error = errors
type UserData = {
  pantryDocs: RawDoc[];
  friendIds: Set<string>;
  outgoingIds: Set<string>;
  loaded: Flags;
  errors: Flags;
};

const LOADING: Record<Key, Status> = { pantry: "loading", friends: "loading", outgoing: "loading" };
const NO_FLAGS: Flags = { pantry: false, friends: false, outgoing: false };

const EMPTY: UserData = {
  pantryDocs: [],
  friendIds: new Set(),
  outgoingIds: new Set(),
  loaded: NO_FLAGS,
  errors: NO_FLAGS,
};

const UserDataContext = createContext<UserData>(EMPTY);

// One listener per collection for the whole app; screens read from context instead of subscribing.
export function UserDataProvider({ children }: { children: ReactNode }) {
  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid ?? null);
  const [pantryDocs, setPantryDocs] = useState<RawDoc[]>([]);
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  const [outgoingIds, setOutgoingIds] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<Record<Key, Status>>(LOADING);

  // Which user the held data belongs to; mismatched data is never exposed
  const [dataUid, setDataUid] = useState<string | null>(null);

  useEffect(() => onAuthStateChanged(auth, (user) => setUid(user?.uid ?? null)), []);

  useEffect(() => {
    setPantryDocs([]);
    setFriendIds(new Set());
    setOutgoingIds(new Set());
    setStatus(LOADING);
    setDataUid(uid);
    if (!uid) return;

    const mark = (key: Key, next: Status) =>
      setStatus((prev) => (prev[key] === next ? prev : { ...prev, [key]: next }));

    const unsubPantry = onSnapshot(
      pantryCol(uid),
      (snap) => {
        setPantryDocs(snap.docs.map((d) => ({ id: d.id, data: d.data() })));
        mark("pantry", "loaded");
      },
      (error) => {
        console.error("Error loading pantry:", error);
        mark("pantry", "error");
      }
    );
    const unsubFriends = onSnapshot(
      friendsCol(uid),
      (snap) => {
        setFriendIds(new Set(snap.docs.map((d) => d.id)));
        mark("friends", "loaded");
      },
      (error) => {
        console.error("Error loading friends:", error);
        mark("friends", "error");
      }
    );
    const unsubOutgoing = onSnapshot(
      outgoingFriendRequestsCol(uid),
      (snap) => {
        setOutgoingIds(new Set(snap.docs.map((d) => d.id)));
        mark("outgoing", "loaded");
      },
      (error) => {
        console.error("Error loading outgoing requests:", error);
        mark("outgoing", "error");
      }
    );

    return () => {
      unsubPantry();
      unsubFriends();
      unsubOutgoing();
    };
  }, [uid]);

  const value = useMemo<UserData>(() => {
    if (dataUid !== uid) return EMPTY;
    return {
      pantryDocs,
      friendIds,
      outgoingIds,
      loaded: {
        pantry: status.pantry === "loaded",
        friends: status.friends === "loaded",
        outgoing: status.outgoing === "loaded",
      },
      errors: {
        pantry: status.pantry === "error",
        friends: status.friends === "error",
        outgoing: status.outgoing === "error",
      },
    };
  }, [dataUid, uid, pantryDocs, friendIds, outgoingIds, status]);

  return <UserDataContext.Provider value={value}>{children}</UserDataContext.Provider>;
}

export const useUserData = () => useContext(UserDataContext);
