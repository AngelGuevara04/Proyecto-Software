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
  if (!user) {
    return window.location.href = 'login.html';
  }

  // Verificar que sea ejecutivo
  const perfilSnap = await getDoc(doc(db, 'usuarios', user.uid));
  if (!perfilSnap.exists() || perfilSnap.data().rol !== 'ejecutivo') {
    alert('Acceso denegado: solo administrador puede ver este panel.');
    await signOut(auth);
    return window.location.href = 'login.html';
  }

  // Cerrar sesión
  document.getElementById('logout-button')
    .addEventListener('click', async () => {
      await signOut(auth);
      window.location.href = 'login.html';
    });

  const listaDiv      = document.getElementById('lista-documentos');
  const alumnoSelect  = document.getElementById('alumno');
  const docenteSelect = document.getElementById('docente');
  const formAsignar   = document.getElementById('form-asignar-asesor');

  listaDiv.innerHTML      = '';
  alumnoSelect.innerHTML  = '<option value=\"\">-- Selecciona alumno --</option>';
  docenteSelect.innerHTML = '<option value=\"\">-- Selecciona docente --</option>';

  // 1) Listar todos los alumnos
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

  // 2) Listar todos los docentes
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

  // 3) Asignar asesor
  formAsignar.addEventListener('submit', async e => {
    e.preventDefault();
    const alumnoId  = alumnoSelect.value;
    const docenteId = docenteSelect.value;
    if (!alumnoId || !docenteId) {
      return alert('Selecciona alumno y docente.');
    }
    await updateDoc(doc(db, 'residencias', alumnoId), { asesorId: docenteId });
    alert('Asesor asignado con éxito.');
    window.location.reload();
  });
});
