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
  getDoc,
  updateDoc
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

const auth = getAuth(app);

onAuthStateChanged(auth, async user => {
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  // Verificar rol de docente
  const perfilSnap = await getDoc(doc(db, 'usuarios', user.uid));
  if (!perfilSnap.exists() || perfilSnap.data().rol !== 'docente') {
    alert('Acceso denegado: solo docentes pueden ver este panel.');
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
      <span class="nombre-alumno">${nombre}</span>
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

      // Anteproyecto
      if (d.anteproyectoURL) {
        html += `
          <div class="item">
            <a href="${d.anteproyectoURL}" target="_blank">Anteproyecto</a>
            <form data-doc="anteproyecto" class="form-calificar">
              <select required>
                <option value="">Estado</option>
                <option value="aprobado">Aprobado</option>
                <option value="rechazado">Rechazado</option>
              </select>
              <input type="text" placeholder="Observaciones">
              <button type="submit">Guardar</button>
            </form>
          </div>
        `;
      }

      // Reportes parciales
      d.reportes.forEach((r, i) => {
        html += `
          <div class="item">
            <a href="${r.url}" target="_blank">Reporte ${i+1}</a>
            <form data-doc="reporte" data-index="${i}" class="form-calificar">
              <select required>
                <option value="">Estado</option>
                <option value="aprobado">Aprobado</option>
                <option value="rechazado">Rechazado</option>
              </select>
              <input type="text" placeholder="Observaciones">
              <button type="submit">Guardar</button>
            </form>
          </div>
        `;
      });

      // Proyecto final
      if (d.proyectoFinal.url) {
        html += `
          <div class="item">
            <a href="${d.proyectoFinal.url}" target="_blank">Proyecto Final</a>
            <form data-doc="final" class="form-calificar">
              <select required>
                <option value="">Estado</option>
                <option value="aprobado">Aprobado</option>
                <option value="rechazado">Rechazado</option>
              </select>
              <input type="text" placeholder="Observaciones">
              <button type="submit">Guardar</button>
            </form>
          </div>
        `;
      }

      html += `<button id="volver-lista">Volver</button>`;
      revisarDiv.innerHTML = html;
    }

    // Mostrar panel de revisión, ocultar lista
    listaAlumnosDiv.style.display = 'none';
    revisarDiv.style.display      = 'block';
  });

  // 3) Manejar envíos de formularios de calificación
  revisarDiv.addEventListener('submit', async e => {
    if (!e.target.matches('.form-calificar')) return;
    e.preventDefault();

    const form      = e.target;
    const alumnoId  = form.closest('#revisar-contenido').querySelector('.btn-revisar')?.dataset.uid;
    // Alternativamente, podrías almacenar alumnoId en un data-alumno en revisarDiv
    // para no depender del selector anterior.

    const docType   = form.dataset.doc;         // 'anteproyecto' | 'reporte' | 'final'
    const index     = form.dataset.index;       // para reportes
    const estado    = form[0].value;
    const observ    = form[1].value;

    const refRes = doc(db, 'residencias', alumnoId);
    const snap   = await getDoc(refRes);
    const data   = snap.data();

    if (docType === 'anteproyecto') {
      await updateDoc(refRes, {
        'anteproyectoEstado.docente': estado,
        'anteproyectoEstado.obsDocente': observ
      });
    }
    else if (docType === 'reporte') {
      const rptArr = data.reportes;
      rptArr[index].docente    = estado;
      rptArr[index].obsDocente = observ;
      await updateDoc(refRes, { reportes: rptArr });
    }
    else if (docType === 'final') {
      await updateDoc(refRes, {
        'proyectoFinal.docente': estado,
        'proyectoFinal.obsDocente': observ
      });
    }

    alert('Calificación guardada.');
  });

  // 4) Botón “Volver”
  revisarDiv.addEventListener('click', e => {
    if (e.target.matches('#volver-lista')) {
      revisarDiv.style.display      = 'none';
      listaAlumnosDiv.style.display = 'block';
    }
  });
});
