import { initializeApp, FirebaseApp } from "firebase/app";
import { 
    getFirestore, 
    collection, 
    onSnapshot, 
    addDoc, 
    query, 
    orderBy, 
    getDocs, 
    writeBatch,
    Firestore
} from "firebase/firestore";
import type { Presentation } from '../types';

// Firebase configuration object from environment variables
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let initializationAttempted = false;
let initializationError: string | null = null;

const initializeFirebase = () => {
    if (app) return; // Already initialized successfully
    if (initializationAttempted) return; // Don't try again if it failed once

    initializationAttempted = true;

    if (Object.values(firebaseConfig).some(value => !value)) {
        initializationError = "La configuració de la base de dades al núvol (Firebase) és incorrecta o està incompleta. Assegura't que les claus de configuració estiguin ben definides a l'entorn de desplegament.";
        console.error(initializationError);
        return;
    }
    
    try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
    } catch (e) {
        initializationError = "Hi ha hagut un error en connectar amb la base de dades al núvol.";
        console.error("Error inicialitzant Firebase:", e);
    }
};

const ensureDb = (): Firestore => {
    initializeFirebase();
    if (!db) {
        // Throw the specific error from initialization, or a generic fallback.
        throw new Error(initializationError || "La connexió amb la base de dades no s'ha pogut establir.");
    }
    return db;
}

const PRESENTATIONS_COLLECTION = 'presentations';

export const onPresentationsUpdate = (callback: (presentations: Presentation[]) => void): (() => void) => {
    initializeFirebase();
    if (!db) {
        if(initializationError) console.error(initializationError);
        return () => {}; // Return an empty unsubscribe function if init failed
    }

    const presentationsQuery = query(collection(db, PRESENTATIONS_COLLECTION), orderBy('id', 'desc'));
    
    const unsubscribe = onSnapshot(presentationsQuery, (querySnapshot) => {
        const presentations: Presentation[] = [];
        querySnapshot.forEach((doc) => {
            presentations.push(doc.data() as Presentation);
        });
        callback(presentations);
    }, (error) => {
        console.error("Error a l'escoltar la col·lecció de presentacions:", error);
    });

    return unsubscribe;
};

export const addPresentation = async (presentation: Presentation): Promise<void> => {
    const dbInstance = ensureDb();
    try {
        await addDoc(collection(dbInstance, PRESENTATIONS_COLLECTION), presentation);
    } catch (error) {
        console.error("Error en afegir la presentació:", error);
        throw new Error("No s'ha pogut guardar la presentació al núvol.");
    }
};

export const clearAllPresentations = async (): Promise<void> => {
    const dbInstance = ensureDb();
    try {
        const presentationsQuery = query(collection(dbInstance, PRESENTATIONS_COLLECTION));
        const querySnapshot = await getDocs(presentationsQuery);
        
        if (querySnapshot.empty) {
            return;
        }

        const batch = writeBatch(dbInstance);
        querySnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
    } catch (error) {
        console.error("Error en esborrar totes les presentacions:", error);
        throw new Error("No s'ha pogut esborrar l'historial del núvol.");
    }
};
