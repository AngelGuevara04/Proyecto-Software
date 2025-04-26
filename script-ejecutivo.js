// script-ejecutivo.js
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
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
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  // Referencias a elementos del DOM
  const listaDiv      = document.getElementById('lista-documentos');
  const alumnoSelect  = document.getElementById('alumno');
  const docenteSelect = document.getElementById('docente');
  const formAsignar   = document.getElementById('form-asignar-asesor');

  // Limpiar contenido previo
  listaDiv.innerHTML       = "";
  alumnoSelect.innerHTML   = '<option value="">-- Selecciona alumno --</option>';
  docenteSelect.innerHTML  = '<option value="">-- Selecciona docente --</option>';

  // 1) Poblar lista y select con alumnos (rol == "alumno")
  const alumnosSnap = await getDocs(
    query(collection(db, "usuarios"), where("rol", "==", "alumno"))
  );

  for (const usuDoc of alumnosSnap.docs) {
    const alumnoId     = usuDoc.id;
    const { nombre }   = usuDoc.data();

    // Obtener estado desde residencias
    const resSnap = await getDoc(doc(db, "residencias", alumnoId));
    const resData = resSnap.exists() ? resSnap.data() : {};

    const estadoAnte   = resData.anteproyectoEstado?.admin   ?? "pendiente";
    const numReportes  = Array.isArray(resData.reportes)     ? resData.reportes.length : 0;
    const estadoFinal  = resData.proyectoFinal?.admin        ?? "pendiente";
    const asesorId     = resData.asesorId                    || "—";

    // Mostrar en el panel
    listaDiv.insertAdjacentHTML('beforeend', `
      <div>
        <strong>Alumno:</strong> ${nombre} (${alumnoId})<br>
        <strong>Asesor actual:</strong> ${asesorId}<br>
        <strong>Anteproyecto (admin):</strong> ${estadoAnte}<br>
        <strong># Reportes:</strong> ${numReportes}<br>
        <strong>Proyecto Final (admin):</strong> ${estadoFinal}
      </div>
      <hr>
    `);

    // Agregar al select de alumnos
    alumnoSelect.insertAdjacentHTML('beforeend',
      `<option value="${alumnoId}">${nombre}</option>`
    );
  }

  // 2) Poblar select con docentes (rol == "docente")
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

  // 3) Manejar envío del formulario de asignación
  formAsignar.addEventListener('submit', async e => {
    e.preventDefault();
    const alumnoId  = alumnoSelect.value;
    const docenteId = docenteSelect.value;
    if (!alumnoId || !docenteId) {
      alert("Debes seleccionar un alumno y un docente.");
      return;
    }
    await updateDoc(doc(db, "residencias", alumnoId), { asesorId: docenteId });
    alert("Asesor asignado correctamente.");
    window.location.reload();
  });
});
