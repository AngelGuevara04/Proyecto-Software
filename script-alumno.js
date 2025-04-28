// script-alumno.js
import { app, db } from './firebase-config.js';
import { supabase } from './supabase-config.js';
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
  document.getElementById('logout-button')
    .addEventListener('click', async () => {
      await signOut(auth);
      window.location.href = 'login.html';
    });

  const uid      = user.uid;
  const resRef   = doc(db, 'residencias', uid);
  const estadoEl = document.getElementById('estado-proyecto');
  const docAsig  = document.getElementById('docente-asignado');
  const admAsig  = document.getElementById('admin-asignado');

  // Mostrar asignaciones
  const residSnap = await getDoc(resRef);
  if (residSnap.exists()) {
    const d = residSnap.data();
    // Docente
    if (d.asesorId) {
      const ds = await getDoc(doc(db, 'usuarios', d.asesorId));
      docAsig.textContent = ds.exists() ? ds.data().nombre : d.asesorId;
    } else docAsig.textContent = 'No asignado';
    // Admin
    if (d.adminId) {
      const as = await getDoc(doc(db, 'usuarios', d.adminId));
      admAsig.textContent = as.exists() ? as.data().nombre : d.adminId;
    } else admAsig.textContent = 'No asignado';
  }

  // Función para refrescar estado
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

  // Helper: sube un archivo a Supabase y devuelve URL pública
  async function uploadToSupabase(path, file) {
    const { error } = await supabase
      .storage
      .from('residencias')
      .upload(path, file, { cacheControl: '3600', upsert: true });
    if (error) throw error;
    const { publicURL, error: urlErr } = supabase
      .storage
      .from('residencias')
      .getPublicUrl(path);
    if (urlErr) throw urlErr;
    return publicURL;
  }

  // Subir Anteproyecto
  document.getElementById('form-anteproyecto')
    .addEventListener('submit', async e => {
      e.preventDefault();
      const file = e.target.archivo.files[0];
      const path = `${uid}/anteproyecto.pdf`;
      try {
        const url = await uploadToSupabase(path, file);
        await updateDoc(resRef, {
          anteproyectoURL: url,
          anteproyectoEstado: { docente: 'pendiente', admin: 'pendiente', obsDocente: '', obsAdmin: '' }
        });
        alert('Anteproyecto subido vía Supabase.');
        await actualizarEstado();
      } catch (err) {
        console.error(err);
        alert('Error al subir anteproyecto: ' + err.message);
      }
    });

  // Subir Reporte Parcial
  document.getElementById('form-reporte')
    .addEventListener('submit', async e => {
      e.preventDefault();
      const file = e.target.reporte.files[0];
      const ts   = Date.now();
      const path = `${uid}/reportes/reporte_${ts}.pdf`;
      try {
        const url = await uploadToSupabase(path, file);
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
        alert('Reporte subido vía Supabase.');
        await actualizarEstado();
      } catch (err) {
        console.error(err);
        alert('Error al subir reporte: ' + err.message);
      }
    });

  // Subir Proyecto Final
  document.getElementById('form-final')
    .addEventListener('submit', async e => {
      e.preventDefault();
      const file = e.target.final.files[0];
      const path = `${uid}/final/proyecto_final.pdf`;
      try {
        const url = await uploadToSupabase(path, file);
        await updateDoc(resRef, {
          proyectoFinal: { url, docente: 'pendiente', admin: 'pendiente', obsDocente: '', obsAdmin: '' }
        });
        alert('Proyecto final subido vía Supabase.');
        await actualizarEstado();
      } catch (err) {
        console.error(err);
        alert('Error al subir proyecto final: ' + err.message);
      }
    });
});
