const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { test } = require("node:test");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const { deleteAccount } = require("../index");

const db = getFirestore();
const auth = getAuth();
const bucket = getStorage().bucket();
const alternateBucketName = bucket.name.endsWith(".firebasestorage.app")
  ? bucket.name.replace(/\.firebasestorage\.app$/, ".appspot.com")
  : bucket.name.replace(/\.appspot\.com$/, ".firebasestorage.app");
const alternateBucket = getStorage().bucket(alternateBucketName);

test("callable removes owned and cross-account data, Storage objects, and is retry-safe", async () => {
  const uid = `delete-${randomUUID()}`;
  const friendUid = `friend-${randomUUID()}`;
  const recipientUid = `recipient-${randomUUID()}`;
  const senderUid = `sender-${randomUUID()}`;
  const userRef = db.collection("users").doc(uid);
  const ownPostId = `own-${randomUUID()}`;
  const otherPostId = `other-${randomUUID()}`;

  await auth.createUser({ uid, email: `${uid}@example.test` });
  await userRef.set({ displayName: "Deleted User" });
  await userRef.collection("pantry").doc("one").set({ name: "Rice" });
  await userRef.collection("friends").doc(friendUid).set({ friendUserId: friendUid });
  await db.collection("users").doc(friendUid).collection("friends").doc(uid)
    .set({ friendUserId: uid });

  await db.collection("users").doc(uid).collection("friendRequests").doc(senderUid)
    .set({ fromUserId: senderUid, status: "pending" });
  await db.collection("users").doc(recipientUid).collection("friendRequests").doc(uid)
    .set({ fromUserId: uid, status: "pending" });
  await userRef.collection("outgoingFriendRequests").doc(recipientUid)
    .set({ toUserId: recipientUid, status: "pending" });
  await db.collection("users").doc(senderUid).collection("outgoingFriendRequests").doc(uid)
    .set({ toUserId: uid, status: "pending" });

  await userRef.collection("recipeShares").doc("received").set({
    fromUserId: senderUid,
    toUserId: uid,
  });
  await db.collection("users").doc(recipientUid).collection("recipeShares").doc("sent")
    .set({ fromUserId: uid, toUserId: recipientUid });
  await db.collection("users").doc(recipientUid).collection("recipeShares").doc("received")
    .set({ fromUserId: senderUid, toUserId: uid });

  await db.collection("users").doc(recipientUid).collection("notifications").doc("attributed")
    .set({ actorUserId: uid, type: "recipe_saved" });
  await db.collection("users").doc(recipientUid).collection("notifications").doc("unrelated")
    .set({ actorUserId: friendUid, type: "recipe_saved" });

  await db.collection("publicRecipes").doc(ownPostId).set({ ownerId: uid });
  await db.collection("socialPosts").doc(ownPostId).set({ userId: uid, likes: [] });
  await db.collection("socialPosts").doc(ownPostId).collection("comments").doc("other")
    .set({ userId: friendUid, text: "Removed with authored post" });
  await db.collection("socialPosts").doc(otherPostId).set({
    userId: friendUid,
    likes: [uid, friendUid],
  });
  await db.collection("socialPosts").doc(otherPostId).collection("comments").doc("authored")
    .set({ userId: uid, text: "Delete this" });
  await db.collection("socialPosts").doc(otherPostId).collection("comments").doc("unrelated")
    .set({ userId: friendUid, text: "Keep this" });

  const ownedRecipeFiles = Array.from({ length: 201 }, (_, index) =>
    bucket.file(`recipePhotos/${uid}/${index}.jpg`).save("image")
  );
  await Promise.all([
    ...ownedRecipeFiles,
    bucket.file(`social/${uid}/step.jpg`).save("image"),
    alternateBucket.file(`recipePhotos/${uid}/legacy.jpg`).save("image"),
    bucket.file(`recipePhotos/${uid}4/keep.jpg`).save("image"),
    bucket.file(`social/${uid}4/keep.jpg`).save("image"),
    alternateBucket.file(`social/${uid}4/keep.jpg`).save("image"),
  ]);

  const request = {
    auth: { uid, token: { auth_time: Math.floor(Date.now() / 1000) } },
    data: undefined,
  };
  assert.deepEqual(await deleteAccount.run(request), { deleted: true });

  assert.equal((await userRef.get()).exists, false);
  assert.equal((await userRef.collection("pantry").doc("one").get()).exists, false);
  assert.equal((await db.collection("publicRecipes").doc(ownPostId).get()).exists, false);
  assert.equal((await db.collection("socialPosts").doc(ownPostId).get()).exists, false);
  const otherPost = await db.collection("socialPosts").doc(otherPostId).get();
  assert.deepEqual(otherPost.get("likes"), [friendUid]);
  assert.equal(
    (await db.collection("socialPosts").doc(otherPostId).collection("comments").doc("authored").get()).exists,
    false
  );
  assert.equal(
    (await db.collection("socialPosts").doc(otherPostId).collection("comments").doc("unrelated").get()).exists,
    true
  );

  for (const [collection, documentId] of [
    ["friends", uid],
    ["friendRequests", uid],
    ["outgoingFriendRequests", uid],
    ["recipeShares", "sent"],
    ["recipeShares", "received"],
    ["notifications", "attributed"],
  ]) {
    const owner = collection === "friends"
      ? friendUid
      : collection === "outgoingFriendRequests"
        ? senderUid
        : recipientUid;
    assert.equal(
      (await db.collection("users").doc(owner).collection(collection).doc(documentId).get()).exists,
      false,
      `${collection}/${documentId} should be removed`
    );
  }
  assert.equal(
    (await db.collection("users").doc(recipientUid).collection("notifications").doc("unrelated").get()).exists,
    true
  );

  for (const prefix of [`recipePhotos/${uid}/`, `social/${uid}/`]) {
    const [remaining] = await bucket.getFiles({ prefix });
    assert.equal(remaining.length, 0, `${prefix} should be empty`);
  }
  const [legacyRemaining] = await alternateBucket.getFiles({
    prefix: `recipePhotos/${uid}/`,
  });
  assert.equal(legacyRemaining.length, 0, "legacy bucket user prefix should be empty");
  for (const prefix of [`recipePhotos/${uid}4/`, `social/${uid}4/`]) {
    const [preserved] = await bucket.getFiles({ prefix });
    assert.equal(preserved.length, 1, `${prefix} should be preserved`);
  }
  const [legacyPreserved] = await alternateBucket.getFiles({
    prefix: `social/${uid}4/`,
  });
  assert.equal(legacyPreserved.length, 1, "legacy bucket sibling UID prefix should be preserved");

  await assert.rejects(auth.getUser(uid), { code: "auth/user-not-found" });
  assert.equal((await db.collection("accountDeletionRequests").doc(uid).get()).get("status"), "completed");
  assert.deepEqual(await deleteAccount.run(request), { deleted: true });
  assert.equal((await db.collection("users").doc(friendUid).collection("friends").doc(uid).get()).exists, false);
});
