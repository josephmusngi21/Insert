/*
 * Remediation for the retired admin quick-switch feature (plaintext passwords in Firestore).
 * Treats every stored credential as compromised.
 *
 * Default (no flags): READ-ONLY inventory. Prints UIDs / emails / field names, never secret values.
 *   Writes the inventory to a local file OUTSIDE the repo (it contains emails).
 *
 * Flags (combine as needed; order of operations is always inventory -> rotate -> delete):
 *   --rotate          Set an unknown random password and revoke all sessions for the compromised set
 *                     (owners of quick-switch docs + accounts whose emails are stored in them).
 *   --rotate-all      Same, for EVERY Firebase Auth user. Use if the compromised set cannot be trusted.
 *   --apply           Delete users/{uid}/settings/adminQuickSwitch docs and remove isAdmin fields.
 *                     Refused unless --rotate/--rotate-all ran in this invocation or --i-have-rotated is passed.
 *   --i-have-rotated  Acknowledge that rotation was already completed in an earlier run.
 *   --confirm=<id>    Required with --rotate / --rotate-all / --apply; must equal the project ID.
 *   --out=<file>      Inventory output path (default: %USERPROFILE%\insert-quick-switch-inventory.json).
 *
 * Users regain access with "Forgot password" (Firebase sends the reset email from the app).
 *
 * Setup (run locally; never ship this in the app; never commit the service account key):
 *   npm install --no-save firebase-admin
 *   $env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\service-account.json"
 *   node scripts/cleanup-legacy-quick-switch.js
 */
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const admin = require("firebase-admin");

const PROJECT_ID = "planty-223aa";
const TARGET_DOC_ID = "adminQuickSwitch";
const SECRET_FIELD = /pass(word|wd)?|secret|credential|token/i;
const EMAIL_VALUE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BATCH_SIZE = 400;

const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const valueOf = (name) => (args.find((a) => a.startsWith(`${name}=`)) || "").slice(name.length + 1);

const ROTATE = has("--rotate");
const ROTATE_ALL = has("--rotate-all");
const APPLY = has("--apply");
const ACK_ROTATED = has("--i-have-rotated");
const CONFIRM = valueOf("--confirm");
const OUT_FILE = valueOf("--out") || path.join(os.homedir(), "insert-quick-switch-inventory.json");

admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: PROJECT_ID });
const db = admin.firestore();
const auth = admin.auth();

function requireConfirmation() {
  if (CONFIRM !== PROJECT_ID) {
    console.error(`Refusing to modify anything: pass --confirm=${PROJECT_ID}`);
    process.exit(1);
  }
}

async function buildInventory() {
  const docs = [];
  const suspicious = [];

  // settings documents live in the "settings" collection under each user
  const settings = await db.collectionGroup("settings").get();
  for (const snap of settings.docs) {
    const data = snap.data();
    const secretFields = Object.keys(data).filter((key) => SECRET_FIELD.test(key));
    if (snap.id === TARGET_DOC_ID) {
      const storedEmails = Object.entries(data)
        .filter(([key, value]) => !SECRET_FIELD.test(key) && typeof value === "string" && EMPTY_OR_EMAIL(value))
        .map(([, value]) => value.trim().toLowerCase());
      docs.push({
        path: snap.ref.path,
        ownerUid: snap.ref.parent.parent.id,
        fieldNames: Object.keys(data),
        storedEmails,
      });
    } else if (secretFields.length) {
      suspicious.push({ path: snap.ref.path, fields: secretFields });
    }
  }

  const adminProfiles = (await db.collection("users").where("isAdmin", "!=", null).get()).docs.map((s) => s.ref.path);
  return { docs, suspicious, adminProfiles };
}

function EMPTY_OR_EMAIL(value) {
  return EMAIL_VALUE.test(value.trim());
}

async function resolveCompromisedUids(docs) {
  const uids = new Set();
  const unresolvedEmails = new Set();
  for (const entry of docs) {
    uids.add(entry.ownerUid);
    for (const email of entry.storedEmails) {
      try {
        uids.add((await auth.getUserByEmail(email)).uid);
      } catch (error) {
        if (error.code === "auth/user-not-found") unresolvedEmails.add(email);
        else throw error;
      }
    }
  }
  return { uids: [...uids], unresolvedEmails: [...unresolvedEmails] };
}

async function listAllUids() {
  const uids = [];
  let pageToken;
  do {
    const page = await auth.listUsers(1000, pageToken);
    page.users.forEach((u) => uids.push(u.uid));
    pageToken = page.pageToken;
  } while (pageToken);
  return uids;
}

async function rotate(uids) {
  let done = 0;
  for (const uid of uids) {
    try {
      // The new password is never printed or stored; the user recovers via "Forgot password".
      await auth.updateUser(uid, { password: crypto.randomBytes(32).toString("base64") });
      await auth.revokeRefreshTokens(uid);
      done += 1;
    } catch (error) {
      console.error(`  FAILED to rotate ${uid}: ${error.code || error.message}`);
    }
  }
  return done;
}

async function main() {
  const modifying = ROTATE || ROTATE_ALL || APPLY;
  console.log(modifying ? "MODE: WILL MODIFY DATA" : "MODE: READ-ONLY INVENTORY");
  if (modifying) requireConfirmation();
  if (APPLY && !(ROTATE || ROTATE_ALL || ACK_ROTATED)) {
    console.error("Refusing to delete evidence before credentials are rotated. Use --rotate, --rotate-all or --i-have-rotated.");
    process.exit(1);
  }

  const inventory = await buildInventory();
  const { uids: compromised, unresolvedEmails } = await resolveCompromisedUids(inventory.docs);

  console.log(`\nadminQuickSwitch docs: ${inventory.docs.length}`);
  inventory.docs.forEach((d) => console.log(`  ${d.path}  fields=[${d.fieldNames.join(", ")}]  storedEmails=${d.storedEmails.length}`));
  console.log(`compromised accounts (owners + stored-credential accounts): ${compromised.length}`);
  compromised.forEach((uid) => console.log(`  ${uid}`));
  console.log(`stored emails with no matching Auth user: ${unresolvedEmails.length}`);
  console.log(`profiles with an isAdmin field: ${inventory.adminProfiles.length}`);
  console.log(`other settings docs with secret-like field names (NOT modified, review manually): ${inventory.suspicious.length}`);
  inventory.suspicious.forEach((s) => console.log(`  ${s.path} -> ${s.fields.join(", ")}`));

  fs.writeFileSync(OUT_FILE, JSON.stringify({ createdAt: new Date().toISOString(), ...inventory, compromised, unresolvedEmails }, null, 2), { mode: 0o600 });
  console.log(`\nInventory saved to ${OUT_FILE} (contains emails; keep private, delete when finished).`);

  if (ROTATE || ROTATE_ALL) {
    const targets = ROTATE_ALL ? await listAllUids() : compromised;
    console.log(`\nRotating ${targets.length} account(s) and revoking their sessions...`);
    const done = await rotate(targets);
    console.log(`Rotated ${done}/${targets.length}.`);
    if (done !== targets.length) {
      console.error("Some rotations failed; not deleting anything. Fix the failures and re-run.");
      process.exit(1);
    }
  }

  if (APPLY) {
    for (let i = 0; i < inventory.docs.length; i += BATCH_SIZE) {
      const batch = db.batch();
      inventory.docs.slice(i, i + BATCH_SIZE).forEach((d) => batch.delete(db.doc(d.path)));
      await batch.commit();
    }
    for (let i = 0; i < inventory.adminProfiles.length; i += BATCH_SIZE) {
      const batch = db.batch();
      inventory.adminProfiles
        .slice(i, i + BATCH_SIZE)
        .forEach((p) => batch.update(db.doc(p), { isAdmin: admin.firestore.FieldValue.delete() }));
      await batch.commit();
    }
    console.log(`\nDeleted ${inventory.docs.length} docs; cleared isAdmin on ${inventory.adminProfiles.length} profiles.`);
  } else if (modifying) {
    console.log("\nRotation finished. Re-run with --apply --i-have-rotated --confirm=" + PROJECT_ID + " to delete the stored credentials.");
  } else {
    console.log("\nRead-only run complete. Nothing was changed.");
  }
}

main().catch((error) => {
  console.error("Failed:", error.message);
  process.exit(1);
});
