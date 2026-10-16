import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_APIKEY,
    authDomain: "interviewai-46946.firebaseapp.com",
    projectId: "interviewai-46946",
    storageBucket: "interviewai-46946.firebasestorage.app",
    messagingSenderId: "700755404455",
    appId: "1:700755404455:web:cc9a29a4b4762aa2989d82"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const provider = new GoogleAuthProvider();

export { auth, provider };