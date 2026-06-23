**_Disclaimer: This is not an official Google solution._**

# Dolphin 2.0 - Quick & Easy Waterfall 🚀

**Author:** Ahmad Karkouti

## Overview

Dolphin 2.0 is a dashboard built on top of the **AdMob Write API** and publicly available 3rd party APIs. It allows publishers to **automate their AdMob & 3rd party waterfall calls in AdMob Mediation**.

Dolphin 2.0 provides three main functionalities:

- **Create** waterfall ad units & mediation group lines
- **Update** floors in waterfall mediation group lines
- **Delete** waterfall mediation group lines

## Supported Networks 🌐

- AdMob Network Waterfall
- Pangle
- LiftOff
- InMobi
- Chartboost
- Mintegral

## Requirements ✅

To use Dolphin, publishers must meet the following requirements:

- Be **allow-listed** to use the AdMob Write API
- Have **API access** to each available desired network

## Configuration ⚙️

The publisher must set their credentials for each desired API in the **credentials tab** of the Dolphin 2.0 dashboard to configure the network.

The credentials are stored locally in the publisher’s browser in **local storage**. Should the partner want to delete their credentials, simply clear the cache of the browser or unconfigure the network from the configuration tab of the Dolphin 2.0 dashboard.

## Create Waterfall Ad Units ✨

To create a waterfall ad unit, publishers must provide the following information:

- Select the desired **Ad Network**
- **Mediation Group Name**
- **eCPM Floor**

Once a waterfall ad unit has been created, it is mapped to a primary ad unit. This allows publishers to control which ad units are shown in a waterfall.

## Update Waterfall Mediation Group Lines 📈

To update a waterfall mediation group line, publishers must provide the following information:

- Select the desired **waterfall line**
- **eCPM Floor**

The floor price is the minimum amount publishers are willing to accept for an ad impression.

## Contact Information 📧

If you have any questions about Dolphin 2.0, please reach out to your **Account Manager**.

---

## Run the code locally 💻

### Access Dolphin Code

### Installing ReactJS

1.  **Install the LTS version of Node.js.**
    To check if Node.js was installed successfully, in your terminal:

    ```bash
    node --version
    npm --version
    ```

    This will return your Node.js and NPM versions.

2.  **Install React**
    - On Mac:
      ```bash
      npm install --save react react-dom
      ```
    - On Windows:
      ```bash
      npm install -g create-react-app
      ```

### Getting your Google Cloud Project ID ☁️

1.  Head to your Firebase console.
2.  Select your project.
3.  Open the Project Settings.
4.  Copy your **Project ID**.

### Creating your OAuth 2.0 Client ID 🔑

1.  Head to `https://console.cloud.google.com/apis/credentials?project=<Cloud_Project_ID>` (replace `<Cloud_Project_ID>` with your actual Project ID).
2.  Create a new OAuth 2.0 Client ID.
    - **Application Type:** Web Application
    - Under **Authorized JavaScript origins**:
      - Add the URLs that were copied from Firebase Hosting.
      - Add `http://localhost` & `http://localhost:3000` if you plan on hosting the dashboard locally.
3.  Click **Create**.
4.  Copy your newly created **Client ID**.

### Building the project 🏗️

1.  Head to `src/util/auth/AuthProvider.tsx` from the dashboard code.
2.  Replace `<YOUR_CLIENT_ID>` with your client ID.
3.  Save your Files.
4.  On your terminal in your project root folder, install the Node Package Modules:
    ```bash
    npm install
    ```
5.  Build the code:
    ```bash
    npm run build
    ```
6.  Run the code locally:
    ```bash
    npm start
    ```
7.  Access the Dolphin dashboard by visiting `http://localhost:3000`.

## Deploying using Firebase Hosting 🚀

### Getting your Firebase Hosting URL

1.  Head to the Firebase Hosting page on your Firebase Console.
2.  Click **Get Started**, click next until you reach the dashboard page.

### Installing Firebase CLI

1.  On your terminal, Install the Firebase CLI:
    ```bash
    npm install -g firebase-tools
    ```
2.  Login to your Firebase CLI:
    ```bash
    firebase login
    ```
3.  Initialize your Firebase CLI in your project’s root folder:
    ```bash
    firebase init
    ```
    - Select **Hosting**: Configure files for Firebase Hosting and (optionally) set up GitHub Action deploys.
    - Select **Use an existing project**.
    - Input your Google Cloud Project ID.
    - What do you want to use as your public directory?
      - Type the word “build”
      - Click Enter
    - Configure as a single-page app (rewrite all urls to /index.html)?
      - Type “y”
    - Set up automatic builds and deploys with GitHub?
      - Type “N”

### Deploying the dashboard

```bash
firebase deploy
```

That's it! Hope you enjoy using Dolphin 2.0 🎉
