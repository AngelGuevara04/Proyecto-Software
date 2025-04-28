// script-alumno.js
import { app, db, storage } from './firebase-config.js';
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';
import {
  ref,
  uploadBytes,
  getDownloadURL
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-storage.js';

const auth = getAuth(app);

onAuthStateChanged(auth, async user => {
  if (!user) {
    return window.location.href = 'login.html';
  }

  // Verificar rol de alumno
  const perfilSnap = await getDoc(doc(db, 'usuarios', user.uid));
  if (!perfilSnap.exists() || perfilSnap.data().rol !== 'alumno') {
    alert('Acceso denegado: solo alumnos pueden usar este panel.');
    await signOut(auth);
    return window.location.href = 'login.html';
  }

  // Cerrar sesión
  document.getElementById('logout-button').addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = 'login.html';
  });

  const uid      = user.uid;
  const resRef   = doc(db, 'residencias', uid);
  const estadoEl = document.getElementById('estado-proyecto');
  const docAsig  = document.getElementById('docente-asignado');
  const admAsig  = document.getElementById('admin-asignado');

  // Cargar asignaciones (docente y administrador)
  const residSnap = await getDoc(resRef);
  if (residSnap.exists()) {
    const d = residSnap.data();
    // Docente asignado
    if (d.asesorId) {
      const ds = await getDoc(doc(db, 'usuarios', d.asesorId));
      docAsig.textContent = ds.exists() ? ds.data().nombre : d.asesorId;
    } else {
      docAsig.textContent = 'No asignado';
    }
    // Administrador asignado
    if (d.adminId) {
      const as = await getDoc(doc(db, 'usuarios', d.adminId));
      admAsig.textContent = as.exists() ? as.data().nombre : d.adminId;
    } else {
      admAsig.textContent = 'No asignado';
    }
  }

  // Función para actualizar estado en pantalla
  const actualizarEstado = async () => {
    const snap = await getDoc(resRef);
    if (!snap.exists()) return;
    const d = snap.data();
    estadoEl.innerHTML = `
      <p>Anteproyecto: ${d.anteproyectoEstado.docente} / ${d.anteproyectoEstado.admin}</p>
      <p>Reportes subidos: ${d.reportes.length}</p>
      <p>Proyecto Final: ${d.proyectoFinal.docente} / ${d.proyectoFinal.admin}</p>
    `;
  };
  await actualizarEstado();

  // Subir Anteproyecto
  document.getElementById('form-anteproyecto')
    .addEventListener('submit', async e => {
      e.preventDefault();
      const file  = e.target.archivo.files[0];
      const stRef = ref(storage, `anteproyectos/${uid}.pdf`);
      await uploadBytes(stRef, file);
      const url = await getDownloadURL(stRef);
      await updateDoc(resRef, {
        anteproyectoURL: url,
        anteproyectoEstado: { docente: 'pendiente', admin: 'pendiente', obsDocente: '', obsAdmin: '' }
      });
      alert('Anteproyecto subido.');
      await actualizarEstado();
    });

  // Subir Reporte Parcial
  document.getElementById('form-reporte')
    .addEventListener('submit', async e => {
      e.preventDefault();
      const file  = e.target.reporte.files[0];
      const ts    = Date.now();
      const stRef = ref(storage, `reportes/${uid}_${ts}.pdf`);
      await uploadBytes(stRef, file);
      const url = await getDownloadURL(stRef);
      await updateDoc(resRef, {
        reportes: arrayUnion({
          url,
          fecha: new Date().toISOString(),
          docente: 'pendiente',
          admin: 'pendiente',
          obsDocente: '',
          obsAdmin: ''
        })
      });
      alert('Reporte subido.');
      await actualizarEstado();
    });

  // Subir Proyecto Final
  document.getElementById('form-final')
    .addEventListener('submit', async e => {
      e.preventDefault();
      const file  = e.target.final.files[0];
      const stRef = ref(storage, `finales/${uid}.pdf`);
      await uploadBytes(stRef, file);
      const url = await getDownloadURL(stRef);
      await updateDoc(resRef, {
        proyectoFinal: { url, docente: 'pendiente', admin: 'pendiente', obsDocente: '', obsAdmin: '' }
      });
      alert('Proyecto final subido.');
      await actualizarEstado();
    });
});
