export type UserRole = 'admin' | 'tech';

export interface User {
  uid: string;
  name: string;
  role: UserRole;
  location?: string;
  createdAt?: number;
}

export type LoanType = 'chromebook' | 'charger';
export type LoanReason = 'Lost Chromebook' | 'Forgotten at Home' | 'Broken' | 'Other' | 'Quick' | 'CB Dead / Needs Charging';
export type LoanStatus = 'active' | 'returned';

export interface Student {
  id: string; // Student ID like "123456"
  name: string;
  location: string;
  email?: string;
  grade?: string;
}

export interface Loan {
  id: string;
  type: LoanType;
  studentId?: string;
  studentName?: string;
  studentEmail?: string;
  studentGrade?: string;
  assetTag: string;
  reason: LoanReason;
  location: string;
  status: LoanStatus;
  techId: string;
  techName: string;
  checkoutAt: number; // timestamp
  returnAt?: number; // timestamp
  updatedAt?: number; // timestamp for sorting activity
  classroom?: string;
  teacherName?: string;
}

export const LOCATIONS = [
  "K8WES", "K8KAT", "K8RIC", "HSKAT", "K8PEA", "K8ORE", "K8WIN", 
  "HSWIN", "K8COL", "HSAGG", "K8BGR", "K8MSG", "HSLIB"
] as const;

export type LocationKey = typeof LOCATIONS[number];
