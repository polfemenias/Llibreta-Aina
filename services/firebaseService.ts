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

const initializeFirebase = () => {
    if (app) return;

    if (Object.values(firebaseConfig).some(value => !value)) {
        console.error("Les claus de configuració de Firebase no estan completes. Assegura't d'haver configurat totes les variables d'entorn (VITE_FIREBASE_...) a Netlify.");
        return;
    }
    
    try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
    } catch (e) {
        console.error("Error inicialitzant Firebase:", e);
    }
};

const PRESENTATIONS_COLLECTION = 'presentations';

export const onPresentationsUpdate = (callback: (presentations: Presentation[]) => void): (() => void) => {
    initializeFirebase();
    if (!db) {
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
    initializeFirebase();
    if (!db) throw new Error("Firebase no està inicialitzat.");
    try {
        await addDoc(collection(db, PRESENTATIONS_COLLECTION), presentation);
    } catch (error) {
        console.error("Error en afegir la presentació:", error);
        throw new Error("No s'ha pogut guardar la presentació al núvol.");
    }
};

export const clearAllPresentations = async (): Promise<void> => {
    initializeFirebase();
    if (!db) throw new Error("Firebase no està inicialitzat.");
    try {
        const presentationsQuery = query(collection(db, PRESENTATIONS_COLLECTION));
        const querySnapshot = await getDocs(presentationsQuery);
        
        if (querySnapshot.empty) {
            return;
        }

        const batch = writeBatch(db);
        querySnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
    } catch (error) {
        console.error("Error en esborrar totes les presentacions:", error);
        throw new Error("No s'ha pogut esborrar l'historial del núvol.");
    }
};