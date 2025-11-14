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

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let _isFirebaseConfigured = false;
let _initializationError: string | null = null;

const initializeFirebase = () => {
    if (app) return; // Already initialized

    const firebaseConfigJSON = process.env.FIREBASE_CONFIG_JSON;

    if (!firebaseConfigJSON || firebaseConfigJSON === 'undefined') {
        _initializationError = "Avís: La connexió al núvol no està disponible. Les creacions es desaran només en aquest navegador.";
        console.warn(`[Firebase Service] Not initialized: VITE_FIREBASE_CONFIG_JSON environment variable not found.`);
        _isFirebaseConfigured = false;
        return;
    }
    
    try {
        const firebaseConfig = JSON.parse(firebaseConfigJSON);

        if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
            throw new Error("El JSON de configuració de Firebase és invàlid o li falten camps essencials (apiKey, projectId).");
        }
        
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        _isFirebaseConfigured = true;
        console.log(`[Firebase Service] Successfully connected to the cloud database.`);
    } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        _initializationError = `Error en connectar amb la base de dades al núvol: ${error}`;
        console.error(`[Firebase Service] Initialization failed:`, e);
        _isFirebaseConfigured = false;
    }
};

// Initialize on load
initializeFirebase();

export const isFirebaseConfigured = (): boolean => _isFirebaseConfigured;

export const getInitializationError = (): string | null => {
    return _initializationError;
};

const PRESENTATIONS_COLLECTION = 'presentations';

export const onPresentationsUpdate = (callback: (presentations: Presentation[]) => void): (() => void) => {
    if (!_isFirebaseConfigured || !db) {
        console.warn("[Firebase Service] onPresentationsUpdate called but Firebase is not configured. Real-time updates are disabled.");
        return () => {}; // Return an empty unsubscribe function
    }

    const presentationsQuery = query(collection(db, PRESENTATIONS_COLLECTION), orderBy('id', 'desc'));
    
    const unsubscribe = onSnapshot(presentationsQuery, (querySnapshot) => {
        const presentations: Presentation[] = [];
        querySnapshot.forEach((doc) => {
            presentations.push(doc.data() as Presentation);
        });
        callback(presentations);
    }, (error) => {
        console.error("Error listening to presentations collection:", error);
    });

    return unsubscribe;
};

export const addPresentation = async (presentation: Presentation): Promise<void> => {
    if (!_isFirebaseConfigured || !db) {
        console.warn("[Firebase Service] addPresentation called but Firebase is not configured. The presentation will not be saved to the cloud.");
        return;
    }
    try {
        await addDoc(collection(db, PRESENTATIONS_COLLECTION), presentation);
    } catch (error) {
        console.error("Error adding presentation to the cloud:", error);
        throw new Error("No s'ha pogut guardar la presentació al núvol.");
    }
};

export const clearAllPresentations = async (): Promise<void> => {
    if (!_isFirebaseConfigured || !db) {
       console.warn("[Firebase Service] clearAllPresentations called but Firebase is not configured. History will not be cleared from the cloud.");
       return;
    }
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
        console.error("Error clearing all presentations from the cloud:", error);
        throw new Error("No s'ha pogut esborrar l'historial del núvol.");
    }
};