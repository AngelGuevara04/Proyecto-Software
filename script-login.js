// script-login.js
import { app, db } from './firebase-config.js';
import {
  getAuth,
  signInWithEmailAndPassword
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

const auth = getAuth(app);
const loginForm = document.getElementById('login-form');

loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const pass  = document.getElementById('password').value;

  try {
    const { user } = await signInWithEmailAndPassword(auth, email, pass);
    const snap     = await getDoc(doc(db, "usuarios", user.uid));
    if (!snap.exists()) throw new Error("Usuario no encontrado.");
    const { rol } = snap.data();

    if (rol === "alumno")      window.location.href = "dashboard-alumno.html";
    else if (rol === "docente")   window.location.href = "dashboard-docente.html";
    else if (rol === "ejecutivo") window.location.href = "dashboard-ejecutivo.html";
    else throw new Error("Rol no reconocido.");

  } catch (err) {
    console.error(err);
    alert("Error al iniciar sesión: " + err.message);
  }
});
