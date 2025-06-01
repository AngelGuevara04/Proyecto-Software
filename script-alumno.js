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
    // Sin usuario → redirigir a login
    return window.location.href = 'login.html';
  }

  const uid = user.uid;

  // 1. Verificar rol 'alumno'
  const perfilSnap = await getDoc(doc(db, 'usuarios', uid));
  if (!perfilSnap.exists() || perfilSnap.data().rol !== 'alumno') {
    alert('Acceso denegado: sólo alumnos pueden ver este panel.');
    await signOut(auth);
    return window.location.href = 'login.html';
  }

  // 2. Referencia a Firestore 'residencias/{uid}'
  const resRef = doc(db, 'residencias', uid);

  // 3. Botón Cerrar Sesión
  document.getElementById('logout-button')
    .addEventListener('click', async () => {
      await signOut(auth);
      window.location.href = 'login.html';
    });

  // 4. Mostrar enlaces si ya existen
  const enlacesDiv = document.getElementById('enlaces-documentos');
  const resSnap = await getDoc(resRef);
  if (resSnap.exists()) {
    const data = resSnap.data();

    // Si existe anteproyecto
    if (data.anteproyecto?.url) {
      const a1 = document.createElement('a');
      a1.href = data.anteproyecto.url;
      a1.target = '_blank';
      a1.textContent = 'Ver Anteproyecto';
      enlacesDiv.appendChild(a1);
    }

    // Si existe reporte parcial
    if (data.reporteParcial?.url) {
      const a2 = document.createElement('a');
      a2.href = data.reporteParcial.url;
      a2.target = '_blank';
      a2.textContent = 'Ver Reporte Parcial';
      enlacesDiv.appendChild(a2);
    }

    // Si existe proyecto final
    if (data.proyectoFinal?.url) {
      const a3 = document.createElement('a');
      a3.href = data.proyectoFinal.url;
      a3.target = '_blank';
      a3.textContent = 'Ver Proyecto Final';
      enlacesDiv.appendChild(a3);
    }
  }

  // 5. FORMULARIO Anteproyecto
  document.getElementById('form-anteproyecto')
    .addEventListener('submit', async (e) => {
      e.preventDefault();
      const file = document.getElementById('archivo').files[0];
      if (!file) {
        return alert('Debes seleccionar un PDF de anteproyecto.');
      }
      try {
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
        // Añadir enlace dinámicamente
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.textContent = 'Ver Anteproyecto';
        enlacesDiv.appendChild(a);

        alert('Anteproyecto subido correctamente.');
      } catch (error) {
        console.error(error);
        alert('Error al subir anteproyecto: ' + error.message);
      }
    });

  // 6. FORMULARIO Reporte Parcial
  document.getElementById('form-reporte')
    .addEventListener('submit', async (e) => {
      e.preventDefault();
      const file = document.getElementById('reporte').files[0];
      if (!file) {
        return alert('Debes seleccionar un PDF de reporte parcial.');
      }
      try {
        const url = await uploadPdf(file, `reportes/${uid}.pdf`);
        await updateDoc(resRef, {
          reporteParcial: {
            url: url,
            docente: 'pendiente',
            admin: 'pendiente',
            obsDocente: '',
            obsAdmin: ''
          }
        });
        // Añadir enlace dinámicamente
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.textContent = 'Ver Reporte Parcial';
        enlacesDiv.appendChild(a);

        alert('Reporte parcial subido correctamente.');
      } catch (error) {
        console.error(error);
        alert('Error al subir reporte: ' + error.message);
      }
    });

  // 7. FORMULARIO Proyecto Final
  document.getElementById('form-final')
    .addEventListener('submit', async (e) => {
      e.preventDefault();
      const file = document.getElementById('final').files[0];
      if (!file) {
        return alert('Debes seleccionar un PDF de proyecto final.');
      }
      try {
        const url = await uploadPdf(file, `finales/${uid}.pdf`);
        await updateDoc(resRef, {
          proyectoFinal: {
            url: url,
            docente: 'pendiente',
            admin: 'pendiente',
            obsDocente: '',
            obsAdmin: ''
          }
        });
        // Añadir enlace dinámicamente
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.textContent = 'Ver Proyecto Final';
        enlacesDiv.appendChild(a);

        alert('Proyecto final subido correctamente.');
      } catch (error) {
        console.error(error);
        alert('Error al subir proyecto final: ' + error.message);
      }
    });
});
