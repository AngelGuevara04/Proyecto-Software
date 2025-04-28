// script-docente.js
import { app, db } from './firebase-config.js';
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

const auth = getAuth(app);

onAuthStateChanged(auth, async user => {
  if (!user) {
    return window.location.href = 'login.html';
  }

  // Verificar rol de docente
  const perfilSnap = await getDoc(doc(db, 'usuarios', user.uid));
  if (!perfilSnap.exists() || perfilSnap.data().rol !== 'docente') {
    alert('Acceso denegado: solo docentes pueden ver este panel.');
    await signOut(auth);
    return window.location.href = 'login.html';
  }

  // Cerrar sesión
  document.getElementById('logout-button').addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = 'login.html';
  });

  // Contenedores
  const listaAlumnosDiv = document.getElementById('lista-alumnos');
  const revisarDiv      = document.getElementById('revisar-contenido');

  // 1) Listar alumnos asignados
  const q    = query(collection(db, 'residencias'), where('asesorId', '==', user.uid));
  const snap = await getDocs(q);

  listaAlumnosDiv.innerHTML = '';
  revisarDiv.style.display   = 'none';

  for (const resDoc of snap.docs) {
    const alumnoId = resDoc.id;
    const uSnap    = await getDoc(doc(db, 'usuarios', alumnoId));
    const nombre   = uSnap.exists() ? uSnap.data().nombre : alumnoId;

    const card = document.createElement('div');
    card.classList.add('alumno-card');
    card.innerHTML = `
      <span>${nombre}</span>
      <button data-uid="${alumnoId}" class="btn-revisar">Revisar Documentos</button>
    `;
    listaAlumnosDiv.appendChild(card);
  }

  // 2) Manejar clic en “Revisar Documentos”
  listaAlumnosDiv.addEventListener('click', async e => {
    if (!e.target.matches('.btn-revisar')) return;
    const alumnoId = e.target.dataset.uid;
    const resSnap  = await getDoc(doc(db, 'residencias', alumnoId));

    if (!resSnap.exists()) {
      revisarDiv.innerHTML = '<p>No hay datos para este alumno.</p>';
    } else {
      const d = resSnap.data();
      let html = `<h3>Documentos de ${alumnoId}</h3>`;
      if (d.anteproyectoURL) {
        html += `
          <div>
            <a href="${d.anteproyectoURL}" target="_blank">Anteproyecto</a>
            — Estado Docente: ${d.anteproyectoEstado.docente}
          </div>
        `;
      }
      d.reportes.forEach((r,i) => {
        html += `
          <div>
            <a href="${r.url}" target="_blank">Reporte ${i+1}</a>
            — Estado Docente: ${r.docente}
          </div>
        `;
      });
      if (d.proyectoFinal.url) {
        html += `
          <div>
            <a href="${d.proyectoFinal.url}" target="_blank">Proyecto Final</a>
            — Estado Docente: ${d.proyectoFinal.docente}
          </div>
        `;
      }
      html += `<button id="volver-lista">Volver</button>`;
      revisarDiv.innerHTML = html;
    }

    // Mostrar panel de revisión, ocultar lista
    listaAlumnosDiv.style.display = 'none';
    revisarDiv.style.display      = 'block';

    // Volver atrás
    document.getElementById('volver-lista')
      .addEventListener('click', () => {
        revisarDiv.style.display      = 'none';
        listaAlumnosDiv.style.display = 'block';
      });
  });
});
