// script-ejecutivo.js
import { app, db } from './firebase-config.js';
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  updateDoc
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

const auth = getAuth(app);

onAuthStateChanged(auth, async user => {
  if (!user) return window.location.href = "login.html";

  // Cerrar sesión
  document.getElementById('logout-button')
    .addEventListener('click', async () => {
      await signOut(auth);
      window.location.href = "login.html";
    });

  // Verificar rol ejecutivo
  const perfilSnap = await getDoc(doc(db, "usuarios", user.uid));
  if (!perfilSnap.exists() || perfilSnap.data().rol !== "ejecutivo") {
    alert("Acceso denegado.");
    await signOut(auth);
    return window.location.href = "login.html";
  }

  const listaDiv      = document.getElementById('lista-documentos');
  const alumnoSelect  = document.getElementById('alumno');
  const docenteSelect = document.getElementById('docente');
  const formAsignar   = document.getElementById('form-asignar-asesor');

  listaDiv.innerHTML      = "";
  alumnoSelect.innerHTML  = '<option value="">-- Selecciona alumno --</option>';
  docenteSelect.innerHTML = '<option value="">-- Selecciona docente --</option>';

  // 1) Poblar alumnos
  const alumnosSnap = await getDocs(
    query(collection(db, "usuarios"), where("rol", "==", "alumno"))
  );
  for (const u of alumnosSnap.docs) {
    const alumnoId   = u.id;
    const { nombre } = u.data();
    const rSnap      = await getDoc(doc(db, "residencias", alumnoId));
    const rData      = rSnap.exists() ? rSnap.data() : {};

    listaDiv.insertAdjacentHTML('beforeend', `
      <div>
        <strong>Alumno:</strong> ${nombre} (${alumnoId})<br>
        <strong>Asesor actual:</strong> ${rData.asesorId || '—'}<br>
        <strong>Anteproyecto (admin):</strong> ${rData.anteproyectoEstado?.admin ?? 'pendiente'}<br>
        <strong># Reportes:</strong> ${rData.reportes?.length ?? 0}<br>
        <strong>Proyecto Final (admin):</strong> ${rData.proyectoFinal?.admin ?? 'pendiente'}
      </div>
      <hr>
    `);

    alumnoSelect.insertAdjacentHTML('beforeend',
      `<option value="${alumnoId}">${nombre}</option>`
    );
  }

  // 2) Poblar docentes
  const docentesSnap = await getDocs(
    query(collection(db, "usuarios"), where("rol", "==", "docente"))
  );
  for (const d of docentesSnap.docs) {
    docenteSelect.insertAdjacentHTML('beforeend',
      `<option value="${d.id}">${d.data().nombre}</option>`
    );
  }

  // 3) Asignar asesor
  formAsignar.addEventListener('submit', async e => {
    e.preventDefault();
    const alumnoId  = alumnoSelect.value;
    const docenteId = docenteSelect.value;
    if (!alumnoId || !docenteId) {
      return alert("Selecciona alumno y docente.");
    }
    await updateDoc(doc(db, "residencias", alumnoId), { asesorId: docenteId });
    alert("Asesor asignado con éxito.");
    window.location.reload();
  });
});
