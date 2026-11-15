# Firebase Admin Authentication Setup

Admin sign-in now uses Firebase Authentication email/password accounts. The server verifies each Firebase ID token and authorizes requests only when its signed custom claims contain an administrator role.

## One-time setup

1. Enable **Email/Password** in Firebase Authentication and create the administrator account(s) in the Firebase Console.
2. Configure server-only environment variables in the deployment environment:
   - `FIREBASE_ADMIN_PROJECT_ID`
   - `FIREBASE_ADMIN_DATABASE_URL`
   - `FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON`, or Application Default Credentials
3. From a trusted local environment, provision a role using the Firebase user's UID:

   ```powershell
   $env:FIREBASE_ADMIN_PROJECT_ID = "your-project-id"
   $env:FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON = Get-Content .\service-account.json -Raw
   node scripts/grant-firebase-admin-role.mjs <firebase-uid> super_admin
   ```

   Do not commit the service-account file, put its contents in a `NEXT_PUBLIC_` variable, or paste it into chat. Rotate any credentials that were previously embedded in browser code.
4. Sign in again in the application so Firebase issues a token with the new claims.
5. For mapped APIs that need secrets, set each referenced `GAME_API_SECRET_*` variable only in the server deployment environment.

The provisioning command grants the chosen role and its platform permissions. `super_admin` can perform every defined platform action. `admin` receives the operational permissions except deletion, audit-log access, and user-availability management.

## Administrator roles and account creation

After a `super_admin` account is provisioned, use **Admin → Admin Accounts** to create additional Firebase Authentication users and assign one of these roles:

- `super_admin`: all defined platform permissions and administrator-account management.
- `admin`: operational platform permissions, without deletion, audit-log access, or user-availability management.
- `viewer`: read-only panel access. Platform API permissions are limited to viewing games and audit logs.

The account-creation endpoint is restricted to `super_admin` and assigns the custom role claims server-side. Initial passwords must be at least 12 characters and should be shared with the account holder through a secure channel.

Viewer mode disables panel controls and platform mutation APIs reject viewer claims. This does not replace Firebase Realtime Database security rules: for every client-writable path, update its existing `.write` condition to deny viewer claims while preserving the path's other authorization checks. For example, a user-owned path can use:

```json
".write": "auth != null && $uid === auth.uid && auth.token.role !== 'viewer'"
```

For admin-only client-writable paths, explicitly allow only the roles that should write there. Do not rely on disabled UI controls as a security boundary.

## Realtime Database access

New platform data is stored under `platformCatalog`. Merge this rule into the existing Realtime Database rules (do not replace unrelated rules):

```json
{
  "platformCatalog": {
    ".read": false,
    ".write": false,
    "predictions": {
      "$gameId": {
        "$sessionId": {
          ".indexOn": ["publishedAt"]
        }
      }
    },
    "auditLogs": {
      ".indexOn": ["requestedAt"]
    }
  }
}
```

The application accesses this private branch through Firebase Admin on the server. Public game catalogs and manual predictions are returned through sanitized application endpoints. Review the deployed rules in Firebase Console; no deployed rules file is present in this repository.

## Migration notes

- The previous browser-local admin sessions and local-only credentials are no longer accepted.
- Existing local admin records are not Firebase Auth accounts and do not migrate automatically.
- Until server credentials and a Firebase admin claim are configured, admin sign-in and protected platform APIs fail closed.
