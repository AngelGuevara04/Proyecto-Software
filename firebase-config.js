// Configuración de Firebase
import { initializeApp }  from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js';
import { getFirestore }   from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';
import { getStorage }     from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-storage.js';

const firebaseConfig = {
  apiKey: "AIzaSyCIU4fwzGijwNTkdieKW8Q60fMbn3rrwvg",
  authDomain: "ingenova-6da56.firebaseapp.com",
  databaseURL: "https://ingenova-6da56-default-rtdb.firebaseio.com",
  projectId: "ingenova-6da56",
  storageBucket: "ingenova-6da56.appspot.com",
  messagingSenderId: "255346301463",
  appId: "1:255346301463:web:35c7325c09ab634876da52",
  measurementId: "G-H3FLH6S41Y"
};

const app     = initializeApp(firebaseConfig);
const db      = getFirestore(app);
const storage = getStorage(app);

export { app, db, storage };
