const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { FieldValue, getFirestore } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const { logger } = require("firebase-functions");
const { HttpsError, onCall } = require("firebase-functions/v2/https");

initializeApp();

const db = getFirestore();
const REGION = "us-central1";
const PAGE_SIZE = 300;
const STORAGE_PAGE_SIZE = 200;
const STORAGE_PREFIXES = ["recipePhotos", "social"];
const RECENT_AUTH_WINDOW_SECONDS = 5 * 60;
const ACTIVE_REQUEST_LOCK_MILLISECONDS = 15 * 60 * 1000;
const USER_SUBCOLLECTIONS = [
  "pantry",
  "pendingPantry",
  "recipes",
  "shoppingList",
  "mealPlans",
  "nutritionEntries",
  "settings",
  "cookHistory",
  "friends",
  "friendRequests",
  "outgoingFriendRequests",
  "recipeShares",
  "notifications",
];

function assertRecentAuthentication(request) {
  const authTime = request.auth?.token?.auth_time;
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (
    typeof authTime !== "number" ||
    nowSeconds - authTime > RECENT_AUTH_WINDOW_SECONDS ||
    authTime > nowSeconds + 60
  ) {
    throw new HttpsError(
      "failed-precondition",
      "Please reauthenticate before deleting your account."
    );
  }
}

async function deleteCollection(collectionRef) {
  while (true) {
    const snapshot = await collectionRef.limit(PAGE_SIZE).get();
    if (snapshot.empty) return;

    const batch = db.batch();
    snapshot.docs.forEach((document) => batch.delete(document.ref));
    await batch.commit();
  }
}

async function deleteOwnedQuery(collectionRef, field, uid, beforeDelete) {
  while (true) {
    const snapshot = await collectionRef.where(field, "==", uid).limit(PAGE_SIZE).get();
    if (snapshot.empty) return;

    if (beforeDelete) {
      for (const document of snapshot.docs) {
        await beforeDelete(document);
      }
    }

    const batch = db.batch();
    snapshot.docs.forEach((document) => batch.delete(document.ref));
    await batch.commit();
  }
}

async function deleteCollectionGroupByField(collectionGroup, field, uid) {
  while (true) {
    const snapshot = await db.collectionGroup(collectionGroup)
      .where(field, "==", uid)
      .limit(PAGE_SIZE)
      .get();
    if (snapshot.empty) return;

    const batch = db.batch();
    snapshot.docs.forEach((document) => batch.delete(document.ref));
    await batch.commit();
  }
}

async function removeUserLikes(uid) {
  while (true) {
    const snapshot = await db.collection("socialPosts")
      .where("likes", "array-contains", uid)
      .limit(PAGE_SIZE)
      .get();
    if (snapshot.empty) return;

    const batch = db.batch();
    snapshot.docs.forEach((post) => {
      batch.update(post.ref, { likes: FieldValue.arrayRemove(uid) });
    });
    await batch.commit();
  }
}

async function removeReciprocalFriendLinks(uid) {
  const friendsRef = db.collection("users").doc(uid).collection("friends");
  while (true) {
    const snapshot = await friendsRef.limit(Math.floor(PAGE_SIZE / 2)).get();
    if (snapshot.empty) break;

    const batch = db.batch();
    for (const friend of snapshot.docs) {
      batch.delete(friend.ref);
      batch.delete(db.collection("users").doc(friend.id).collection("friends").doc(uid));
    }
    await batch.commit();
  }

  await deleteCollectionGroupByField("friends", "friendUserId", uid);
}

async function deleteCrossAccountFirestoreData(uid) {
  await deleteCollectionGroupByField("comments", "userId", uid);
  await removeUserLikes(uid);
  await deleteCollectionGroupByField("friendRequests", "fromUserId", uid);
  await deleteCollectionGroupByField("outgoingFriendRequests", "toUserId", uid);
  await removeReciprocalFriendLinks(uid);
  await deleteCollectionGroupByField("recipeShares", "fromUserId", uid);
  await deleteCollectionGroupByField("recipeShares", "toUserId", uid);
  await deleteCollectionGroupByField("notifications", "actorUserId", uid);
}

async function deleteStorageObjects(uid) {
  const storage = getStorage();
  const defaultBucket = storage.bucket();
  const bucketNames = new Set([defaultBucket.name]);
  if (defaultBucket.name.endsWith(".firebasestorage.app")) {
    bucketNames.add(defaultBucket.name.replace(/\.firebasestorage\.app$/, ".appspot.com"));
  } else if (defaultBucket.name.endsWith(".appspot.com")) {
    bucketNames.add(defaultBucket.name.replace(/\.appspot\.com$/, ".firebasestorage.app"));
  }

  for (const bucketName of bucketNames) {
    const bucket = storage.bucket(bucketName);
    const [bucketExists] = await bucket.exists();
    if (!bucketExists) continue;

    for (const root of STORAGE_PREFIXES) {
      let pageToken;
      do {
        const options = {
          prefix: `${root}/${uid}/`,
          maxResults: STORAGE_PAGE_SIZE,
          autoPaginate: false,
          ...(pageToken ? { pageToken } : {}),
        };
        const [files, nextQuery] = await bucket.getFiles(options);
        await Promise.all(files.map((file) => file.delete({ ignoreNotFound: true })));
        pageToken = nextQuery?.pageToken;
      } while (pageToken);
    }
  }
}

async function deleteUserFirestoreData(uid) {
  const userRef = db.collection("users").doc(uid);
  for (const subcollection of USER_SUBCOLLECTIONS) {
    await deleteCollection(userRef.collection(subcollection));
  }

  await deleteOwnedQuery(db.collection("publicRecipes"), "ownerId", uid);
  await deleteOwnedQuery(
    db.collection("socialPosts"),
    "userId",
    uid,
    (post) => deleteCollection(post.ref.collection("comments"))
  );
  await userRef.delete();
}

exports.deleteAccount = onCall(
  { region: REGION, timeoutSeconds: 300, memory: "512MiB" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in before deleting your account.");
    }

    assertRecentAuthentication(request);
    const uid = request.auth.uid;
    const deletionRef = db.collection("accountDeletionRequests").doc(uid);
    let phase = "storage";
    let authDeleted = false;

    try {
      let requestAlreadyRunning = false;
      await db.runTransaction(async (transaction) => {
        const existing = await transaction.get(deletionRef);
        const startedAt = existing.get("startedAt")?.toMillis();
        if (
          existing.get("status") === "in_progress" &&
          startedAt &&
          Date.now() - startedAt < ACTIVE_REQUEST_LOCK_MILLISECONDS
        ) {
          requestAlreadyRunning = true;
          return;
        }

        transaction.set(
          deletionRef,
          {
            status: "in_progress",
            phase,
            attempt: (existing.get("attempt") || 0) + 1,
            requestedAt: existing.get("requestedAt") || FieldValue.serverTimestamp(),
            startedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      });
      if (requestAlreadyRunning) {
        throw new HttpsError("already-exists", "Account deletion is already in progress.");
      }

      await deleteStorageObjects(uid);
      phase = "cross-account";
      await deleteCrossAccountFirestoreData(uid);
      phase = "firestore";
      await deleteUserFirestoreData(uid);
      phase = "auth";
      await deletionRef.update({ phase, updatedAt: FieldValue.serverTimestamp() });
      try {
        await getAuth().deleteUser(uid);
      } catch (error) {
        if (error?.code !== "auth/user-not-found") throw error;
      }
      authDeleted = true;
      await deletionRef.update({
        status: "completed",
        phase: "completed",
        completedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return { deleted: true };
    } catch (error) {
      if (error instanceof HttpsError) throw error;

      const errorCode = typeof error?.code === "string" ? error.code : "unknown";
      logger.error("Account deletion failed", { phase, errorCode });

      if (!authDeleted) {
        try {
          await deletionRef.set(
            {
              status: "failed",
              phase,
              lastErrorCode: errorCode,
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        } catch (trackingError) {
          logger.error("Could not update account deletion state", {
            phase,
            errorCode: typeof trackingError?.code === "string" ? trackingError.code : "unknown",
          });
        }
        throw new HttpsError("internal", "Account deletion did not complete. Please retry.");
      }

      throw new HttpsError(
        "internal",
        "The account was deleted, but completion status could not be recorded. Contact support."
      );
    }
  }
);
