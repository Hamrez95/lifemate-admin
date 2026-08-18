LifeMate Command Center — Windows test build

Run:
1. Extract the ZIP to a normal local folder.
2. Double-click LifeMateCommandCenter.exe.
3. Microsoft Edge opens as a standalone app window while the Command Center server runs only on 127.0.0.1.
4. Close the standalone window to stop the local server.

Security notes:
- This package contains only public Supabase configuration (project URL, publishable key, Admin API URL).
- It does not contain a Supabase service-role key, database URL/password, Vault secret, or other privileged credential.
- Privileged Admin operations remain behind the server-side lifemate-admin-api boundary with MFA/AAL2 and RBAC enforcement.
- The local Next.js server is loopback-only and is not exposed to the LAN.
- The existing PWA service worker remains restricted from caching authenticated pages, API traffic, or operator data.

Test-build note:
This artifact is intentionally unsigned to keep testing cost-free. Windows SmartScreen may show an unknown-publisher warning. Do not redistribute this test build as a production release; production distribution should be code-signed.
