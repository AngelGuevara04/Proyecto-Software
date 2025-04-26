// script-ejecutivo.js
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  updateDoc
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

onAuthStateChanged(async user => {
  if (!user) return window.location.href = "login.html";

  // Logout funcional
  document.getElementById('logout-button')
    .addEventListener('click', async () => {
      await signOut(auth);
      window.location.href = "login.html";
    });

  // Verificar que es ejecutivo
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

  // Poblar alumnos
  const alumnosSnap = await getDocs(
    query(collection(db, "usuarios"), where("rol", "==", "alumno"))
  );
  for (const usuDoc of alumnosSnap.docs) {
    const alumnoId   = usuDoc.id;
    const { nombre } = usuDoc.data();
    const resSnap    = await getDoc(doc(db, "residencias", alumnoId));
    const resData    = resSnap.exists() ? resSnap.data() : {};

    listaDiv.insertAdjacentHTML('beforeend', `
      <div>
        <strong>Alumno:</strong> ${nombre} (${alumnoId})<br>
        <strong>Asesor actual:</strong> ${resData.asesorId || '—'}<br>
        <strong>Anteproyecto (admin):</strong> ${resData.anteproyectoEstado?.admin ?? 'pendiente'}<br>
        <strong># Reportes:</strong> ${resData.reportes?.length ?? 0}<br>
        <strong>Proyecto Final (admin):</strong> ${resData.proyectoFinal?.admin ?? 'pendiente'}
      </div><hr>
    `);

    alumnoSelect.insertAdjacentHTML('beforeend',
      `<option value="${alumnoId}">${nombre}</option>`
    );
  }

  // Poblar docentes
  const docentesSnap = await getDocs(
    query(collection(db, "usuarios"), where("rol", "==", "docente"))
  );
  for (const docu of docentesSnap.docs) {
    const docenteId   = docu.id;
    const { nombre }  = docu.data();
    docenteSelect.insertAdjacentHTML('beforeend',
      `<option value="${docenteId}">${nombre}</option>`
    );
  }

  // Asignar asesor
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
