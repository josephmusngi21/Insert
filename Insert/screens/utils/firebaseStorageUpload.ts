import * as FileSystem from "expo-file-system/legacy";
import { auth, storage } from "@/screens/firebaseAuthLoginRegister/firebase/config";
import { getDownloadURL, ref as storageRef } from "firebase/storage";

type UploadLocalFileOptions = {
  fileUri: string;
  storagePath: string;
  contentType?: string;
};

type FirebaseStorageResponse = {
  bucket?: string;
  downloadTokens?: string;
  error?: {
    message?: string;
  };
  name?: string;
};

const FIREBASE_STORAGE_API_BASE = "https://firebasestorage.googleapis.com/v0";

const getBucketCandidates = (configuredBucket: string) => {
  const candidates = [configuredBucket];

  if (configuredBucket.endsWith(".firebasestorage.app")) {
    candidates.push(configuredBucket.replace(/\.firebasestorage\.app$/, ".appspot.com"));
  }
  if (configuredBucket.endsWith(".appspot.com")) {
    candidates.push(configuredBucket.replace(/\.appspot\.com$/, ".firebasestorage.app"));
  }

  return Array.from(new Set(candidates));
};

const parseStorageResponse = (body: string): FirebaseStorageResponse | null => {
  try {
    return JSON.parse(body) as FirebaseStorageResponse;
  } catch {
    return null;
  }
};

const getStorageErrorMessage = (body: string, fallback: string) => {
  const parsedBody = parseStorageResponse(body);
  return parsedBody?.error?.message || parsedBody?.error?.message?.trim() || body.trim() || fallback;
};

export const uploadLocalFileToFirebaseStorage = async ({
  fileUri,
  storagePath,
  contentType = "image/jpeg",
}: UploadLocalFileOptions): Promise<string> => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("User not signed in");
  }

  const fileInfo = await FileSystem.getInfoAsync(fileUri);
  if (!fileInfo.exists || fileInfo.isDirectory) {
    throw new Error("Captured photo file was not found.");
  }

  const configuredBucket = storage.app.options.storageBucket;
  if (!configuredBucket) {
    throw new Error("Firebase Storage bucket is not configured.");
  }
  const bucketCandidates = getBucketCandidates(configuredBucket);

  const fileSize = typeof fileInfo.size === "number" ? fileInfo.size : 0;
  const idToken = await currentUser.getIdToken();
  let uploadUrl: string | null = null;
  let lastStartError = "Could not start upload.";

  for (const bucket of bucketCandidates) {
    const sessionStartUrl = `${FIREBASE_STORAGE_API_BASE}/b/${encodeURIComponent(bucket)}/o?name=${encodeURIComponent(storagePath)}`;

    const startResponse = await fetch(sessionStartUrl, {
      method: "POST",
      headers: {
        Authorization: `Firebase ${idToken}`,
        "Content-Type": "application/json; charset=utf-8",
        "X-Firebase-Storage-Version": "webjs/expo-rest",
        "X-Goog-Upload-Command": "start",
        "X-Goog-Upload-Header-Content-Length": String(fileSize),
        "X-Goog-Upload-Header-Content-Type": contentType,
        "X-Goog-Upload-Protocol": "resumable",
      },
      body: JSON.stringify({
        contentType,
        name: storagePath,
      }),
    });

    if (startResponse.ok) {
      uploadUrl = startResponse.headers.get("X-Goog-Upload-URL");
      if (uploadUrl) {
        break;
      }
      lastStartError = "Firebase Storage did not return an upload session URL.";
      continue;
    }

    const errorText = await startResponse.text();
    lastStartError = getStorageErrorMessage(errorText, `Could not start upload (${startResponse.status}).`);
  }

  if (!uploadUrl) {
    throw new Error(lastStartError);
  }

  const uploadResponse = await FileSystem.uploadAsync(uploadUrl, fileUri, {
    headers: {
      Authorization: `Firebase ${idToken}`,
      "Content-Type": contentType,
      "X-Firebase-Storage-Version": "webjs/expo-rest",
      "X-Goog-Upload-Command": "upload, finalize",
      "X-Goog-Upload-Offset": "0",
    },
    httpMethod: "POST",
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
  });

  if (uploadResponse.status < 200 || uploadResponse.status >= 300) {
    throw new Error(getStorageErrorMessage(uploadResponse.body, `Could not upload photo (${uploadResponse.status}).`));
  }

  return getDownloadURL(storageRef(storage, storagePath));
};
