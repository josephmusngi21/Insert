import { functions } from "@/screens/firebaseAuthLoginRegister/firebase/config";
import { httpsCallable } from "firebase/functions";

const deleteAccountCallable = httpsCallable<void, { deleted: boolean }>(
  functions,
  "deleteAccount"
);

export async function requestAccountDeletion(): Promise<void> {
  const result = await deleteAccountCallable();
  if (!result.data.deleted) {
    throw new Error("Account deletion did not complete.");
  }
}
