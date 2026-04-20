import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInAnonymously,
  User as FirebaseUser 
} from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from './firebase';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  initialized: boolean;
  loginWithPin: (pin: string) => Promise<boolean>;
  loginWithTechName: (name: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PIN_SESSION_KEY = 'aoh_portal_pin_session';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fUser) => {
      setFirebaseUser(fUser);
      
      // Check for portal session in localStorage
      const savedPinUser = localStorage.getItem(PIN_SESSION_KEY);
      
      if (fUser) {
        try {
          const docRef = doc(db, 'users', fUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setUser(docSnap.data() as User);
          } else if (savedPinUser) {
            // Use the saved portal session if no firestore profile exists (e.g. anonymous)
            setUser(JSON.parse(savedPinUser));
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          if (savedPinUser) setUser(JSON.parse(savedPinUser));
        }
      } else {
        // If we have a portal session but no Firebase user, sign in anonymously
        if (savedPinUser) {
          signInAnonymously(auth).catch(e => {
            console.warn("Anonymous Auth failed. Proceeding without Firebase Auth session. Re-enable in Firebase Console for security.", e);
          });
          setUser(JSON.parse(savedPinUser));
        } else {
          setUser(null);
        }
      }
      setLoading(false);
      setInitialized(true);
    });

    return () => unsubscribe();
  }, []);

  const loginWithPin = async (pin: string) => {
    if (pin === '7324') {
      try {
        await signInAnonymously(auth).catch(e => {
          console.warn("Anonymous Auth disabled. Continuing locally.", e);
        });
        const adminUser: User = {
          uid: 'admin-pin-user',
          name: 'System Admin',
          role: 'admin',
          location: 'K8WES', // Default location
          createdAt: Date.now()
        };
        setUser(adminUser);
        localStorage.setItem(PIN_SESSION_KEY, JSON.stringify(adminUser));
        return true;
      } catch (err) {
        console.error("Auth error:", err);
        return false;
      }
    }
    return false;
  };

  const loginWithTechName = async (name: string) => {
    try {
      const usersRef = collection(db, 'users');
      const cleanName = name.trim();
      const lowerName = cleanName.toLowerCase();
      
      // Try exact name match first (case sensitive as stored)
      let q = query(usersRef, where('name', '==', cleanName), where('role', '==', 'tech'));
      let querySnapshot = await getDocs(q);
      
      // If not found, try UID match (case insensitive approach as UID is stored lowercase)
      if (querySnapshot.empty) {
        const docRef = doc(db, 'users', lowerName);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const userData = docSnap.data() as User;
          if (userData.role === 'tech') {
            await signInAnonymously(auth).catch(e => {
              console.warn("Anonymous Auth disabled. Continuing locally.", e);
            });
            setUser(userData);
            localStorage.setItem(PIN_SESSION_KEY, JSON.stringify(userData));
            return true;
          }
        }
      }

      if (!querySnapshot.empty) {
        await signInAnonymously(auth).catch(e => {
          console.warn("Anonymous Auth disabled. Continuing locally.", e);
        });
        const userData = querySnapshot.docs[0].data() as User;
        setUser(userData);
        localStorage.setItem(PIN_SESSION_KEY, JSON.stringify(userData));
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const logout = async () => {
    localStorage.removeItem(PIN_SESSION_KEY);
    await auth.signOut();
    setUser(null);
    setFirebaseUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, initialized, loginWithPin, loginWithTechName, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
