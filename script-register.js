// script-register.js

import { app, db } from './firebase-config.js';
import { getAuth, createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { setDoc, doc } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

const auth = getAuth(app);
const registroForm = document.getElementById('registro-form');

registroForm.addEventListener('submit', async e => {
  e.preventDefault();

  const nombre = document.getElementById('nombre').value.trim();
  const email  = document.getElementById('email').value.trim();
  const pass   = document.getElementById('password').value;
  const rol    = document.getElementById('rol').value;

  try {
    const { user } = await createUserWithEmailAndPassword(auth, email, pass);

    // 1) Crear documento en usuarios/{uid}
    await setDoc(doc(db, "usuarios", user.uid), {
      nombre,
      correo: email,
      rol
    });

    // 2) Si es alumno, inicializar Firestore con la estructura nueva
    if (rol === "alumno") {
      await setDoc(doc(db, "residencias", user.uid), {
        estudianteNombre: nombre,

        // Array vacío de asesores (se llenará desde el panel del Ejecutivo)
        asesores: [],

        anteproyecto: {
          url: "",
          evaluacionesDocente: {},
          adminEstado: "pendiente",
          adminObs: ""
        },

        reporteParcial: {
          url: "",
          evaluacionesDocente: {},
          adminEstado: "pendiente",
          adminObs: ""
        },

        proyectoFinal: {
          url: "",
          evaluacionesDocente: {},
          adminEstado: "pendiente",
          adminObs: ""
        }
      });
    }

    alert("Registro exitoso. Ahora inicia sesión.");
    window.location.href = "login.html";

  } catch (err) {
    console.error(err);
    alert("Error al registrar: " + err.message);
  }
});
