import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

// ─── Firebase Config ──────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCADG-9nm-61nmsHbe-hNlg82g0ccKpjkw",
  authDomain: "yau-app.firebaseapp.com",
  projectId: "yau-app",
  storageBucket: "yau-app.firebasestorage.app",
  messagingSenderId: "696491882997",
  appId: "1:696491882997:web:c191283f1415b8e913c8bc",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ─── Configuration ────────────────────────────────────────────────────────────
const DRY_RUN = false; // SET TO FALSE FOR ACTUAL MIGRATION
const REPORT_PATH = './migration_report.json';

const SAFE_MAPPINGS: Record<string, string> = {
  'K - 1st Grade': 'Kindergarten – 1st Grade',
  '7th - 8th Grade': 'Middle School (6th, 7th & 8th Grade)',
  'Middle School': 'Middle School (6th, 7th & 8th Grade)',
  'Band 1': 'Kindergarten – 1st Grade',
  'Band 2': '2nd – 3rd Grade',
  'Band2': '2nd – 3rd Grade',
  'Band 3': '4th – 5th Grade',
  'Band 4': 'Middle School (6th, 7th & 8th Grade)',
  'Band 5': 'Middle School (6th, 7th & 8th Grade)',
  '3rd - 4th Grade': '4th – 5th Grade',
  '5th - 6th Grade': 'Middle School (6th, 7th & 8th Grade)',
  '1st - 2nd Grade': '2nd – 3rd Grade',
  'High School': 'Middle School (6th, 7th & 8th Grade)', // Assumption: Map remaining outliers to MS or ignore
};

const FLAGGED_VALUES: string[] = [];




const NEW_STANDARDS = [
  'Kindergarten – 1st Grade',
  '2nd – 3rd Grade',
  '4th – 5th Grade',
  'Middle School (6th, 7th & 8th Grade)'
];

// ─── Report Structure ─────────────────────────────────────────────────────────
const report: any = {
  timestamp: new Date().toISOString(),
  dryRun: DRY_RUN,
  summary: {
    totalProcessed: 0,
    updated: 0,
    skipped: 0,
    flagged: 0,
    errors: 0
  },
  details: {
    members: [],
    schedules: [],
    standings: []
  },
  backup: {
    members: [],
    schedules: [],
    standings: []
  }
};

const flaggedRecords: any[] = [];
const updatedRecords: any[] = [];

// ─── Utilities ────────────────────────────────────────────────────────────────
function getMigrationAction(value: string | undefined): { action: 'update' | 'flag' | 'skip', newValue?: string } {
  if (!value) return { action: 'skip' };

  const trimmed = value.trim();

  if (NEW_STANDARDS.includes(trimmed)) {
    return { action: 'skip' };
  }

  if (SAFE_MAPPINGS[trimmed]) {
    return { action: 'update', newValue: SAFE_MAPPINGS[trimmed] };
  }

  return { action: 'flag' }; // Any unknown or old value is flagged
}

async function createBackup() {
  console.log('Creating Backup...');

  const memSnap = await getDocs(collection(db, 'members'));
  report.backup.members = memSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const schedSnap = await getDocs(collection(db, 'schedules'));
  report.backup.schedules = schedSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const standSnap = await getDocs(collection(db, 'standings'));
  report.backup.standings = standSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  fs.writeFileSync('./firestore_backup.json', JSON.stringify(report.backup, null, 2));
  console.log('Backup saved to firestore_backup.json');
}

async function migrateMembers() {
  console.log('Migrating Members...');
  const snapshot = await getDocs(collection(db, 'members'));
  const batch = writeBatch(db);
  let batchCount = 0;

  for (const memberDoc of snapshot.docs) {
    const data = memberDoc.data();
    const students = data.students || [];
    let modified = false;
    const studentChanges: any[] = [];

    const updatedStudents = students.map((s: any, idx: number) => {
      const { action, newValue } = getMigrationAction(s.grade_band);

      if (action === 'update') {
        modified = true;
        report.summary.updated++;
        const change = { collection: 'members', id: memberDoc.id, index: idx, old: s.grade_band, new: newValue, action: 'UPDATE' };
        studentChanges.push(change);
        updatedRecords.push(change);
        return { ...s, grade_band: newValue };
      } else if (action === 'flag') {
        report.summary.flagged++;
        const change = { collection: 'members', id: memberDoc.id, index: idx, old: s.grade_band, action: 'FLAG' };
        studentChanges.push(change);
        flaggedRecords.push(change);
        return s;
      } else {
        report.summary.skipped++;
        return s;
      }
    });

    if (modified && !DRY_RUN) {
      batch.update(doc(db, 'members', memberDoc.id), { students: updatedStudents });
      batchCount++;
    }

    if (studentChanges.length > 0) {
      report.details.members.push({
        id: memberDoc.id,
        parent: `${data.firstName} ${data.lastName}`,
        changes: studentChanges
      });
    }
    report.summary.totalProcessed++;
  }

  if (batchCount > 0 && !DRY_RUN) {
    await batch.commit();
    console.log(`Committed updates for ${batchCount} members.`);
  }
}

async function migrateSchedules() {
  console.log('Migrating Schedules...');
  const snapshot = await getDocs(collection(db, 'schedules'));
  const batch = writeBatch(db);
  let batchCount = 0;

  for (const scheduleDoc of snapshot.docs) {
    const data = scheduleDoc.data();
    const { action, newValue } = getMigrationAction(data.grade_band);

    if (action === 'update') {
      report.summary.updated++;
      const change = { collection: 'schedules', id: scheduleDoc.id, old: data.grade_band, new: newValue, action: 'UPDATE' };
      report.details.schedules.push(change);
      updatedRecords.push(change);
      if (!DRY_RUN) {
        batch.update(doc(db, 'schedules', scheduleDoc.id), { grade_band: newValue });
        batchCount++;
      }
    } else if (action === 'flag') {
      report.summary.flagged++;
      const change = { collection: 'schedules', id: scheduleDoc.id, old: data.grade_band, action: 'FLAG' };
      report.details.schedules.push(change);
      flaggedRecords.push(change);
    } else {
      report.summary.skipped++;
    }
    report.summary.totalProcessed++;
  }

  if (batchCount > 0 && !DRY_RUN) {
    await batch.commit();
    console.log(`Committed updates for ${batchCount} schedules.`);
  }
}

async function migrateStandings() {
  console.log('Migrating Standings...');
  const snapshot = await getDocs(collection(db, 'standings'));
  const batch = writeBatch(db);
  let batchCount = 0;

  for (const standingDoc of snapshot.docs) {
    const data = standingDoc.data();
    const { action, newValue } = getMigrationAction(data.gradeBand);

    if (action === 'update') {
      report.summary.updated++;
      const change = { collection: 'standings', id: standingDoc.id, old: data.gradeBand, new: newValue, action: 'UPDATE' };
      report.details.standings.push(change);
      updatedRecords.push(change);
      if (!DRY_RUN) {
        batch.update(doc(db, 'standings', standingDoc.id), { gradeBand: newValue });
        batchCount++;
      }
    } else if (action === 'flag') {
      report.summary.flagged++;
      const change = { collection: 'standings', id: standingDoc.id, old: data.gradeBand, action: 'FLAG' };
      report.details.standings.push(change);
      flaggedRecords.push(change);
    } else {
      report.summary.skipped++;
    }
    report.summary.totalProcessed++;
  }

  if (batchCount > 0 && !DRY_RUN) {
    await batch.commit();
    console.log(`Committed updates for ${batchCount} standings.`);
  }
}

async function run() {
  try {
    console.log(`Starting Migration (Dry Run: ${DRY_RUN})`);

    // 1. Create Backup
    await createBackup();

    // 2. Run Migration
    await migrateMembers();
    await migrateSchedules();
    await migrateStandings();

    // 3. Save Reports
    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
    fs.writeFileSync('./flagged_records.json', JSON.stringify(flaggedRecords, null, 2));
    fs.writeFileSync('./updated_records.json', JSON.stringify(updatedRecords, null, 2));

    console.log(`\nMigration Complete!`);
    console.log(`Main report: ${REPORT_PATH}`);
    console.log(`Flagged records: ./flagged_records.json`);
    console.log(`Updated records: ./updated_records.json`);

    console.log(`\nSummary:`);
    console.table(report.summary);

    if (DRY_RUN) {
      console.log('\nTHIS WAS A DRY RUN. No data was modified in Firestore.');
    } else {
      console.log('\nPRODUCTION MIGRATION COMPLETE. Changes written to Firestore.');
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

run();
