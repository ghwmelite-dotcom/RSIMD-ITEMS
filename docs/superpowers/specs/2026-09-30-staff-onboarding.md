# Staff onboarding and Staff ID/PIN

Admins download an Excel staff roster, enter Staff ID, full name, staff category (Technician/Officer), system access (Member/Report officer), optional email/phone, preview validation and create accounts atomically. Template has instructions and an example outside imported rows. Fifty staff per file. No PINs in the input roster. Per the user's instruction, initial PINs are the last four numeric digits of each Staff ID, preserving leading zeros. Staff IDs must contain at least four digits. These initial PINs are never logged or persisted as plaintext. Repeat identical staff rows are skipped; conflicting existing identities fail without changes. Bulk import cannot grant admin access.

Separate participation category from permissions: existing internal technician role is Member; lead is Report officer; admin unchanged. Both staff categories may participate. Report officers retain existing report privileges; quarter assignments are a separate workflow. No deputy/reviewer/approver hierarchy is introduced.

Staff ID/PIN becomes primary login, matching the SmartGate interaction but not sharing credentials or databases. Normalize Staff IDs as text (preserve leading zeros), uppercase and trim; unique index. Existing users without a Staff ID may use their original email/PIN until an admin assigns the ID. Do not infer or invent Staff IDs. Disable public self-registration.

Staff can opt out of changing their initial PIN. First login offers Keep my current PIN or Set a new PIN. Either action verifies the current PIN and records the choice. Current account state and session version are checked on every authenticated request; reset/deactivation/permission changes revoke old sessions. Login and PIN actions use atomic D1 throttling. Existing bcrypt hashes remain valid; new PIN hashes use PBKDF2/WebCrypto.

Additive migration only: staff_id, staff_category, must_change_pin, session_version and a throttling table. Preserve technician primary keys and all report/maintenance references. Track migration through the existing GitHub workflow. Test migration from the frozen previous schema as well as fresh schema parity.

Verification: input validation, authorization, no partial writes, duplicate replay/conflicts, leading zeros, legacy login, inactive users, PIN lockout, optional keep/change preference, session revocation, no hash leakage; browser admin import and first login; typechecks/builds; GitHub deployment and public health checks. Never create test staff in production.
