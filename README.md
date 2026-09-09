# Join – Task Manager

Join is a task management application inspired by the Kanban system.
It allows users to create, organize, and manage tasks efficiently using drag-and-drop functionality. Tasks can be assigned to users and categorized for better workflow organization.

## Features

- Create, edit and delete tasks
- Drag & Drop functionality (Kanban board)
- Assign tasks to specific users
- Categorize tasks
- Responsive design
- Firebase backend integration

## Tech Stack

- Angular
- TypeScript
- HTML5
- CSS3
- Firebase (Authentication & Database)

## Kanban Workflow

Tasks are organized into different workflow columns, such as:

- To Do
- In Progress
- Awaiting Feedback
- Done

This structure helps users track the progress of their tasks in a clear and visual way.

## Installation & Setup

To run this project locally:

1. Make sure you have Node.js and the Angular CLI installed globally:

```bash
   npm install -g @angular/cli
```

2. Clone the repository and install dependencies:

```bash
   git clone https://github.com/PatLiCoding/join.git
   cd join
   npm install --legacy-peer-deps
```

   > **Note:** `--legacy-peer-deps` is required because `@angular/fire` currently resolves a peer dependency (`@angular/platform-browser-dynamic`) that conflicts with the latest Angular patch version used in this project. A plain `npm install` will fail with an `ERESOLVE` error.

3. **Set up Firebase before running the app**: The app will not start correctly without this (see [Firebase Configuration](#firebase-configuration) below).

4. Start the local dev server:

```bash
   ng s -o
```

## Firebase Configuration

This project uses Firebase for backend services (Authentication & Firestore). Without this step, the app has no database to connect to and will fail to load correctly. So do this **before** running `ng s -o`.

1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a new (free) project. You can use any name.
2. In your new project, go to **Build -> Authentication** and enable it (e.g. Email/Password sign-in method).
3. Go to **Build -> Firestore Database** and create a database (start in test mode for local development).
4. In the project overview, click the **web icon (`</>`)** to register a new web app. Firebase will show you a `firebaseConfig` object with your project's keys. Keep this page open, you'll need it in the next step.
5. In your local project folder, copy the example environment file:

```bash
   cp src/environments/environment.example.ts src/environments/environment.ts
```

6. Open `src/environments/environment.ts` and replace every placeholder value inside `firebaseConfig` (`YOUR_API_KEY`, `YOUR_PROJECT_ID`, etc.) with the matching value from the `firebaseConfig` object you saw in step 4.
7. Also fill in the `imprint` object with your own legal details (name, address, email). This is used for the app's Impressum/legal notice page and has nothing to do with Firebase, so you won't find these values in the console.
8. Save the file. You're now ready to run `ng s -o`.

`environment.ts` is listed in `.gitignore` and will not be committed. Only `environment.example.ts` is tracked, so the project can be cloned without leaking credentials.
## About the Project

This project was originally developed as a group project as part of a web development training program.
The focus was on building a structured Angular application, working with components, services, routing, and connecting a Firebase backend.

## About This Fork

This repository is a personal fork of the original group project, continued and extended individually by Patricia as part of an IHK (German vocational qualification) final examination submission. Since the fork, the following areas have been substantially reworked or newly implemented:


- File upload for tasks (image picker, base64 storage, compression, image viewer)
- Contact avatar handling and image compression
- Attachment viewing (lightbox, download, drag-and-drop)
- Account management (deletion, guest session handling)
- SCSS architecture and mixins
- General refactoring to meet clean code and documentation standards (TSDoc, method/file length limits)

Commits from this point forward reflect individual work for the exam submission and are not representative of the original group's contributions.

## Authors

**Original group project:** Nadine Wirtgen, Patricia Linne, Frank Meckel and Altin Torba

**Fork / IHK submission:** Patricia Linne
