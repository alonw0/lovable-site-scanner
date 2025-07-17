# Lovable Site Scanner

This is a Next.js application that allows you to scan a website to determine if it uses Supabase and has any publicly accessible data.

## How to Use

1.  Enter the URL of the website you want to scan in the input field.
2.  Click the "Scan Site" button.
3.  The application will then analyze the website's assets to find Supabase credentials.
4.  If credentials are found, it will attempt to fetch the database schema and any public data.
5.  The results will be displayed on the page.

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