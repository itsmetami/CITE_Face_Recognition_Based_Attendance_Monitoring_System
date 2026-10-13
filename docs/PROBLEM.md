# CITE Teacher Attendance

## Who
The CITE office secretary who tracks teacher attendance, and the CITE teachers whose attendance the secretary records.

## The struggle
Teachers currently write their attendance on paper. The secretary manually checks those entries and transfers them into another record. Teachers sometimes forget to sign in, leaving the secretary with incomplete records to track. The project team has observed this process, and the secretary has confirmed that the manual work is a problem. The time and frequency of errors have not yet been measured.

## Today's workaround
Teachers use a paper-and-pen log. The secretary checks the log and re-enters the information into a spreadsheet or other office record. When a teacher forgets to record attendance, the record needs follow-up.

## The MVP
A teacher signs in to an individual account and scans a changing QR code displayed on the office computer. The first scan each workday records time in; the second records time out. The system uses the scan time automatically. If no time-out scan is recorded, it sets time out to 11:59 PM and labels the entry “Forgot to time out.” Teachers can see their own records. The secretary can see all records and add or correct a time after verifying the teacher was present, with a note explaining the correction.

## How we'll know it worked
The office has agreed to try a digital attendance system. The secretary and a small group of teachers will try the MVP. The team will compare how long the secretary spends processing attendance before and during the trial. The baseline has not been measured yet, so the trial should record it before the new system is used.

## Out of scope
- Facial recognition or storing face data.
- Separate attendance records for each class; the MVP records one time-in/time-out pair per teacher per workday.
- Claiming that a QR scan alone proves who physically scanned it. The office QR refresh interval and in-person check-in procedure still need to be agreed before the trial.

## Glossary
- **Time in**: The timestamp of a teacher's first QR scan that workday.
- **Time out**: The timestamp of the teacher's second QR scan that workday, or 11:59 PM with a “Forgot to time out” label if no second scan is recorded.
- **Correction**: A time added or changed by the secretary after verifying the teacher's presence, with a note explaining the change.
- **Changing QR code**: The code displayed on the office computer for teachers to scan. How often it changes is not yet decided.
