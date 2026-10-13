# Spec: CITE Teacher Attendance

## Problem
CITE teachers record attendance on paper, and the office secretary manually checks and transfers those entries into another record. Teachers sometimes forget to sign in, leaving gaps for the secretary to follow up; the time and frequency of this work have not yet been measured.

## Solution
Teachers sign in to individual accounts and scan a changing QR code displayed on the office computer. The app records the scan time automatically: the first scan each workday is time in and the second is time out. The secretary reviews all records and can make a verified correction with a note. The QR refresh interval will be agreed with the office before the trial.

## The user
The CITE office secretary is the primary user, responsible for tracking teacher attendance. CITE teachers use the check-in flow and can see their own records.

## User stories
1. As a teacher, I want to sign in to my own account so that my attendance is linked to me.
2. As a secretary, I want the office computer to display a current QR code so that teachers can scan it when they arrive and leave.
3. As a teacher, I want the app to record the actual scan time so that I do not have to write my attendance on paper.
4. As a teacher, I want to see my own time-in and time-out record so that I can check whether my attendance was recorded.
5. As a secretary, I want to see all teachers’ attendance records so that I can track attendance without copying each paper entry.
6. As a secretary, I want to add or correct a time after verifying the teacher was present, with a note, so that a missed scan can be handled transparently.
7. As a teacher, I want a missing time-out to be labeled clearly and shown as 11:59 PM so that an incomplete record is visible for follow-up.

## Screens
- **Sign in:** Teachers and the secretary sign in with individual email/password accounts; staff accounts and roles are provisioned by the office.
- **Office QR display:** The secretary displays a current QR code on the office computer. It expires and refreshes on an interval the office will decide before the trial.
- **Teacher attendance:** A signed-in teacher scans the office code. The first scan that workday records time in; the second records time out. The page shows that teacher’s own record and labels a missing time-out “Forgot to time out,” displaying 11:59 PM as the default.
- **Secretary attendance:** The secretary sees all teachers’ attendance records and can add or correct a time after verifying the teacher was present. Each correction requires a note.

## Data
- **`profiles`**: `user_id` (matches the Supabase Auth user), `display_name`, `role` (`teacher` or `secretary`). A teacher may read their own profile; the secretary may read all profiles. Staff accounts and roles are provisioned by the office; users cannot change their own role.
- **`attendance_records`**: `id`, `teacher_id`, `work_date`, `time_in`, `time_out`, `time_out_status` (`complete` or `forgot_time_out`), `correction_note`, `corrected_by`, `updated_at`. A teacher may read only their own records; the secretary may read all records. A teacher records a scan only through the validated scan flow, which uses the signed-in account and system timestamp; teachers cannot directly edit timestamps. The secretary may add or correct records only with a correction note.
- **`office_qr_codes`**: `id`, `token`, `created_at`, `expires_at`. The secretary may create and view current codes. Teachers cannot list or manage QR records; a submitted scan is validated against a current code before it changes that teacher’s attendance. Expired codes cannot record attendance.

## Login
Yes. Use Supabase Auth with email and password. The office provisions each teacher and secretary account and assigns the role; public self-registration and self-assigned roles are out of scope.

## Done for the demo
- The app is available on the live URL.
- A teacher and the secretary can sign in to individual accounts with the correct role.
- The office computer displays a current QR code that expires and refreshes at the interval agreed with the office.
- A teacher’s first valid scan records time in and their second valid scan records time out using the system time; expired codes are rejected.
- Teachers can see only their own attendance. The secretary can see all attendance.
- A missing time-out is shown as 11:59 PM and labeled “Forgot to time out.”
- The secretary can add or correct a time after verifying presence, and the record includes a correction note.
- Row Level Security is enabled with explicit role-based policies on every table; no secret key is exposed to the browser.

## Out of scope
- Facial recognition or storing face data.
- Separate attendance records for each class; the MVP records one time-in/time-out pair per teacher per workday.
- Claiming that a QR scan alone proves who physically scanned it. The office must agree on the refresh interval and in-person check-in procedure before the trial.
- Measuring a specific workload reduction target before a baseline has been collected.
