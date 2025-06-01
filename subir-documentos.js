// subir-documentos.js

import { app, db } from './firebase-config.js';
import { 
  getAuth, 
  onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { 
  doc, 
  setDoc 
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';
import { uploadPdf } from './storage-helper.js';

const auth = getAuth(app);

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    // Si no hay usuario logueado, redirigimos a login
    return window.location.href = 'login.html';
  }

  // En tu HTML, en esta página debes tener:
  // <form id="subir-form">
  //   <input type="file" id="anteproyecto" accept="application/pdf" required />
  //   <input type="file" id="proyecto-final" accept="application/pdf" required />
  //   <button type="submit">Crear residencias</button>
  // </form>

  const form = document.getElementById('subir-form');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const anteproyectoFile = document.getElementById('anteproyecto').files[0];
    const finalFile       = document.getElementById('proyecto-final').files[0];

    let anteUrl = null;
    let finalUrl = null;

    try {
      // 1. Si existe anteproyecto, lo subo a Supabase
      if (anteproyectoFile) {
        anteUrl = await uploadPdf(anteproyectoFile, `anteproyectos/${user.uid}.pdf`);
      }

      // 2. Si existe proyecto final, lo subo a Supabase
      if (finalFile) {
        finalUrl = await uploadPdf(finalFile, `finales/${user.uid}.pdf`);
      }

      // 3. Luego creo el documento en Firestore (colección 'residencias')
      //    Con el ID igual al UID del usuario, para que coincida con script-alumno.js
      await setDoc(doc(db, 'residencias', user.uid), {
        anteproyectoURL: anteUrl,
        proyectoFinalURL: finalUrl,
        estado: 'Pendiente',
        usuarioId: user.uid
      });

      alert('Documentos subidos correctamente y Firestore creado.');
      // Si quieres redirigir:
      // window.location.href = 'dashboard-alumno.html';
    } catch (error) {
      console.error(error);
      alert('Error al subir documentos: ' + error.message);
    }
  });
});
