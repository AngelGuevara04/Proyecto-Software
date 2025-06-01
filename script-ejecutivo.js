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

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    return window.location.href = 'login.html';
  }

  // 1) Verificar rol "ejecutivo"
  const perfilSnap = await getDoc(doc(db, 'usuarios', user.uid));
  if (!perfilSnap.exists() || perfilSnap.data().rol !== 'ejecutivo') {
    alert('Acceso denegado: solo administradores pueden ver este panel.');
    await signOut(auth);
    return window.location.href = 'login.html';
  }

  // 2) BOTÓN Cerrar Sesión
  document.getElementById('logout-button').addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = 'login.html';
  });

  // 3) Obtener todos los alumnos
  const qAlumnos = query(collection(db, 'usuarios'), where('rol', '==', 'alumno'));
  const alumnosSnap = await getDocs(qAlumnos);

  // 4) Obtener todos los docentes
  const qDocentes = query(collection(db, 'usuarios'), where('rol', '==', 'docente'));
  const docentesSnap = await getDocs(qDocentes);

  // Preparamos un array con objetos { uid: "...", nombre: "...", correo: "..." }
  const listaDocentes = [];
  docentesSnap.forEach(docSnap => {
    listaDocentes.push({
      uid: docSnap.id,
      nombre: docSnap.data().nombre,
      correo: docSnap.data().correo
    });
  });

  // 5) Recorrer cada alumno y crear su “tarjeta”
  const contenedorAlumnos = document.getElementById('lista-alumnos-ejecutivo');
  contenedorAlumnos.innerHTML = ''; // Limpiar antes

  for (const alumnoDoc of alumnosSnap.docs) {
    const uidAlumno = alumnoDoc.id;
    const { nombre: nombreAlumno, correo: correoAlumno } = alumnoDoc.data();

    // Leer su documento en 'residencias/{uidAlumno}' para ver si ya tiene asesores
    const resSnap = await getDoc(doc(db, 'residencias', uidAlumno));
    const dataResid = resSnap.exists() ? resSnap.data() : null;
    const asesoresArray = Array.isArray(dataResid?.asesores) ? dataResid.asesores : [];

    // Crear elemento <div class="tarjeta-alumno"> … </div>
    const tarjeta = document.createElement('div');
    tarjeta.classList.add('tarjeta-alumno');
    tarjeta.innerHTML = `
      <div class="info-alumno">
        <strong>Alumno:</strong> ${nombreAlumno} (${uidAlumno})<br />
        <strong>Email:</strong> ${correoAlumno}<br />
      </div>
      <div class="asignacion-asesores">
        <label for="docente1-${uidAlumno}">Asesor 1:</label>
        <select id="docente1-${uidAlumno}" class="select-docente">
          <option value="">-- Ninguno --</option>
          ${listaDocentes.map(d => `
            <option value="${d.uid}" ${asesoresArray[0] === d.uid ? 'selected' : ''}>${d.nombre}</option>
          `).join('')}
        </select>

        <label for="docente2-${uidAlumno}">Asesor 2:</label>
        <select id="docente2-${uidAlumno}" class="select-docente">
          <option value="">-- Ninguno --</option>
          ${listaDocentes.map(d => `
            <option value="${d.uid}" ${asesoresArray[1] === d.uid ? 'selected' : ''}>${d.nombre}</option>
          `).join('')}
        </select>

        <button id="btn-guardar-${uidAlumno}" class="btn-guardar-asesores">Guardar Asesores</button>
        <button id="btn-revocar-${uidAlumno}" class="btn-revocar-asesores">Revocar Asesores</button>
      </div>
      <hr/>
    `;

    contenedorAlumnos.appendChild(tarjeta);

    // 6) Agregar eventos a los botones “Guardar” y “Revocar”
    document.getElementById(`btn-guardar-${uidAlumno}`).addEventListener('click', async () => {
      // Leer valores de los selects
      const uidDoc1 = document.getElementById(`docente1-${uidAlumno}`).value;
      const uidDoc2 = document.getElementById(`docente2-${uidAlumno}`).value;

      // Construir array de asesores (no incluir cadenas vacías)
      const nuevosAsesores = [];
      if (uidDoc1) nuevosAsesores.push(uidDoc1);
      if (uidDoc2 && uidDoc2 !== uidDoc1) nuevosAsesores.push(uidDoc2);

      // Actualizar Firestore
      await updateDoc(doc(db, 'residencias', uidAlumno), {
        asesores: nuevosAsesores
      });

      alert('Asesores actualizados correctamente.');
    });

    document.getElementById(`btn-revocar-${uidAlumno}`).addEventListener('click', async () => {
      // Poner array vacío en Firestore
      await updateDoc(doc(db, 'residencias', uidAlumno), {
        asesores: []
      });
      // También borrar la selección en los <select>
      document.getElementById(`docente1-${uidAlumno}`).value = "";
      document.getElementById(`docente2-${uidAlumno}`).value = "";
      alert('Asesores revocados para este alumno.');
    });
  }
});
