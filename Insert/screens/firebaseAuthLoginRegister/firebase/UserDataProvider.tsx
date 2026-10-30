import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { onSnapshot, type DocumentData } from "firebase/firestore";
import { auth } from "./config";
import { friendsCol, outgoingFriendRequestsCol, pantryCol } from "./userDataService";

export type RawDoc = { id: string; data: DocumentData };

type UserData = {
  pantryDocs: RawDoc[];
  friendIds: Set<string>;
  outgoingIds: Set<string>;
};

const EMPTY: UserData = { pantryDocs: [], friendIds: new Set(), outgoingIds: new Set() };

const UserDataContext = createContext<UserData>(EMPTY);

// One listener per collection for the whole app; screens read from context instead of subscribing.
export function UserDataProvider({ children }: { children: ReactNode }) {
  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid ?? null);
  const [pantryDocs, setPantryDocs] = useState<RawDoc[]>([]);
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  const [outgoingIds, setOutgoingIds] = useState<Set<string>>(new Set());

  useEffect(() => onAuthStateChanged(auth, (user) => setUid(user?.uid ?? null)), []);

  useEffect(() => {
    if (!uid) {
      setPantryDocs([]);
      setFriendIds(new Set());
      setOutgoingIds(new Set());
      return;
    }

    const unsubPantry = onSnapshot(
      pantryCol(uid),
      (snap) => setPantryDocs(snap.docs.map((d) => ({ id: d.id, data: d.data() }))),
      (error) => console.error("Error loading pantry:", error)
    );
    const unsubFriends = onSnapshot(
      friendsCol(uid),
      (snap) => setFriendIds(new Set(snap.docs.map((d) => d.id))),
      (error) => console.error("Error loading friends:", error)
    );
    const unsubOutgoing = onSnapshot(
      outgoingFriendRequestsCol(uid),
      (snap) => setOutgoingIds(new Set(snap.docs.map((d) => d.id))),
      (error) => console.error("Error loading outgoing requests:", error)
    );

    return () => {
      unsubPantry();
      unsubFriends();
      unsubOutgoing();
    };
  }, [uid]);

  const value = useMemo(() => ({ pantryDocs, friendIds, outgoingIds }), [pantryDocs, friendIds, outgoingIds]);

  return <UserDataContext.Provider value={value}>{children}</UserDataContext.Provider>;
}

export const useUserData = () => useContext(UserDataContext);
