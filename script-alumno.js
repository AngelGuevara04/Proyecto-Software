// script-alumno.js
import { auth, db, storage } from './firebase-config.js';
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-storage.js";

const authInstance = getAuth();

onAuthStateChanged(authInstance, async user => {
  if (!user) return window.location.href = 'login.html';

  // Verificar rol alumno
  const perfil = await getDoc(doc(db, "usuarios", user.uid));
  if (!perfil.exists() || perfil.data().rol !== 'alumno') {
    alert("Acceso denegado.");
    await signOut(authInstance);
    return window.location.href = 'login.html';
  }

  // Cerrar sesión
  document.getElementById('logout-button')
    .addEventListener('click', async () => {
      await signOut(authInstance);
      window.location.href = 'login.html';
    });

  const uid      = user.uid;
  const resRef   = doc(db, "residencias", uid);
  const estadoEl = document.getElementById('estado-proyecto');

  // Mostrar docente/admin asignados
  const snap0 = await getDoc(resRef);
  if (snap0.exists()) {
    const d = snap0.data();
    document.getElementById('docente-asignado').textContent = d.asesorId || 'No asignado';
    document.getElementById('admin-asignado').textContent   = d.adminId  || 'No asignado';
  }

  const actualizarEstado = async () => {
    const snap = await getDoc(resRef);
    if (!snap.exists()) return;
    const d = snap.data();
    estadoEl.innerHTML = `
      <p>Anteproyecto: ${d.anteproyectoEstado.docente} / ${d.anteproyectoEstado.admin}</p>
      <p>Reportes: ${d.reportes.length}</p>
      <p>Proyecto Final: ${d.proyectoFinal.docente} / ${d.proyectoFinal.admin}</p>
    `;
  };
  await actualizarEstado();

  // Subir Anteproyecto
  document.getElementById('form-anteproyecto')
    .addEventListener('submit', async e => {
      e.preventDefault();
      const file = e.target.archivo.files[0];
      const stRef = ref(storage, `anteproyectos/${uid}.pdf`);
      await uploadBytes(stRef, file);
      const url = await getDownloadURL(stRef);
      await updateDoc(resRef, {
        anteproyectoURL: url,
        anteproyectoEstado: { docente: 'pendiente', admin: 'pendiente', obsDocente: '', obsAdmin: '' }
      });
      alert("Anteproyecto subido.");
      await actualizarEstado();
    });

  // Subir Reporte Parcial
  document.getElementById('form-reporte')
    .addEventListener('submit', async e => {
      e.preventDefault();
      const file = e.target.reporte.files[0];
      const ts   = Date.now();
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
      alert("Reporte subido.");
      await actualizarEstado();
    });

  // Subir Proyecto Final
  document.getElementById('form-final')
    .addEventListener('submit', async e => {
      e.preventDefault();
      const file = e.target.final.files[0];
      const stRef = ref(storage, `finales/${uid}.pdf`);
      await uploadBytes(stRef, file);
      const url = await getDownloadURL(stRef);
      await updateDoc(resRef, {
        proyectoFinal: { url, docente: 'pendiente', admin: 'pendiente', obsDocente: '', obsAdmin: '' }
      });
      alert("Proyecto final subido.");
      await actualizarEstado();
    });
});
