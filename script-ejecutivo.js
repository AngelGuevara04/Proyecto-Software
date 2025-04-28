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
  setDoc
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

const auth = getAuth(app);

onAuthStateChanged(auth, async user => {
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  // Verificar rol 'ejecutivo'
  const perfilSnap = await getDoc(doc(db, 'usuarios', user.uid));
  if (!perfilSnap.exists() || perfilSnap.data().rol !== 'ejecutivo') {
    alert('Acceso denegado: solo administrador puede ver este panel.');
    await signOut(auth);
    window.location.href = 'login.html';
    return;
  }

  // Botón Cerrar Sesión
  document.getElementById('logout-button').addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = 'login.html';
  });

  // Referencias DOM
  const listaDiv      = document.getElementById('lista-documentos');
  const alumnoSelect  = document.getElementById('alumno');
  const docenteSelect = document.getElementById('docente');
  const formAsignar   = document.getElementById('form-asignar-asesor');

  listaDiv.innerHTML      = '';
  alumnoSelect.innerHTML  = '<option value="">-- Selecciona alumno --</option>';
  docenteSelect.innerHTML = '<option value="">-- Selecciona docente --</option>';

  // 1) Listar alumnos
  const alumnosSnap = await getDocs(
    query(collection(db, 'usuarios'), where('rol', '==', 'alumno'))
  );
  for (const u of alumnosSnap.docs) {
    const { nombre, correo } = u.data();
    listaDiv.insertAdjacentHTML('beforeend', `
      <div>
        <strong>Alumno:</strong> ${nombre} (${u.id})<br>
        <strong>Email:</strong> ${correo}
      </div><hr>
    `);
    alumnoSelect.insertAdjacentHTML('beforeend',
      `<option value="${u.id}">${nombre}</option>`
    );
  }

  // 2) Listar docentes
  const docentesSnap = await getDocs(
    query(collection(db, 'usuarios'), where('rol', '==', 'docente'))
  );
  for (const d of docentesSnap.docs) {
    const { nombre, correo } = d.data();
    listaDiv.insertAdjacentHTML('beforeend', `
      <div>
        <strong>Docente:</strong> ${nombre} (${d.id})<br>
        <strong>Email:</strong> ${correo}
      </div><hr>
    `);
    docenteSelect.insertAdjacentHTML('beforeend',
      `<option value="${d.id}">${nombre}</option>`
    );
  }

  // 3) Asignar asesor con setDoc + merge
  formAsignar.addEventListener('submit', async e => {
    e.preventDefault();
    const alumnoId  = alumnoSelect.value;
    const docenteId = docenteSelect.value;
    if (!alumnoId || !docenteId) {
      alert('Selecciona alumno y docente.');
      return;
    }

    // Asegurarnos de que el documento existe o crearlo,
    // y actualizar sólo el campo asesorId:
    const ref = doc(db, 'residencias', alumnoId);
    await setDoc(ref, { asesorId: docenteId }, { merge: true });

    alert('Asesor asignado con éxito.');
    window.location.reload();
  });
});
