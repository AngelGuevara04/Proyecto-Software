// login.js
import { auth } from './firebase-config.js';
import { signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';

const loginForm = document.getElementById('loginForm');
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    alert(`Bienvenido ${user.displayName || user.email}`);
    window.location.href = "dashboard.html"; // Redirigir al panel principal
  } catch (error) {
    alert('Error al iniciar sesión: ' + error.message);
  }
});
