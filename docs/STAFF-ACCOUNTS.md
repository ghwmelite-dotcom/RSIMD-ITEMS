# Staff accounts

Open **Administration > Staff accounts > Download staff template**. Fill the **Staff** sheet with each person's official Staff ID, full name and category (Technician or Officer). Email and phone are optional. Keep IDs and phone numbers as text to preserve leading zeros. Each upload accepts up to 50 people.

Choose **Member** for ordinary participation or **Report officer** for report preparation. Category describes the person's work; system access controls permissions. Administrators are assigned individually, not by bulk upload.

Upload the completed workbook, inspect the preview and correct any errors, then select the create-accounts action. Preview does not save accounts. Identical existing records are skipped without resetting their PIN; conflicting records must be resolved using Edit. A private credential workbook is available after creation.

The initial PIN is the last four numeric digits of the Staff ID. For example, `OHCS-120007` starts with `0007`. Staff IDs must contain at least four digits. On first sign-in, enter the current PIN and choose **Save new PIN** (4–6 digits) or **Keep my current PIN**. The system remembers either choice. Internally, `must_change_pin` means this initial preference has not yet been recorded; it does not require a different PIN.

Existing accounts without a Staff ID retain the **Use email instead** login. Assign the official Staff ID through Edit before importing the same person. Their existing PIN remains valid unless the administrator explicitly selects reset. Once the Staff ID is assigned, use it instead of email. These are ITEMS credentials; they are not linked to SmartGate or VMS.

An administrator can reset a PIN to the last four digits of the current Staff ID. This invalidates existing sessions and presents the keep/change choice again. Disabling an account blocks its sessions. Staff ID and access changes also invalidate existing sessions.

Sign-in is limited to 10 attempts per identity and 50 per IP address in a 15-minute window. Wait for the window to expire after a rate-limit response. Credentials are hashed and never included in account listings or audit logs.
