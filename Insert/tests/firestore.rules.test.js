// Run with: npm run test:rules (needs Java for the Firestore emulator). Dev only; not part of the app bundle.
const { test, before, after, beforeEach } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require("@firebase/rules-unit-testing");
const { doc, getDoc, setDoc, updateDoc, deleteDoc, deleteField, getDocs, collection } = require("firebase/firestore");

const ALICE = "alice";
const BOB = "bob";
let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-insert",
    firestore: { rules: fs.readFileSync(path.join(__dirname, "..", "firestore.rules"), "utf8") },
  });
});

after(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
});

const as = (uid) => env.authenticatedContext(uid).firestore();
const anon = () => env.unauthenticatedContext().firestore();
const seed = (fn) => env.withSecurityRulesDisabled(async (ctx) => fn(ctx.firestore()));

test("owner can read and write regular settings and pantry", async () => {
  const db = as(ALICE);
  await assertSucceeds(setDoc(doc(db, "users", ALICE, "settings", "preferences"), { preferredWeightUnit: "g" }));
  await assertSucceeds(getDoc(doc(db, "users", ALICE, "settings", "preferences")));
  await assertSucceeds(setDoc(doc(db, "users", ALICE, "pantry", "p1"), { name: "Rice" }));
  await assertSucceeds(getDocs(collection(db, "users", ALICE, "settings")));
});

test("other users and anonymous cannot read owner subcollections", async () => {
  await seed((db) => setDoc(doc(db, "users", ALICE, "pantry", "p1"), { name: "Rice" }));
  await assertFails(getDoc(doc(as(BOB), "users", ALICE, "pantry", "p1")));
  await assertFails(getDoc(doc(anon(), "users", ALICE, "pantry", "p1")));
  await assertFails(setDoc(doc(as(BOB), "users", ALICE, "settings", "preferences"), { x: 1 }));
});

test("adminQuickSwitch cannot be created or updated by anyone, including the owner", async () => {
  await assertFails(setDoc(doc(as(ALICE), "users", ALICE, "settings", "adminQuickSwitch"), { email: "a@b.co", password: "x" }));
  await seed((db) => setDoc(doc(db, "users", ALICE, "settings", "adminQuickSwitch"), { email: "a@b.co" }));
  await assertFails(updateDoc(doc(as(ALICE), "users", ALICE, "settings", "adminQuickSwitch"), { password: "x" }));
  await assertFails(getDoc(doc(as(BOB), "users", ALICE, "settings", "adminQuickSwitch")));
});

test("owner can still read and delete a legacy adminQuickSwitch doc (account deletion path)", async () => {
  await seed((db) => setDoc(doc(db, "users", ALICE, "settings", "adminQuickSwitch"), { email: "a@b.co" }));
  await assertSucceeds(getDoc(doc(as(ALICE), "users", ALICE, "settings", "adminQuickSwitch")));
  await assertSucceeds(deleteDoc(doc(as(ALICE), "users", ALICE, "settings", "adminQuickSwitch")));
});

test("isAdmin cannot be set on create or changed on update", async () => {
  await assertFails(setDoc(doc(as(ALICE), "users", ALICE), { displayName: "A", isAdmin: true }));
  await assertSucceeds(setDoc(doc(as(ALICE), "users", ALICE), { displayName: "A" }));
  await assertFails(updateDoc(doc(as(ALICE), "users", ALICE), { isAdmin: true }));
  await assertFails(setDoc(doc(as(ALICE), "users", ALICE), { isAdmin: true }, { merge: true }));
});

test("profile with a legacy isAdmin value can still be updated, and the flag cannot be changed", async () => {
  await seed((db) => setDoc(doc(db, "users", ALICE), { displayName: "A", isAdmin: true }));
  await assertSucceeds(updateDoc(doc(as(ALICE), "users", ALICE), { displayName: "Alice" }));
  await assertSucceeds(setDoc(doc(as(ALICE), "users", ALICE), { displayName: "Alice 2" }, { merge: true }));
  await assertFails(updateDoc(doc(as(ALICE), "users", ALICE), { isAdmin: false }));
});

test("normal profile update and merge-set work for existing and new profiles", async () => {
  await seed((db) => setDoc(doc(db, "users", ALICE), { displayName: "A" }));
  await assertSucceeds(updateDoc(doc(as(ALICE), "users", ALICE), { displayName: "B" }));
  await assertSucceeds(setDoc(doc(as(ALICE), "users", ALICE), { bio: "hi" }, { merge: true }));
  await assertSucceeds(setDoc(doc(as(BOB), "users", BOB), { displayName: "Bob" }, { merge: true }));
});

test("owner can delete the profile (account deletion)", async () => {
  await seed((db) => setDoc(doc(db, "users", ALICE), { displayName: "A" }));
  await assertSucceeds(deleteDoc(doc(as(ALICE), "users", ALICE)));
});

test("profiles are readable by signed-in users but not writable by others", async () => {
  await seed((db) => setDoc(doc(db, "users", ALICE), { displayName: "A" }));
  await assertSucceeds(getDoc(doc(as(BOB), "users", ALICE)));
  await assertFails(getDoc(doc(anon(), "users", ALICE)));
  await assertFails(setDoc(doc(as(BOB), "users", ALICE), { displayName: "hacked" }));
  await assertFails(deleteDoc(doc(as(BOB), "users", ALICE)));
});

test("friend request: sender can create into recipient inbox, only for themselves", async () => {
  const request = { fromUserId: BOB, status: "pending" };
  await assertSucceeds(setDoc(doc(as(BOB), "users", ALICE, "friendRequests", BOB), request));
  await assertFails(setDoc(doc(as(BOB), "users", ALICE, "friendRequests", "mallory"), request));
  await assertSucceeds(getDoc(doc(as(ALICE), "users", ALICE, "friendRequests", BOB)));
  await assertFails(getDoc(doc(as(BOB), "users", ALICE, "friendRequests", BOB)));
});

test("social posts: signed-in create as self, owner delete only, like updates by others", async () => {
  await assertSucceeds(setDoc(doc(as(ALICE), "socialPosts", "s1"), { userId: ALICE, likes: [] }));
  await assertFails(setDoc(doc(as(BOB), "socialPosts", "s2"), { userId: ALICE }));
  await assertSucceeds(updateDoc(doc(as(BOB), "socialPosts", "s1"), { likes: [BOB] }));
  await assertFails(updateDoc(doc(as(BOB), "socialPosts", "s1"), { userId: BOB }));
  await assertFails(deleteDoc(doc(as(BOB), "socialPosts", "s1")));
  await assertSucceeds(deleteDoc(doc(as(ALICE), "socialPosts", "s1")));
});

test("unknown top-level collections are denied", async () => {
  await assertFails(getDoc(doc(as(ALICE), "somethingElse", "x")));
  await assertFails(setDoc(doc(as(ALICE), "somethingElse", "x"), { a: 1 }));
});

test("deleteField on isAdmin by a client is rejected", async () => {
  await seed((db) => setDoc(doc(db, "users", ALICE), { displayName: "A", isAdmin: true }));
  await assertFails(updateDoc(doc(as(ALICE), "users", ALICE), { isAdmin: deleteField() }));
});
