# Facebook Login Setup Guide

If you are seeing the error **"It looks like this app isn't available"** or **"This app needs at least one supported permission"**, it means your Facebook App in the [Meta for Developers Console](https://developers.facebook.com/apps/) is missing the required configuration for Login.

Adding the Client ID and Secret to Supabase is only half the step. You must also configure the Facebook App itself to allow "Login".

## 1. Check App Mode (Development vs Live)

- **Development Mode**: Only users listed in the **App Roles** (Administrators, Developers, Testers) can log in. Anyone else will see an error.
- **Live Mode**: Anyone can log in, BUT you must have completed "Data Use Checkup" for the requested permissions (`email`, `public_profile`).

**Recommendation**: Keep it in **Development Mode** while testing, and ensure your personal Facebook account is added as an Administrator.

## 2. Configure "Login with Facebook" Use Case

Since 2024, Facebook uses "Use Cases" to manage permissions.

1.  Go to your App Dashboard.
2.  Look for **"Use cases"** in the left sidebar (or "Add Product" if you are on the old UI, and add "Facebook Login").
3.  Click **"Customize"** or **"Edit"** next to **"Authentication and Account Creation"** (or similar).
4.  Ensure that **email** and **public_profile** are listed as permissions.
    - If they are missing, click "Add" and search for them.
    - They should be set to "Ready for testing" (green) or similar.

## 3. Verify Settings

1.  Go to **Facebook Login** > **Settings** in the sidebar.
2.  Ensure **"Client OAuth Login"** is **Yes**.
3.  Ensure your **Valid OAuth Redirect URIs** matches your Supabase URL:
    - `https://avpfabqxnyurhkbbkmvp.supabase.co/auth/v1/callback`
    - (Double check this URL in your Supabase Dashboard -> Authentication -> Providers -> Facebook -> Callback URL).

## 4. Troubleshooting the Error "App needs at least one supported permission"

This specific error means the app has **NO** active use cases or permissions for the type of user trying to log in.

- **Fix**: Go to **App Review** -> **Permissions and Features**.
- Check if `email` and `public_profile` have "Standard Access" (or "Advanced Access").
- For **Live** apps, you usually need "Advanced Access" for `public_profile` and `email` to work for general users.
- In **Development** mode, "Standard Access" is enough, BUT only for App Roles members.

## Summary Checklist

- [ ] App is in **Development Mode** (for now).
- [ ] You are listed as an **Administrator** in "App Roles".
- [ ] You have verified the **Callback URL** in Facebook Login Settings.
- [ ] You have configured the **Authentication** Use Case to include `email`.
