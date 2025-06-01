// script-alumno.js

import { app, db } from './firebase-config.js';
import { 
  getAuth, 
  onAuthStateChanged, 
  signOut 
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { 
  doc, 
  getDoc, 
  updateDoc 
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';
import { uploadPdf } from './storage-helper.js';

const auth = getAuth(app);

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    // Si no hay usuario logueado, redirigimos a login
    return window.location.href = 'login.html';
  }

  const uid = user.uid;

  // 1. Verificar que el usuario tenga rol = 'alumno' en Firestore
  const perfilSnap = await getDoc(doc(db, 'usuarios', uid));
  if (!perfilSnap.exists() || perfilSnap.data().rol !== 'alumno') {
    alert('Acceso denegado: solo alumnos pueden subir documentos.');
    await signOut(auth);
    return window.location.href = 'login.html';
  }

  // 2. Referencia al documento "residencias/{uid}" en Firestore
  //    (Asumimos que dicho documento ya existe.
  //     Si aún no lo creaste, usa el código de subir-documentos.js)
  const resRef = doc(db, 'residencias', uid);

  // 3. BOTÓN de Cerrar Sesión
  document.getElementById('logout-button')
    .addEventListener('click', async () => {
      await signOut(auth);
      window.location.href = 'login.html';
    });

  // 4. FORMULARIO de Anteproyecto
  document.getElementById('form-anteproyecto')
    .addEventListener('submit', async (e) => {
      e.preventDefault();

      const file = document.getElementById('archivo').files[0];
      if (!file) {
        return alert('Debes seleccionar un PDF de anteproyecto.');
      }

      try {
        // Subir el PDF a Supabase (ruta: anteproyectos/{uid}.pdf)
        const url = await uploadPdf(file, `anteproyectos/${uid}.pdf`);

        // Actualizar Firestore
        await updateDoc(resRef, {
          anteproyecto: {
            url: url,
            docente: 'pendiente',
            admin: 'pendiente',
            obsDocente: '',
            obsAdmin: ''
          }
        });

        alert('Anteproyecto subido correctamente.');
      } catch (error) {
        console.error(error);
        alert('Error al subir anteproyecto: ' + error.message);
      }
    });

  // 5. FORMULARIO de Reporte Parcial
  document.getElementById('form-reporte')
    .addEventListener('submit', async (e) => {
      e.preventDefault();

      const file = document.getElementById('reporte').files[0];
      if (!file) {
        return alert('Debes seleccionar un PDF de reporte parcial.');
      }

      try {
        // Subir el PDF a Supabase (ruta: reportes/{uid}.pdf)
        const url = await uploadPdf(file, `reportes/${uid}.pdf`);

        // Actualizar Firestore
        await updateDoc(resRef, {
          reporteParcial: {
            url: url,
            docente: 'pendiente',
            admin: 'pendiente',
            obsDocente: '',
            obsAdmin: ''
          }
        });

        alert('Reporte parcial subido correctamente.');
      } catch (error) {
        console.error(error);
        alert('Error al subir reporte: ' + error.message);
      }
    });

  // 6. FORMULARIO de Proyecto Final
  document.getElementById('form-final')
    .addEventListener('submit', async (e) => {
      e.preventDefault();

      const file = document.getElementById('final').files[0];
      if (!file) {
        return alert('Debes seleccionar un PDF de proyecto final.');
      }

      try {
        // Subir el PDF a Supabase (ruta: finales/{uid}.pdf)
        const url = await uploadPdf(file, `finales/${uid}.pdf`);

        // Actualizar Firestore
        await updateDoc(resRef, {
          proyectoFinal: {
            url: url,
            docente: 'pendiente',
            admin: 'pendiente',
            obsDocente: '',
            obsAdmin: ''
          }
        });

        alert('Proyecto final subido correctamente.');
      } catch (error) {
        console.error(error);
        alert('Error al subir proyecto final: ' + error.message);
      }
    });

  // 7. (Opcional) Mostrar enlaces existentes en la UI
  //    Si ya hay URLs guardadas en Firestore, puedes inyectarlas en un <a>:
  //
  // const resSnap = await getDoc(resRef);
  // if (resSnap.exists()) {
  //   const data = resSnap.data();
  //   if (data.anteproyecto?.url) {
  //     document.getElementById('link-anteproyecto').href = data.anteproyecto.url;
  //     document.getElementById('link-anteproyecto').textContent = 'Ver anteproyecto';
  //   }
  //   if (data.reporteParcial?.url) {
  //     document.getElementById('link-reporte').href = data.reporteParcial.url;
  //     document.getElementById('link-reporte').textContent = 'Ver reporte';
  //   }
  //   if (data.proyectoFinal?.url) {
  //     document.getElementById('link-final').href = data.proyectoFinal.url;
  //     document.getElementById('link-final').textContent = 'Ver proyecto final';
  //   }
  // }
});
