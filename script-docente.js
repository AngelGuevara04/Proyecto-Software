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

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = 'index.html';
    return;
  }

  const miUID = user.uid;

  // 1) Verificar rol “docente”
  const perfilSnap = await getDoc(doc(db, 'usuarios', miUID));
  if (!perfilSnap.exists() || perfilSnap.data().rol !== 'docente') {
    alert('Acceso denegado: Solo docentes pueden ver este panel.');
    await signOut(auth);
    window.location.href = 'index.html';
    return;
  }

  // 2) Botón Cerrar Sesión → index.html
  document.getElementById('logout-button').addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = 'index.html';
  });

  // 3) Query alumnos asignados (asesores array-contains miUID)
  const q = query(
    collection(db, 'residencias'),
    where('asesores', 'array-contains', miUID)
  );
  const snapshot = await getDocs(q);

  const listaAlumnosDiv = document.getElementById('lista-alumnos');
  const revisarDiv      = document.getElementById('revisar-contenido');

  listaAlumnosDiv.innerHTML = '';
  revisarDiv.style.display   = 'none';

  // 4) Generar listado de alumnos
  for (const resDoc of snapshot.docs) {
    const uidAlumno = resDoc.id;
    // Obtener nombre real desde 'usuarios/{uidAlumno}'
    const uSnap = await getDoc(doc(db, 'usuarios', uidAlumno));
    const nombreAlumno = uSnap.exists() ? uSnap.data().nombre : '[Alumno Eliminado]';

    const tarjeta = document.createElement('div');
    tarjeta.classList.add('alumno-card');
    tarjeta.innerHTML = `
      <span class="nombre-alumno">${nombreAlumno}</span>
      <button data-uid="${uidAlumno}" class="btn-revisar">Revisar Documentos</button>
    `;
    listaAlumnosDiv.appendChild(tarjeta);
  }

  // 5) Manejar clic en “Revisar Documentos”
  listaAlumnosDiv.addEventListener('click', async (e) => {
    if (!e.target.matches('.btn-revisar')) return;
    const uidAlumno = e.target.dataset.uid;

    const resSnap = await getDoc(doc(db, 'residencias', uidAlumno));
    if (!resSnap.exists()) {
      revisarDiv.innerHTML = '<p>No hay datos para este alumno.</p>';
    } else {
      const d = resSnap.data();
      let html = `<h3>Documentos de ${uidAlumno}</h3>`;

      // 5.1) Anteproyecto
      if (d.anteproyecto?.url) {
        html += `
          <div class="item-doc">
            <a href="${d.anteproyecto.url}" target="_blank">Descargar Anteproyecto</a>
            <form data-doc="anteproyecto" class="form-calificar">
              <label>Estado:</label>
              <select required>
                <option value="">-- Seleccione --</option>
                <option value="aprobado" ${d.anteproyecto.evaluacionesDocente?.[miUID]?.estado === 'aprobado' ? 'selected' : ''}>Aprobado</option>
                <option value="rechazado" ${d.anteproyecto.evaluacionesDocente?.[miUID]?.estado === 'rechazado' ? 'selected' : ''}>Rechazado</option>
              </select><br/>
              <label>Comentarios:</label><br/>
              <textarea rows="3">${d.anteproyecto.evaluacionesDocente?.[miUID]?.obs || ''}</textarea><br/>
              <button type="submit" class="btn-calificar">Guardar</button>
            </form>
          </div>
        `;
      } else {
        html += `<p><em>El alumno aún no sube su Anteproyecto.</em></p>`;
      }

      // 5.2) Reporte Parcial
      if (d.reporteParcial?.url) {
        html += `
          <div class="item-doc">
            <a href="${d.reporteParcial.url}" target="_blank">Descargar Reporte Parcial</a>
            <form data-doc="reporteParcial" class="form-calificar">
              <label>Estado:</label>
              <select required>
                <option value="">-- Seleccione --</option>
                <option value="aprobado" ${d.reporteParcial.evaluacionesDocente?.[miUID]?.estado === 'aprobado' ? 'selected' : ''}>Aprobado</option>
                <option value="rechazado" ${d.reporteParcial.evaluacionesDocente?.[miUID]?.estado === 'rechazado' ? 'selected' : ''}>Rechazado</option>
              </select><br/>
              <label>Comentarios:</label><br/>
              <textarea rows="3">${d.reporteParcial.evaluacionesDocente?.[miUID]?.obs || ''}</textarea><br/>
              <button type="submit" class="btn-calificar">Guardar</button>
            </form>
          </div>
        `;
      } else {
        html += `<p><em>El alumno aún no sube su Reporte Parcial.</em></p>`;
      }

      // 5.3) Proyecto Final
      if (d.proyectoFinal?.url) {
        html += `
          <div class="item-doc">
            <a href="${d.proyectoFinal.url}" target="_blank">Descargar Proyecto Final</a>
            <form data-doc="proyectoFinal" class="form-calificar">
              <label>Estado:</label>
              <select required>
                <option value="">-- Seleccione --</option>
                <option value="aprobado" ${d.proyectoFinal.evaluacionesDocente?.[miUID]?.estado === 'aprobado' ? 'selected' : ''}>Aprobado</option>
                <option value="rechazado" ${d.proyectoFinal.evaluacionesDocente?.[miUID]?.estado === 'rechazado' ? 'selected' : ''}>Rechazado</option>
              </select><br/>
              <label>Comentarios:</label><br/>
              <textarea rows="3">${d.proyectoFinal.evaluacionesDocente?.[miUID]?.obs || ''}</textarea><br/>
              <button type="submit" class="btn-calificar">Guardar</button>
            </form>
          </div>
        `;
      } else {
        html += `<p><em>El alumno aún no sube su Proyecto Final.</em></p>`;
      }

      html += `<button id="btn-volver">Volver</button>`;
      revisarDiv.innerHTML = html;
    }

    // Ocultar lista y mostrar revisión
    listaAlumnosDiv.style.display = 'none';
    revisarDiv.style.display      = 'block';
  });

  // 6) Manejar envío de formularios de calificación
  revisarDiv.addEventListener('submit', async (e) => {
    if (!e.target.matches('.form-calificar')) return;
    e.preventDefault();

    const form = e.target;
    const docTipo = form.dataset.doc;  // "anteproyecto", "reporteParcial" o "proyectoFinal"
    const estado  = form.querySelector('select').value;
    const observ  = form.querySelector('textarea').value;

    // Extraer UID del alumno del <h3> “Documentos de <uidAlumno>”
    const tituloH3 = revisarDiv.querySelector('h3').textContent;
    const uidAlumno = tituloH3.replace('Documentos de ', '').trim();

    // Referencia a Firestore
    const refRes = doc(db, 'residencias', uidAlumno);

    // Construir objeto de actualización
    const campoEstado   = `${docTipo}.evaluacionesDocente.${miUID}.estado`;
    const campoObs      = `${docTipo}.evaluacionesDocente.${miUID}.obs`;

    const updateObj = {};
    updateObj[campoEstado] = estado;
    updateObj[campoObs]    = observ;

    await updateDoc(refRes, updateObj);

    alert('Calificación guardada.');

    // Hacer click en “Volver” para recargar la lista de nuevo
    document.getElementById('btn-volver').click();
  });

  // 7) Botón “Volver”
  revisarDiv.addEventListener('click', (e) => {
    if (e.target.matches('#btn-volver')) {
      revisarDiv.style.display      = 'none';
      listaAlumnosDiv.style.display = 'block';
    }
  });
});
