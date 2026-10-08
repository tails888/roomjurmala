# Password recovery

POST /api/password/forgot accepts an administrator email, with same-origin and CSRF validation. Links are random 256-bit tokens in a URL fragment, expire after 30 minutes and are stored only as SHA-256 hashes. Requests are rate-limited and mail is throttled per account. Public responses do not disclose account existence.

POST /api/password/reset rechecks and consumes a token under a SQLite write lock, rotates the account version (invalidating existing sessions), and invalidates all outstanding links for that account. Other accounts and calendar data are unchanged. The user signs in with the new password afterward.

## Hostinger mail delivery

Authenticated SMTP uses smtp.hostinger.com on port 465 with TLS certificate verification, through the pinned PHPMailer library in server/vendor/phpmailer. The sender and SMTP username are welcome@roomjurmala.lv.

The mailbox password belongs in `.roomjurmala-admin/smtp-password.txt`, outside public_html. Enter it directly in Hostinger's private file editor, never in Git or chat. Only trailing line endings are removed. The containing directory is private and the file is set to mode 0600 when read. Deployments preserve this directory. An empty file fails closed. When this file is absent, legacy PHP mail is used; this transport was accepted by the hosting server but delivery to Gmail was not confirmed.

`mail-status.json` in that same private directory records the last transport acceptance or failure without a reset token or password. Transport acceptance alone is not proof of inbox delivery.

Local PHP integration tests set ROOM_TEST_MAIL=1 to capture email in a private outbox without sending it. The flag is ignored outside the local PHP development server.
