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
import { Loan, Student, LoanType, LoanReason, LoanStatus, User } from '../types';

export const loanService = {
  async checkout(data: Omit<Loan, 'id' | 'checkoutAt' | 'status' | 'updatedAt'> & { checkoutAt?: number }) {
    const now = Date.now();
    return addDoc(collection(db, 'loans'), {
      ...data,
      status: 'active',
      checkoutAt: data.checkoutAt || now,
      updatedAt: now
    });
  },

  async returnLoan(loanId: string, returnTechName?: string) {
    const now = Date.now();
    const loanRef = doc(db, 'loans', loanId);
    return updateDoc(loanRef, {
      status: 'returned',
      returnAt: now,
      updatedAt: now,
      ...(returnTechName ? { returnTechName } : {})
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

  async getLoansByDateRange(location: string, startTs: number, endTs: number) {
    const q = query(
      collection(db, 'loans'),
      where('location', '==', location),
      where('checkoutAt', '>=', startTs),
      where('checkoutAt', '<=', endTs),
      orderBy('checkoutAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Loan));
  },

  async clearLoans(location: string): Promise<number> {
    const q = query(collection(db, 'loans'), where('location', '==', location));
    const snapshot = await getDocs(q);
    const count = snapshot.docs.length;
    
    const chunks = [];
    for (let i = 0; i < snapshot.docs.length; i += 500) {
      chunks.push(snapshot.docs.slice(i, i + 500));
    }

    for (const chunk of chunks) {
      const batch = writeBatch(db);
      chunk.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }
    return count;
  },

  async deleteLoan(loanId: string) {
    const loanRef = doc(db, 'loans', loanId);
    return deleteDoc(loanRef);
  },

  async deleteLoansBatch(loanIds: string[]): Promise<number> {
    if (!loanIds || loanIds.length === 0) return 0;
    const chunks = [];
    for (let i = 0; i < loanIds.length; i += 500) {
      chunks.push(loanIds.slice(i, i + 500));
    }
    for (const chunk of chunks) {
      const batch = writeBatch(db);
      chunk.forEach(id => {
        batch.delete(doc(db, 'loans', id));
      });
      await batch.commit();
    }
    return loanIds.length;
  },

  async wipeAllLoans(): Promise<number> {
    const loansRef = collection(db, 'loans');
    const snapshot = await getDocs(loansRef);
    const count = snapshot.docs.length;
    const chunks = [];
    for (let i = 0; i < snapshot.docs.length; i += 500) {
      chunks.push(snapshot.docs.slice(i, i + 500));
    }
    for (const chunk of chunks) {
      const batch = writeBatch(db);
      chunk.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
    return count;
  },

  async getStudentChromebookLoanCount(studentId: string) {
    const q = query(
      collection(db, 'loans'),
      where('studentId', '==', studentId),
      where('type', '==', 'chromebook')
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
  },

  async getStudentLoansHistory(studentId: string) {
    const q = query(
      collection(db, 'loans'),
      where('studentId', '==', studentId),
      orderBy('checkoutAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Loan));
  },

  async getFilteredLoans(params: {
    location?: string;
    startTs?: number;
    endTs?: number;
    type?: LoanType | 'all';
    reason?: LoanReason | 'all';
    status?: LoanStatus | 'all';
    studentId?: string;
  }) {
    let q = query(collection(db, 'loans'));

    if (params.location && params.location !== 'ALL') {
      q = query(q, where('location', '==', params.location));
    }
    if (params.type && params.type !== 'all') {
      q = query(q, where('type', '==', params.type));
    }
    if (params.reason && params.reason !== 'all') {
      q = query(q, where('reason', '==', params.reason));
    }
    if (params.status && params.status !== 'all') {
      q = query(q, where('status', '==', params.status));
    }
    if (params.studentId) {
      q = query(q, where('studentId', '==', params.studentId));
    }

    const snapshot = await getDocs(q);
    let loans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Loan));

    // Client-side date filter & sorting to avoid complex composite index limits
    if (params.startTs !== undefined && params.startTs !== null) {
      loans = loans.filter(l => l.checkoutAt >= params.startTs!);
    }
    if (params.endTs !== undefined && params.endTs !== null) {
      loans = loans.filter(l => l.checkoutAt <= params.endTs!);
    }

    loans.sort((a, b) => b.checkoutAt - a.checkoutAt);
    return loans;
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

  async clearStudents(location: string): Promise<number> {
    const studentsRef = collection(db, 'students');
    const snapshot = await getDocs(studentsRef);
    const docsToDelete = snapshot.docs.filter(d => {
      const data = d.data();
      return data.location === location || d.id.startsWith(`${location}_`);
    });
    const count = docsToDelete.length;
    
    // Batch delete in chunks of 500
    const chunks = [];
    for (let i = 0; i < docsToDelete.length; i += 500) {
      chunks.push(docsToDelete.slice(i, i + 500));
    }

    for (const chunk of chunks) {
      const batch = writeBatch(db);
      chunk.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }
    return count;
  },

  async wipeAllStudents(): Promise<number> {
    const studentsRef = collection(db, 'students');
    const snapshot = await getDocs(studentsRef);
    const count = snapshot.docs.length;
    const chunks = [];
    for (let i = 0; i < snapshot.docs.length; i += 500) {
      chunks.push(snapshot.docs.slice(i, i + 500));
    }
    for (const chunk of chunks) {
      const batch = writeBatch(db);
      chunk.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
    return count;
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
  },

  async clearTechs(location: string): Promise<number> {
    const q = query(
      collection(db, 'users'), 
      where('role', '==', 'tech'),
      where('location', '==', location)
    );
    const snapshot = await getDocs(q);
    const count = snapshot.docs.length;
    const chunks = [];
    for (let i = 0; i < snapshot.docs.length; i += 500) {
      chunks.push(snapshot.docs.slice(i, i + 500));
    }
    for (const chunk of chunks) {
      const batch = writeBatch(db);
      chunk.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
    return count;
  },

  async wipeAllTechs(): Promise<number> {
    const q = query(collection(db, 'users'), where('role', '==', 'tech'));
    const snapshot = await getDocs(q);
    const count = snapshot.docs.length;
    const chunks = [];
    for (let i = 0; i < snapshot.docs.length; i += 500) {
      chunks.push(snapshot.docs.slice(i, i + 500));
    }
    for (const chunk of chunks) {
      const batch = writeBatch(db);
      chunk.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
    return count;
  }
};
