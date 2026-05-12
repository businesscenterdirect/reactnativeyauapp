// DEV mode check for safe logging
const DEV = __DEV__;

// Normalize string for consistent groupId generation
export const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Keep spaces, numbers, letters, and hyphens
    .replace(/\s+/g, '_')       // Replace spaces with underscores
    .replace(/-+/g, '_');        // Replace hyphens with underscores
};

export const toGroupId = (school: string, gradeBand: string, sport: string): string => {
  const normSchool = normalizeString(school);
  const normGrade = normalizeString(gradeBand);
  const normSport = normalizeString(sport);
  
  return `${normSchool}_${normGrade}_${normSport}`;
};

export const getGradeBand = (grade: string): string | null => {
  if (!grade) {
    if (DEV) console.error('getGradeBand: Grade is empty');
    return null;
  }
  
  const g = grade.toLowerCase().trim();
  
  // Try to extract numeric grade first
  const gradeNum = parseInt(g.replace(/[^0-9]/g, ''));
  
  if (!isNaN(gradeNum)) {
    if (gradeNum <= 1) return 'Kindergarten – 1st Grade';
    if (gradeNum <= 3) return '2nd – 3rd Grade';
    if (gradeNum <= 5) return '4th – 5th Grade';
    if (gradeNum <= 8) return 'Middle School (6th, 7th & 8th Grade)';
  }
  
  // Fallback to string matching for grades like "Kindergarten", "Pre-K"
  if (g.includes('k') || g.includes('kindergarten') || g.includes('pre')) return 'Kindergarten – 1st Grade';
  if (g.includes('1')) return 'Kindergarten – 1st Grade';
  if (g.includes('2') || g.includes('3')) return '2nd – 3rd Grade';
  if (g.includes('4') || g.includes('5')) return '4th – 5th Grade';
  if (g.includes('6') || g.includes('7') || g.includes('8')) return 'Middle School (6th, 7th & 8th Grade)';

  if (DEV) console.error('getGradeBand: Invalid grade', { grade });
  return null;
};

export const generateGroupId = (school: string, grade: string, sport: string): string | null => {
  // Validation
  if (!school || !grade || !sport) {
    if (DEV) console.error('generateGroupId: Missing required fields', { school, grade, sport });
    return null;
  }
  
  const band = getGradeBand(grade);
  if (!band) {
    if (DEV) console.error('generateGroupId: Invalid grade', { grade });
    return null;
  }
  
  // Normalize all components
  const normalizedSchool = normalizeString(school);
  const normalizedSport = normalizeString(sport);
  const normalizedBand = normalizeString(band);
  
  // Generate groupId with consistent format
  const groupId = `${normalizedSchool}_${normalizedBand}_${normalizedSport}`;
  
  if (DEV) console.log("Generated groupId:", groupId);
  
  return groupId;
};
