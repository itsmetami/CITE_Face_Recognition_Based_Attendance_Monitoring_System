# CITE Teacher Attendance — Session 1 Pitch

## The pitch

**The person:** In the CITE office, teachers write their attendance on paper, and the secretary has to check each entry. Some teachers forget to sign in. I have seen this happen, and I have also forgotten to record attendance myself. The secretary confirmed that the manual process is a problem.

**Today:** The secretary checks the paper log and copies attendance into another record. When a teacher misses an entry, the record is incomplete and needs follow-up. We do not yet know exactly how much time this takes or how often entries are missed.

**Our fix:** We want to make a small website using our existing project template. Each teacher signs in to their own account and scans a changing QR code shown on the office computer. The system records the scan time automatically: the first scan is time in and the second is time out. If a teacher forgets to scan out, the system marks the entry and uses 11:59 PM as the default. Teachers see their own attendance, and the secretary can review everyone’s records and make a verified correction with a note.

**The demo:** We will show a teacher signing in, scanning the office QR code, and seeing the attendance time recorded. We will also show the secretary’s view and how a verified correction is marked. The office has agreed to try the system with teachers.

**How we’ll know:** We will compare the time the secretary spends processing attendance before and during the trial. We have not measured the starting workload yet, so we will record that before the trial and see whether the new process reduces it.

## Hard questions

1. **Have you proved this is a big enough problem?** Not yet. The secretary confirmed that the paper process is a problem, but we have not measured the time or error rate. We will record the current processing time and ask the secretary for examples before judging the impact.
2. **Does scanning a QR code prove the teacher is in the office?** Not by itself. A teacher signs in to an account and scans the office’s current code, but a code could potentially be shared while it is active. We still need to agree how often the code changes and how the office will check that the teacher is present.
3. **Why not keep the paper log or use a simpler form?** A digital form could avoid handwriting, but it may not reduce the secretary’s re-entry work or help with missed sign-ins. We will test whether a QR check-in makes the secretary’s work easier before adding more features.
