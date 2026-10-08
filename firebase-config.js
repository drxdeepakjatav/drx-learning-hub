var firebaseConfig = {
  apiKey: "AIzaSyCWZpckA8cwboV6RVHAN57p7b8vXUByKNc",
  authDomain: "drx-learning-hub-2.firebaseapp.com",
  projectId: "drx-learning-hub-2",
  storageBucket: "drx-learning-hub-2.firebasestorage.app",
  messagingSenderId: "748103606890",
  appId: "1:748103606890:web:6ada6d6a8ac94217532013",
  measurementId: "G-ETWXVR01BC"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

var auth = firebase.auth();
var db = firebase.firestore();

console.log("Firebase Connected");