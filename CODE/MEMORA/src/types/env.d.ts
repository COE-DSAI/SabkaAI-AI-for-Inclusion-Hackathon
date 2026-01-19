/**
 * Type declarations for environment variables from .env
 */
declare module '@env' {
  export const OPENAI_API_KEY: string | undefined;
  export const GEMINI_API_KEY: string | undefined;
  export const FIREBASE_API_KEY: string | undefined;
  export const FIREBASE_AUTH_DOMAIN: string | undefined;
  export const FIREBASE_PROJECT_ID: string | undefined;
  export const FIREBASE_STORAGE_BUCKET: string | undefined;
  export const FIREBASE_MESSAGING_SENDER_ID: string | undefined;
  export const FIREBASE_APP_ID: string | undefined;
}
