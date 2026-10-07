const firebaseConfig = {
    apiKey: "AIzaSyC-Dcvx06CGjbiqCCXlteLG3IqY3C3x8OE",

    authDomain: "drx-learning-hub.firebaseapp.com",

    projectId: "drx-learning-hub",

    storageBucket: "drx-learning-hub.firebasestorage.app",

    messagingSenderId: "562733337038",

    appId: "1:562733337038:web:2db977c4b545cb1a5f839f",

    measurementId: "G-52EGNHBYF6"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

console.log("Firebase Connected");