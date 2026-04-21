import { 
  collection, 
  addDoc, 
  updateDoc, 
  setDoc,
  deleteDoc,
  doc, 
  query, 
  where, 
  getDocs, 
  serverTimestamp,
  orderBy,
  limit,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { Loan, Student, LoanType, LoanReason, User } from '../types';

export const loanService = {
  async checkout(data: Omit<Loan, 'id' | 'checkoutAt' | 'status' | 'updatedAt'>) {
    const now = Date.now();
    return addDoc(collection(db, 'loans'), {
      ...data,
      status: 'active',
      checkoutAt: now,
      updatedAt: now
    });
  },

  async returnLoan(loanId: string) {
    const now = Date.now();
    const loanRef = doc(db, 'loans', loanId);
    return updateDoc(loanRef, {
      status: 'returned',
      returnAt: now,
      updatedAt: now
    });
  },

  async getActiveLoans(location: string) {
    const q = query(
      collection(db, 'loans'),
      where('location', '==', location),
      where('status', '==', 'active')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Loan));
  },

  async getRecentLoans(location: string, limitCount = 100) {
    const q = query(
      collection(db, 'loans'),
      where('location', '==', location),
      orderBy('updatedAt', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Loan));
  },

  async clearLoans(location: string) {
    const q = query(collection(db, 'loans'), where('location', '==', location));
    const snapshot = await getDocs(q);
    
    const chunks = [];
    for (let i = 0; i < snapshot.docs.length; i += 500) {
      chunks.push(snapshot.docs.slice(i, i + 500));
    }

    for (const chunk of chunks) {
      const batch = writeBatch(db);
      chunk.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }
  },

  async wipeAllLoans() {
    const loansRef = collection(db, 'loans');
    const snapshot = await getDocs(loansRef);
    const chunks = [];
    for (let i = 0; i < snapshot.docs.length; i += 500) {
      chunks.push(snapshot.docs.slice(i, i + 500));
    }
    for (const chunk of chunks) {
      const batch = writeBatch(db);
      chunk.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
  }
};

export const studentService = {
  async searchStudents(location: string, term: string) {
    const q = query(
      collection(db, 'students'),
      where('location', '==', location)
    );
    const snapshot = await getDocs(q);
    const students = snapshot.docs.map(doc => doc.data() as Student);
    const lowerTerm = term.toLowerCase();
    return students.filter(s => 
      s.name.toLowerCase().includes(lowerTerm) || 
      s.id.toLowerCase().includes(lowerTerm) ||
      (s.email && s.email.toLowerCase().includes(lowerTerm))
    );
  },

  async uploadStudents(location: string, students: Omit<Student, 'location'>[], onProgress?: (percent: number) => void) {
    const chunks = [];
    for (let i = 0; i < students.length; i += 500) {
      chunks.push(students.slice(i, i + 500));
    }

    let processed = 0;
    for (const chunk of chunks) {
      const currentBatch = writeBatch(db);
      for (const student of chunk) {
        // Use consistent document ID to prevent duplicates, sanitize ID to be safe for paths
        const safeStudentId = student.id.replace(/[^a-zA-Z0-9]/g, '_');
        const studentRef = doc(db, 'students', `${location}_${safeStudentId}`);
        currentBatch.set(studentRef, { ...student, location });
      }
      await currentBatch.commit();
      processed += chunk.length;
      if (onProgress) onProgress(Math.round((processed / students.length) * 100));
    }
  },

  async clearStudents(location: string) {
    const q = query(collection(db, 'students'), where('location', '==', location));
    const snapshot = await getDocs(q);
    
    // Batch delete in chunks of 500
    const chunks = [];
    for (let i = 0; i < snapshot.docs.length; i += 500) {
      chunks.push(snapshot.docs.slice(i, i + 500));
    }

    for (const chunk of chunks) {
      const batch = writeBatch(db);
      chunk.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }
  },

  async wipeAllStudents() {
    const studentsRef = collection(db, 'students');
    const snapshot = await getDocs(studentsRef);
    const chunks = [];
    for (let i = 0; i < snapshot.docs.length; i += 500) {
      chunks.push(snapshot.docs.slice(i, i + 500));
    }
    for (const chunk of chunks) {
      const batch = writeBatch(db);
      chunk.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
  }
};

export const userService = {
  async getTechs() {
    const q = query(collection(db, 'users'), where('role', '==', 'tech'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
  },

  async registerTech(name: string, location: string) {
    const techNameClean = name.trim().toLowerCase();
    const techRef = doc(db, 'users', techNameClean);
    return setDoc(techRef, {
      uid: techNameClean,
      name: name.trim(),
      role: 'tech',
      location: location
    });
  },

  async deleteTech(uid: string) {
    const techRef = doc(db, 'users', uid);
    return deleteDoc(techRef);
  },

  async updateTech(uid: string, data: Partial<User>) {
    const techRef = doc(db, 'users', uid);
    return updateDoc(techRef, data);
  }
};
