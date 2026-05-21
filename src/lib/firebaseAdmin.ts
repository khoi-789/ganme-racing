import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      console.error('Firebase Admin missing env vars:', {
        projectId: !!projectId,
        clientEmail: !!clientEmail,
        privateKey: !!privateKey,
      });
    } else {
      // Normalize private key if it has escaped newlines
      if (privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
      }
      // Strip surrounding quotes if the user pasted them with quotes on Vercel
      if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.substring(1, privateKey.length - 1).replace(/\\n/g, '\n');
      }

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    }
  } catch (error) {
    console.error('Firebase admin initialization error:', error);
  }
}

// Helper to get firestore db safely with dynamic error throwing if not initialized
const getAdminDb = () => {
  if (admin.apps.length) {
    return admin.firestore();
  }
  const missing = [];
  if (!process.env.FIREBASE_PROJECT_ID) missing.push('FIREBASE_PROJECT_ID');
  if (!process.env.FIREBASE_CLIENT_EMAIL) missing.push('FIREBASE_CLIENT_EMAIL');
  if (!process.env.FIREBASE_PRIVATE_KEY) missing.push('FIREBASE_PRIVATE_KEY');
  
  throw new Error(
    `Firebase Admin SDK not initialized. Missing environment variables: [${missing.join(', ')}]. Please double check your Vercel Project Settings.`
  );
};

const adminDb = {
  collection: (name: string) => getAdminDb().collection(name),
  runTransaction: (updateFunction: (transaction: any) => Promise<any>) => getAdminDb().runTransaction(updateFunction),
} as unknown as FirebaseFirestore.Firestore;

const adminAuth = admin.apps.length ? admin.auth() : {} as admin.auth.Auth;

export { adminDb, adminAuth };
