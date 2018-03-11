# nodejs-firebase-export-csv-xml Firebase Functions
App created on nodejs using express which can be create xml and csv files from Firebase Realtime Database and upload them to Firebase Storage when something updating on firebase

## Set up and initialize Firebase SDK for Cloud Functions

Cloud Functions runs Node v.6.11.5, so we recommend that you develop locally with this version.
Once you have Node.js and npm installed, install the Firebase CLI via npm:

```npm install -g firebase-tools```

## To initialize your project:

1. Clone project repository ```git clone repo```.
2. Go to your Firebase project directory.
3. Run ```firebase login``` to log in via the browser and authenticate the firebase tool.
4. Go to functions folder.
5. Run ```npm install```
6. Run this command to deploy your functions: ```firebase deploy --only functions```

