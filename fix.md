How to Deploy a Full-Stack Application on Vercel
#
vercel
#
react
#
node
#
vite
In this article, I will guide you step by step on how to deploy a full-stack application using Vercel.

You can check the actual deployed project at the bottom of this article under the reference section.

Prerequisites
Before you start deploying, please ensure that you meet the following requirements:

You have a repository on GitHub, with separate frontend and backend folders
The connection between the frontend, backend, and the database is confirmed in the testing environment
Deploying the Backend to Vercel
Let's start by deploying the backend.

Step 1. Log in to Vercel
First, log in to Vercel or sign up if you haven't already.
vercel dashboard

Step 2. Add a New Project
Click the "Add New..." button in the red box and select "Project" from the dropdown.

Import an existing project from GitHub. If the target repository is displayed, select the "Import" button in the red box.

🚨If the target repository is not found, you may need to adjust the GitHub access settings. You can change the settings via the "Adjust GitHub App Permissions" link in the green box.
vercel import

How to Adjust GitHub Repository Access Settings
Click the "Adjust GitHub App Permissions" link, select where to import from.
install vercel

On the GitHub settings page, select the target repository from the "Repository access" dropdown and click Save. It should now appear in the Import list on Vercel.
repository access

Step 3. Configure the Project
Once the import is complete, configure the project.
Confiture project

Project Name:
It’s a good idea to add "backend" or "server" at the end of the project name.
(Example: "my-project-backend", "my-project-server", etc.)

A domain will be created using the name you set here plus ".vercel.app".
(Example: my-project-api.vercel.app, my-project-server.vercel.app, etc.)

Framework Preset:
Select "Others" from the dropdown.

Root Directory:
Click the "Edit" button and select the backend directory.
root directory

Build and Output Settings:
No settings are required here, but you can add any if needed.

Environment Variables:
Add the necessary environment variables here. (Note: PORT is not required.)
Environment Variables

Deploy:
Once these settings are complete, click the "Deploy" button.

Step 4. Configure vercel.json
After deployment, add a vercel.json file to the root of the backend folder with the following content:

{
    "builds": [
        {
            "src": "*.js",
            "use": "@vercel/node"
        }
    ],
    "routes": [
        {
            "src": "/(.*)",
            "dest": "/"
        }
    ]
}
ℹ️ For TypeScript, specify it to read the compiled JS files. (In the example below, the TypeScript output directory ("outDir") is set to ./dist.)

{
  "builds": [
    {
      "src": "dist/server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "dist/server.js"
    }
  ]
}
Step 5. Confirm Server Access
Check if you can access the deployed server. You can verify this from the "Domains" URL.
domain link

If the content of the file is displayed or if you see "Cannot GET /" on the page like this, it was successful! 🎉🎉🎉

🚨 If you get a 404 error, there might be an issue with the vercel.json settings, so make sure the specified paths are correct.
404error

Deploying the Frontend to Vercel
Proceed with the frontend deployment in the same way as the backend.

Step 1: On the Vercel dashboard, click the "Add New..." button and select "Project."

Step 2: Import the target project.

Step 3: In the project settings, configure the following:

Project Name: Set a name like "my-project".
Framework Preset: Select "Vite" (or "Create React App" if using React only).
Root Directory: Select the frontend directory, such as client.
Environment Variables: Add any necessary variables.
Deploy: Click the "Deploy" button.
Step 4: Verify by accessing the deployed page. If the site is displayed correctly and the connection to the backend is confirmed, you're done! 🎉🎉🎉

Conclusion
That’s it for deploying a full-stack application using Vercel. If things don’t work as expected, double-check your settings and environment variables.

supplement
Reference Video


This video uses MongoDB, so if you're working on a MERN stack project, it might be more relevant.

ℹ️ Note: The video mentions "version": 2 in the vercel.json settings, but the Vercel documentation advises against using the "version" property.

Deployed Project
The project introduced in this article has been deployed and verified using the following tech stack:

Frontend: Vite + React + TypeScript
Backend: Express (Node.js) + TypeScript
Database: Neon (PostgreSQL)
Note: You can use other databases like MongoDB as well.

Repository Structure Example:

├── server             # Backend folder
│   ├── dist           # TypeScript output
│   ├── controllers
│   ├── models
│   ├── routers
│   ├── services
│   └── server.ts
├── client             # Frontend folder
│   ├── src
│   │   ├── components
│   │   ├── utils
│   │   ├── App.tsx
│   │   ├── index.tsx 
│   │   ├── styles
│   │   └── ...
└── package.json