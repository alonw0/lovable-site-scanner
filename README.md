# Lovable Site Scanner

This is a Next.js application that allows you to scan a website to determine if it uses Supabase and what public permissions are available.

## Features

*   **Credential Discovery:** Analyzes a website's assets to find public Supabase credentials (URL and anon key).
*   **Comprehensive Permission Analysis:** For each table found, the scanner checks for the following permissions:
    *   `GET`: Can anonymous users read data?
    *   `POST`: Can anonymous users insert data?
    *   `PATCH`: Can anonymous users update data?
    *   `DELETE`: Can anonymous users delete data?
*   **Safe, Non-Destructive Scanning:** The scanner uses PostgreSQL's `tx=rollback` feature for all write operations (`POST`, `PATCH`, `DELETE`). This means that while the scanner can accurately determine if a permission is available, **no data is ever actually created, updated, or deleted.**
*   **PII Analysis:** The scanner performs a basic regex-based check on any public data to identify potential Personally Identifiable Information (PII) like email addresses or phone numbers.
*   **Collapsible UI:** Presents the results in a clean, easy-to-navigate collapsible interface.

## How to Use

1.  Enter the URL of the website you want to scan in the input field.
2.  Check the box to confirm you have permission to scan the site.
3.  Click the "Scan Site" button.
4.  The results will be displayed on the page.

## Deployment

This application is designed for easy deployment to [Vercel](https://vercel.com/).

### Prerequisites

*   A Vercel account.
*   A GitHub, GitLab, or Bitbucket account.

### Steps

1.  **Push to Git:** Push the code to a repository on your preferred Git provider.

2.  **Import to Vercel:**
    *   Log in to your Vercel account.
    *   Click the "Add New..." button and select "Project".
    *   Import the Git repository you just created.

3.  **Deploy:** Vercel will automatically detect that this is a Next.js application and configure the build settings. Click the "Deploy" button.

Vercel will then build and deploy your application. Once the deployment is complete, you will be provided with a URL where you can access your live site.

## Ethical Use

This tool should only be used for educational purposes and on sites where you have permission to scan. Be responsible and respect the privacy of others.
