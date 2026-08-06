import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCRsi7fMAsoz9mJ5nTloZF-vxiv0o0cpHE",
  authDomain: "spaceforge-69fc6.firebaseapp.com",
  projectId: "spaceforge-69fc6",
  storageBucket: "spaceforge-69fc6.firebasestorage.app",
  messagingSenderId: "915469438241",
  appId: "1:915469438241:web:37b9afbae8b6ad8b4a4260",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
