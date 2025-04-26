// script-register.js
import { auth, db } from './firebase-config.js';
import { createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { setDoc, doc }                   from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

const registroForm = document.getElementById('registro-form');

registroForm.addEventListener('submit', async e => {
  e.preventDefault();
  const nombre = document.getElementById('nombre').value.trim();
  const email  = document.getElementById('email').value.trim();
  const pass   = document.getElementById('password').value;
  const rol     = document.getElementById('rol').value;

  try {
    // 1) Crear usuario en Auth
    const { user } = await createUserWithEmailAndPassword(auth, email, pass);

    // 2) Guardar en colección "usuarios"
    await setDoc(doc(db, "usuarios", user.uid), {
      nombre, correo: email, rol
    });

    // 3) Crear documento inicial en "residencias"
    await setDoc(doc(db, "residencias", user.uid), {
      estudianteNombre: nombre,
      anteproyectoURL: null,
      anteproyectoEstado: { docente: "pendiente", admin: "pendiente", obsDocente: "", obsAdmin: "" },
      reportes: [],
      proyectoFinal: { url: null, docente: "pendiente", admin: "pendiente", obsDocente: "", obsAdmin: "" },
      asesorId: null
    });

    alert("Registro exitoso. Ahora inicia sesión.");
    window.location.href = "login.html";

  } catch (err) {
    console.error(err);
    alert("Error al registrar: " + err.message);
  }
});
