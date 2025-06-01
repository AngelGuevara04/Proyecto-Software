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

  // Verificar que sea docente
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

  // Referencias al DOM
  const listaAlumnosDiv = document.getElementById('lista-alumnos');
  const revisarDiv      = document.getElementById('revisar-contenido');

  // 1) Listar alumnos asignados (campo 'asesorId' en colección 'residencias')
  const q    = query(collection(db, 'residencias'), where('asesorId', '==', user.uid));
  const snap = await getDocs(q);

  listaAlumnosDiv.innerHTML = '';          // Limpiamos antes de insertar
  revisarDiv.style.display   = 'none';      // Aseguramos que esté oculto al inicio

  for (const resDoc of snap.docs) {
    const alumnoId = resDoc.id;
    const uSnap    = await getDoc(doc(db, 'usuarios', alumnoId));
    const nombre   = uSnap.exists() ? uSnap.data().nombre : alumnoId;

    // Creamos una "card" sencilla con el nombre y botón
    const card = document.createElement('div');
    card.classList.add('alumno-card');
    card.innerHTML = `
      <span class="nombre-alumno">${nombre}</span>
      <button data-uid="${alumnoId}" class="btn-revisar">Revisar Documentos</button>
    `;
    listaAlumnosDiv.appendChild(card);
  }

  // 2) Al hacer clic en “Revisar Documentos”
  listaAlumnosDiv.addEventListener('click', async e => {
    if (!e.target.matches('.btn-revisar')) return;
    const alumnoId = e.target.dataset.uid;
    const resSnap  = await getDoc(doc(db, 'residencias', alumnoId));

    if (!resSnap.exists()) {
      revisarDiv.innerHTML = '<p>No hay datos para este alumno.</p>';
    } else {
      const d = resSnap.data();
      let html = `<h3>Documentos de ${alumnoId}</h3>`;

      // **Anteproyecto** (asegúrate de usar el campo correcto)
      if (d.anteproyecto?.url) {
        html += `
          <div class="item-doc">
            <a href="${d.anteproyecto.url}" target="_blank">Descargar Anteproyecto</a>
            <form data-doc="anteproyecto" class="form-calificar">
              <select required>
                <option value="">Estado</option>
                <option value="aprobado">Aprobado</option>
                <option value="rechazado">Rechazado</option>
              </select>
              <input type="text" placeholder="Observaciones" />
              <button type="submit">Guardar</button>
            </form>
          </div>
        `;
      } else {
        html += `<p><em>El alumno aún no sube su Anteproyecto.</em></p>`;
      }

      // **Reporte Parcial** (si existe arreglo `reportes`)
      if (Array.isArray(d.reporteParcial) && d.reporteParcial.length) {
        d.reporteParcial.forEach((r, i) => {
          html += `
            <div class="item-doc">
              <a href="${r.url}" target="_blank">Descargar Reporte ${i + 1}</a>
              <form data-doc="reporte" data-index="${i}" class="form-calificar">
                <select required>
                  <option value="">Estado</option>
                  <option value="aprobado">Aprobado</option>
                  <option value="rechazado">Rechazado</option>
                </select>
                <input type="text" placeholder="Observaciones" />
                <button type="submit">Guardar</button>
              </form>
            </div>
          `;
        });
      } else if (d.reporteParcial?.url) {
        // En caso de que uses la estructura anterior de "reporteParcial.url"
        html += `
          <div class="item-doc">
            <a href="${d.reporteParcial.url}" target="_blank">Descargar Reporte Parcial</a>
            <form data-doc="reporte" class="form-calificar">
              <select required>
                <option value="">Estado</option>
                <option value="aprobado">Aprobado</option>
                <option value="rechazado">Rechazado</option>
              </select>
              <input type="text" placeholder="Observaciones" />
              <button type="submit">Guardar</button>
            </form>
          </div>
        `;
      } else {
        html += `<p><em>El alumno aún no sube su Reporte Parcial.</em></p>`;
      }

      // **Proyecto Final**
      if (d.proyectoFinal?.url) {
        html += `
          <div class="item-doc">
            <a href="${d.proyectoFinal.url}" target="_blank">Descargar Proyecto Final</a>
            <form data-doc="final" class="form-calificar">
              <select required>
                <option value="">Estado</option>
                <option value="aprobado">Aprobado</option>
                <option value="rechazado">Rechazado</option>
              </select>
              <input type="text" placeholder="Observaciones" />
              <button type="submit">Guardar</button>
            </form>
          </div>
        `;
      } else {
        html += `<p><em>El alumno aún no sube su Proyecto Final.</em></p>`;
      }

      html += `<button id="volver-lista">Volver</button>`;
      revisarDiv.innerHTML = html;
    }

    // Mostrar panel de revisión y ocultar lista
    listaAlumnosDiv.style.display = 'none';
    revisarDiv.style.display      = 'block';
  });

  // 3) Manejar envíos de formularios de calificación
  revisarDiv.addEventListener('submit', async e => {
    if (!e.target.matches('.form-calificar')) return;
    e.preventDefault();

    const form     = e.target;
    // Extraemos el id del alumno del propio contenido:
    const alumnoId = form.closest('#revisar-contenido').querySelector('h3')?.textContent.split(' ')[2];
    const docType  = form.dataset.doc;           // 'anteproyecto' | 'reporte' | 'final'
    const index    = form.dataset.index;         // índice para reportes (si aplica)
    const estado   = form.querySelector('select').value;
    const observ   = form.querySelector('input[type="text"]').value;

    const refRes = doc(db, 'residencias', alumnoId);
    const snap   = await getDoc(refRes);
    const data   = snap.data();

    if (docType === 'anteproyecto') {
      await updateDoc(refRes, {
        'anteproyecto.docente': estado,
        'anteproyecto.obsDocente': observ
      });
    } else if (docType === 'reporte') {
      // Si usas arreglo de reportes:
      if (Array.isArray(data.reporteParcial)) {
        const rptArr = data.reporteParcial;
        rptArr[index].docente    = estado;
        rptArr[index].obsDocente = observ;
        await updateDoc(refRes, { reporteParcial: rptArr });
      } else {
        // Si usas campo único 'reporteParcial.url'
        await updateDoc(refRes, {
          'reporteParcial.docente': estado,
          'reporteParcial.obsDocente': observ
        });
      }
    } else if (docType === 'final') {
      await updateDoc(refRes, {
        'proyectoFinal.docente': estado,
        'proyectoFinal.obsDocente': observ
      });
    }

    alert('Calificación guardada.');
  });

  // 4) Botón “Volver” dentro de revisión
  revisarDiv.addEventListener('click', e => {
    if (e.target.matches('#volver-lista')) {
      revisarDiv.style.display      = 'none';
      listaAlumnosDiv.style.display = 'block';
    }
  });
});
