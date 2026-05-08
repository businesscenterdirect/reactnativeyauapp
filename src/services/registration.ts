import { Member, Student } from '../types';
import { generateGroupId } from '../utils/group';
import { apiService } from './api';

// ─── Canonical Grade Bands ── MUST match Admin Panel exactly ──────────────────
export const GRADE_BANDS = [
  { label: 'Kindergarten – 1st Grade',          value: 'Kindergarten – 1st Grade',          band: 'Band 1' },
  { label: '2nd – 3rd Grade',                   value: '2nd – 3rd Grade',                   band: 'Band 2' },
  { label: '4th – 5th Grade',                   value: '4th – 5th Grade',                   band: 'Band 3' },
  { label: 'Middle School (6th, 7th & 8th Grade)', value: 'Middle School (6th, 7th & 8th Grade)', band: 'Band 4' },
];

// Canonical sports
export const SPORTS = ['Flag Football', 'Soccer', 'Cheer', 'Basketball'];

// Map grade band value → Band key
export function gradeBandToBandKey(gradeBand: string): string {
  const match = GRADE_BANDS.find(g => g.value === gradeBand || g.label === gradeBand);
  if (match) return match.band;
  
  // Backward compatibility for safe mappings
  if (gradeBand === 'K - 1st Grade') return 'Band 1';
  if (gradeBand === '7th - 8th Grade') return 'Band 4';
  
  return 'Band 1'; // Default fallback
}

/**
 * Utility to match stored grade values (including legacy/flagged) against new filter values.
 */
export function isGradeMatch(storedGrade: string | undefined, filterGrade: string): boolean {
  if (!storedGrade) return false;
  if (storedGrade === filterGrade) return true;

  // Safe Exact Mappings
  if (filterGrade === 'Kindergarten – 1st Grade' && storedGrade === 'K - 1st Grade') return true;
  if (filterGrade === 'Middle School (6th, 7th & 8th Grade)' && storedGrade === '7th - 8th Grade') return true;

  // Flagged/Legacy records that don't have an automatic mapping remain as is
  // and will only match if the filter matches them exactly (which shouldn't happen 
  // with the new 4-band filter) or if we add specific fallback logic here.
  
  return false;
}

export interface RegistrationData {
  parentFirstName: string;
  parentLastName: string;
  firstName?: string;
  lastName?: string;
  email: string;
  password?: string;
  phone: string;          // stored as digits only, e.g. "2027013900"
  sport: string;          // primary sport (first student's sport or comma-joined)
  membershipType: 'paid' | 'free';
  smsConsent?: boolean;
  students: {
    firstName: string;
    lastName: string;
    gradeBand: string;    // e.g. "K / 1st Grade"
    schoolName: string;
    sports: string[];     // multi-select
    ageGroup?: string;
    sport?: string;       // backward compat
  }[];
  expoPushTokens?: string[];
}

function validateRegistrationData(data: RegistrationData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.parentFirstName.trim()) errors.push('Parent first name is required');
  if (!data.parentLastName.trim()) errors.push('Parent last name is required');
  if (!data.email.trim()) errors.push('Email is required');
  if (!data.password?.trim()) errors.push('Password is required');
  if (!data.phone.trim()) errors.push('Phone is required');

  if (data.students.length === 0) {
    errors.push('At least one student is required');
  } else {
    data.students.forEach((student, index) => {
      if (!student.firstName.trim()) errors.push(`Student ${index + 1}: first name is required`);
      if (!student.lastName.trim()) errors.push(`Student ${index + 1}: last name is required`);
      if (!student.gradeBand) errors.push(`Student ${index + 1}: grade band is required`);
      if (!student.schoolName.trim()) errors.push(`Student ${index + 1}: school is required`);
    });
  }

  return { valid: errors.length === 0, errors };
}

export async function registerMember(data: RegistrationData): Promise<{ success: boolean; error?: string; memberId?: string }> {
  try {
    const validation = validateRegistrationData(data);
    if (!validation.valid) {
      return { success: false, error: validation.errors.join(', ') };
    }

    const students: Student[] = data.students.flatMap(student => {
      const schoolName = student.schoolName.trim();
      const gradeBand = student.gradeBand;
      const bandKey = gradeBandToBandKey(gradeBand);
      
      // Ensure at least one sport entry even if none selected
      const sports = (student.sports && student.sports.length > 0) 
        ? student.sports 
        : (data.sport ? [data.sport] : ['General']); 

      // Create one student record per sport (for group assignment)
      return sports.map(sport => {
        const finalSport = sport || 'General';
        const groupId = generateGroupId(schoolName, gradeBand, finalSport);
        return {
          firstName: student.firstName.trim(),
          lastName: student.lastName.trim(),
          grade: gradeBand,
          grade_band: bandKey,
          school_name: schoolName,
          dob: '',
          ageGroup: bandKey,
          sport,
          groupId: groupId || '',
          sports,
        };
      });
    });

    // Deduplicate (keep unique student×school×sport combos but one record per student if same school/sport)
    const primarySport = data.students[0]?.sports?.[0] || data.sport || '';

    const memberData: Omit<Member, 'createdAt'> = {
      firstName: data.parentFirstName.trim(),
      lastName: data.parentLastName.trim(),
      email: data.email.trim(),
      phone: data.phone.trim(),
      location: '',
      sport: primarySport,
      membershipType: data.membershipType,
      registrationSource: 'mobile',
      students,
      smsConsent: data.smsConsent ?? false,
    };

    if (data.expoPushTokens && data.expoPushTokens.length > 0) {
      memberData.expoPushTokens = data.expoPushTokens;
    }

    const requestPayload: any = {
      ...memberData,
      password: data.password,
    };

    const response = await apiService.registerMember(requestPayload);

    if (!response.success && !response.memberId) {
      throw new Error(response.error || 'API Registration failed');
    }

    return { success: true, memberId: response.data?.memberId || response.memberId };
  } catch (error) {
    if (__DEV__) console.error('Registration error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Registration failed',
    };
  }
}
