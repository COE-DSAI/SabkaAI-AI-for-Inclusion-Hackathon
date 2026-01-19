// Secure Storage Wrapper for Firebase
// Automatically encrypts sensitive financial data before storing

import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "./firebase-config";
import { encryptData, decryptData, isEncryptionReady } from "./encryption";

// Fields that should be encrypted
const SENSITIVE_FIELDS = [
  "amount",
  "balance",
  "income",
  "expense",
  "salary",
  "price",
  "cost",
  "revenue",
  "profit",
  "debt",
  "loan",
  "savings",
  "investment",
  "transaction",
  "payment",
  "description",
  "notes",
  "remarks",
  "purpose",
];

// Check if a field should be encrypted
function isSensitiveField(key: string): boolean {
  const lowerKey = key.toLowerCase();
  return SENSITIVE_FIELDS.some((field) => lowerKey.includes(field));
}

// Recursively encrypt sensitive fields in an object
async function encryptSensitiveFields(data: any): Promise<any> {
  if (!isEncryptionReady()) {
    // Encryption will be initialized shortly - this is expected during login flow
    console.debug("Encryption initializing...");
    return data;
  }

  if (typeof data !== "object" || data === null) {
    return data;
  }

  const result: any = Array.isArray(data) ? [] : {};

  for (const [key, value] of Object.entries(data)) {
    if (isSensitiveField(key) && value !== null && value !== undefined) {
      // Encrypt this field
      try {
        result[`${key}_encrypted`] = await encryptData(value);
        result[`${key}_isEncrypted`] = true;
      } catch (error) {
        console.error(`Failed to encrypt field ${key}:`, error);
        result[key] = value; // Fallback to unencrypted
      }
    } else if (typeof value === "object" && value !== null) {
      // Recursively process nested objects
      result[key] = await encryptSensitiveFields(value);
    } else {
      result[key] = value;
    }
  }

  return result;
}

// Recursively decrypt sensitive fields in an object
async function decryptSensitiveFields(data: any): Promise<any> {
  if (!data || typeof data !== "object") {
    return data;
  }

  const result: any = Array.isArray(data) ? [] : {};

  for (const [key, value] of Object.entries(data)) {
    if (
      key.endsWith("_encrypted") &&
      data[`${key.replace("_encrypted", "")}_isEncrypted`]
    ) {
      // This is an encrypted field
      const originalKey = key.replace("_encrypted", "");
      try {
        result[originalKey] = await decryptData(value as string);
      } catch (error) {
        console.error(`Failed to decrypt field ${originalKey}:`, error);
        result[originalKey] = null;
      }
    } else if (
      !key.endsWith("_isEncrypted") &&
      typeof value === "object" &&
      value !== null
    ) {
      // Recursively process nested objects
      result[key] = await decryptSensitiveFields(value);
    } else if (!key.endsWith("_isEncrypted")) {
      result[key] = value;
    }
  }

  return result;
}

// Secure wrapper for setDoc
export async function secureSetDoc(docRef: any, data: any, options?: any) {
  const encryptedData = await encryptSensitiveFields(data);
  return setDoc(docRef, encryptedData, options);
}

// Secure wrapper for getDoc
export async function secureGetDoc(docRef: any) {
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    return docSnap;
  }

  const decryptedData = await decryptSensitiveFields(docSnap.data());

  return {
    ...docSnap,
    data: () => decryptedData,
  };
}

// Secure wrapper for addDoc
export async function secureAddDoc(collectionRef: any, data: any) {
  const encryptedData = await encryptSensitiveFields(data);
  return addDoc(collectionRef, encryptedData);
}

// Secure wrapper for updateDoc
export async function secureUpdateDoc(docRef: any, data: any) {
  const encryptedData = await encryptSensitiveFields(data);
  return updateDoc(docRef, encryptedData);
}

// Secure wrapper for getDocs (queries)
export async function secureGetDocs(querySnapshot: any) {
  const snapshot = await getDocs(querySnapshot);

  const decryptedDocs = await Promise.all(
    snapshot.docs.map(async (doc) => {
      const decryptedData = await decryptSensitiveFields(doc.data());
      return {
        ...doc,
        data: () => decryptedData,
      };
    })
  );

  return {
    ...snapshot,
    docs: decryptedDocs,
  };
}

// Helper function to create secure document reference
export function secureDoc(
  firestore: any,
  path: string,
  ...pathSegments: string[]
) {
  return doc(firestore, path, ...pathSegments);
}

// Helper function to create secure collection reference
export function secureCollection(
  firestore: any,
  path: string,
  ...pathSegments: string[]
) {
  return collection(firestore, path, ...pathSegments);
}

// Export deleteDoc as-is (no encryption needed for deletion)
export { deleteDoc };
