  export interface Student {
  firstName: string;
  lastName: string;
  grade: string;
  grade_band: string; // Band1, Band2, Band3, Band4 per client spec
  school_name: string;
  dob: string;
  ageGroup: string;
  sport: string;
  groupId?: string;
}

export interface Member {
  id?: string; // Firestore document ID
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  sport: string;
  membershipType: "paid" | "free";
  registrationSource: "mobile";
  createdAt: any; // Firestore Timestamp
  students: Student[];
  expoPushTokens?: string[]; // Support multiple devices
  role?: 'coach' | 'parent' | 'admin';
  smsConsent?: boolean;
  // Metadata for App Architecture
  signup_source?: "mobile_app" | "website" | "admin";
  environment?: "test" | "production";
  user_type?: "parent" | "coach" | "admin" | "student";
  app_access?: boolean;
}

export interface User {
  id: string; // Firebase Auth UID
  parentName: string;
  childName: string;
  phoneNumber: string;
  school: string;
  grade: string;
  sports: string[];
  groups: string[]; // Assigned groups (e.g., 'WashingtonHigh-Band3-Basketball')
  pushToken?: string;
  createdAt: number;
}

export interface GroupMessage {
  id: string;
  groupId: string;
  title: string;
  body: string;
  timestamp: number;
  senderId?: string;
}

export interface GameSchedule {
  id: string;
  groupId: string;
  date: string; // ISO String
  time: string; // e.g. "10:00 AM"
  location: string;
  school: string; // Opponent or Home
  sport: string;
  gradeBand: string;
}

export const GRADE_BAND_MAP: Record<string, string> = {
  'K': 'Band 1',
  '1': 'Band 1',
  '2': 'Band 2',
  '3': 'Band 2',
  '4': 'Band 3',
  '5': 'Band 3',
  '6': 'Band 4',
  '7': 'Band 4',
  '8': 'Band 4',
};
