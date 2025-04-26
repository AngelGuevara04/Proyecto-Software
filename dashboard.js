// dashboard.js
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { collection, getDocs, doc, updateDoc } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

onAuthStateChanged(auth, async (user) => {
  if (!user) return window.location.href = 'login.html';

  const role = user.email.includes('@estudiante.com') ? 'estudiante' :
               user.email.includes('@docente.com') ? 'docente' : 'administrador';

  const docsContainer = document.getElementById("lista-documentos");
  const alumnosContainer = document.getElementById("alumnos-docentes");
  const asignarForm = document.getElementById("asignar-alumno-form");

  if (role === 'estudiante') {
    const estudianteDocs = await getDocs(collection(db, 'residencias'));
    estudianteDocs.forEach(docSnap => {
      const data = docSnap.data();
      const uid = docSnap.id;
      const div = document.createElement("div");
      div.innerHTML = `
        <strong>Alumno:</strong> ${uid}<br>
        Anteproyecto: ${data.anteproyectoURL ? `<a href="${data.anteproyectoURL}" target="_blank">Ver</a>` : "Pendiente"}<br>
        Proyecto Final: ${data.proyectoFinal?.url ? `<a href="${data.proyectoFinal.url}" target="_blank">Ver</a>` : "Pendiente"}<br><hr>`;
      docsContainer.appendChild(div);
    });
  }

  if (role === 'administrador') {
    const estudiantesSnapshot = await getDocs(collection(db, 'residencias'));
    estudiantesSnapshot.forEach(docSnap => {
      const data = docSnap.data();
      const uid = docSnap.id;
      const alumnoOption = document.createElement("option");
      alumnoOption.value = uid;
      alumnoOption.textContent = uid;
      alumnosContainer.appendChild(alumnoOption);
    });

    asignarForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const alumnoId = document.getElementById('alumno-select').value;
      const docenteId = document.getElementById('docente-select').value;
      const ref = doc(db, 'residencias', alumnoId);
      await updateDoc(ref, { asesorId: docenteId });
      alert("Asesor asignado correctamente.");
    });
  }
});
