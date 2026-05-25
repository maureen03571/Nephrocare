import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// TODO: Replace with your actual Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCas8Wcmt6Wsi1cxrVf4iXkJikvChsEqZU",
  authDomain: "nephrocare-77fff.firebaseapp.com",
  projectId: "nephrocare-77fff",
  storageBucket: "nephrocare-77fff.firebasestorage.app",
  messagingSenderId: "73142430372",
  appId: "1:73142430372:web:b61a018b320ce2d0682391",
  measurementId: "G-QW1VVHCX1L"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
