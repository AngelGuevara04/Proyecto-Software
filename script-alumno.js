// script-alumno.js

import { app, db } from './firebase-config.js';
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import {
  doc,
  getDoc,
  updateDoc
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';
import { uploadPdf } from './storage-helper.js';

const auth = getAuth(app);

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    // Sin usuario → redirigir a página principal
    window.location.href = 'index.html';
    return;
  }

  const uid = user.uid;

  // 1) Verificar rol “alumno”
  const perfilSnap = await getDoc(doc(db, 'usuarios', uid));
  if (!perfilSnap.exists() || perfilSnap.data().rol !== 'alumno') {
    alert('Acceso denegado: Solo alumnos pueden ver este panel.');
    await signOut(auth);
    window.location.href = 'index.html';
    return;
  }

  // 2) Mostrar nombre en “Bienvenido, <nombre>”
  const nombreAlumno = perfilSnap.data().nombre || '';
  document.getElementById('bienvenida-text').textContent = `Bienvenido(a), ${nombreAlumno}`;

  // 3) Obtener documento “residencias/{uid}” y guardarlo localmente
  const resRef = doc(db, 'residencias', uid);
  const resSnap = await getDoc(resRef);
  if (!resSnap.exists()) {
    console.error('No existe el documento residencias para este alumno.');
    return;
  }
  const data = resSnap.data();

  // 4) Mostrar lista de asesores y construir mapa uidDocente → nombreDocente
  const listaAsesoresUL = document.getElementById('lista-asesores');
  listaAsesoresUL.innerHTML = '';
  const docentesNombres = {};

  if (Array.isArray(data.asesores) && data.asesores.length > 0) {
    for (const uidDocente of data.asesores) {
      const docSnap = await getDoc(doc(db, 'usuarios', uidDocente));
      const nombreDocente = docSnap.exists()
        ? docSnap.data().nombre
        : '[Docente eliminado]';
      docentesNombres[uidDocente] = nombreDocente;
      const li = document.createElement('li');
      li.textContent = nombreDocente;
      listaAsesoresUL.appendChild(li);
    }
  } else {
    const li = document.createElement('li');
    li.textContent = 'Aún no tienes asesores asignados.';
    listaAsesoresUL.appendChild(li);
  }

  // 5) Función sincrónica para renderizar tablas en “Mis Documentos”
  function renderizarDocumentos() {
    enlacesDiv.innerHTML = ''; // Limpiar contenedor

    // —========== ANTEPROYECTO ==========—
    const tableAnt = document.createElement('table');
    tableAnt.innerHTML = `
      <caption>Anteproyecto</caption>
      <thead>
        <tr>
          <th>Enlace</th>
          <th>Asesor</th>
          <th>Estado</th>
          <th>Comentario</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbodyAnt = tableAnt.querySelector('tbody');

    if (data.anteproyecto?.url) {
      // Creamos variable con el HTML del enlace para reusar
      const enlaceCell = `<a href="${data.anteproyecto.url}" target="_blank">Descargar PDF</a>`;

      // Si hay evaluacionesDocente definidas (ya sea un objeto vacío o con datos)
      const evAnt = data.anteproyecto.evaluacionesDocente;
      if (evAnt && typeof evAnt === 'object' && Object.keys(evAnt).length > 0) {
        // Recorremos cada evaluator (docente) que haya dejado un estado
        for (const uidDoc of Object.keys(evAnt)) {
          const evalObj = evAnt[uidDoc];
          const nombreDoc = docentesNombres[uidDoc] || '[Docente eliminado]';
          const estadoDoc = evalObj.estado || 'pendiente';
          const textoEstado =
            estadoDoc === 'aprobado'
              ? 'Aprobado'
              : estadoDoc === 'rechazado'
              ? 'Rechazado'
              : 'Pendiente';
          const claseEstado =
            estadoDoc === 'aprobado'
              ? 'status-aprobado'
              : estadoDoc === 'rechazado'
              ? 'status-rechazado'
              : 'status-pendiente';
          const comentarioDoc = evalObj.obs || '';

          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${enlaceCell}</td>
            <td>${nombreDoc}</td>
            <td class="${claseEstado}">${textoEstado}</td>
            <td>${comentarioDoc}</td>
          `;
          tbodyAnt.appendChild(row);
        }
      } else if (Array.isArray(data.asesores) && data.asesores.length > 0) {
        // Si no hay evaluaciones, pero sí hay asesores asignados,
        // creamos una fila “Pendiente” para cada asesor
        for (const uidDoc of data.asesores) {
          const nombreDoc = docentesNombres[uidDoc] || '[Docente eliminado]';
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${enlaceCell}</td>
            <td>${nombreDoc}</td>
            <td class="status-pendiente">Pendiente</td>
            <td></td>
          `;
          tbodyAnt.appendChild(row);
        }
      } else {
        // Ni evaluaciones ni asesores → mostramos una sola fila para el enlace
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${enlaceCell}</td>
          <td colspan="3" class="status-pendiente">Pendiente (sin asesor asignado)</td>
        `;
        tbodyAnt.appendChild(row);
      }

      // Agregar fila de Admin si ya calificó
      if (data.anteproyecto.adminEstado && data.anteproyecto.adminEstado !== 'pendiente') {
        const textoAdm =
          data.anteproyecto.adminEstado === 'aprobado'
            ? 'Aprobado'
            : 'Rechazado';
        const claseAdm =
          data.anteproyecto.adminEstado === 'aprobado'
            ? 'status-aprobado'
            : 'status-rechazado';
        const comentarioAdm = data.anteproyecto.adminObs || '';
        const rowAdm = document.createElement('tr');
        rowAdm.innerHTML = `
          <td></td>
          <td><strong>Admin</strong></td>
          <td class="${claseAdm}">${textoAdm}</td>
          <td>${comentarioAdm}</td>
        `;
        tbodyAnt.appendChild(rowAdm);
      }
    } else {
      // Si no hay URL, ponemos una sola fila indicando “Sin archivo subido”
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><em>Sin archivo</em></td>
        <td colspan="3" class="status-pendiente">Ningún archivo subido aún</td>
      `;
      tbodyAnt.appendChild(row);
    }

    enlacesDiv.appendChild(tableAnt);

    // —========== REPORTE PARCIAL ==========—
    const tableRep = document.createElement('table');
    tableRep.innerHTML = `
      <caption>Reporte Parcial</caption>
      <thead>
        <tr>
          <th>Enlace</th>
          <th>Asesor</th>
          <th>Estado</th>
          <th>Comentario</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbodyRep = tableRep.querySelector('tbody');

    if (data.reporteParcial?.url) {
      const enlaceCell = `<a href="${data.reporteParcial.url}" target="_blank">Descargar PDF</a>`;

      const evRep = data.reporteParcial.evaluacionesDocente;
      if (evRep && typeof evRep === 'object' && Object.keys(evRep).length > 0) {
        for (const uidDoc of Object.keys(evRep)) {
          const evalObj = evRep[uidDoc];
          const nombreDoc = docentesNombres[uidDoc] || '[Docente eliminado]';
          const estadoDoc = evalObj.estado || 'pendiente';
          const textoEstado =
            estadoDoc === 'aprobado'
              ? 'Aprobado'
              : estadoDoc === 'rechazado'
              ? 'Rechazado'
              : 'Pendiente';
          const claseEstado =
            estadoDoc === 'aprobado'
              ? 'status-aprobado'
              : estadoDoc === 'rechazado'
              ? 'status-rechazado'
              : 'status-pendiente';
          const comentarioDoc = evalObj.obs || '';

          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${enlaceCell}</td>
            <td>${nombreDoc}</td>
            <td class="${claseEstado}">${textoEstado}</td>
            <td>${comentarioDoc}</td>
          `;
          tbodyRep.appendChild(row);
        }
      } else if (Array.isArray(data.asesores) && data.asesores.length > 0) {
        for (const uidDoc of data.asesores) {
          const nombreDoc = docentesNombres[uidDoc] || '[Docente eliminado]';
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${enlaceCell}</td>
            <td>${nombreDoc}</td>
            <td class="status-pendiente">Pendiente</td>
            <td></td>
          `;
          tbodyRep.appendChild(row);
        }
      } else {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${enlaceCell}</td>
          <td colspan="3" class="status-pendiente">Pendiente (sin asesor asignado)</td>
        `;
        tbodyRep.appendChild(row);
      }

      if (data.reporteParcial.adminEstado && data.reporteParcial.adminEstado !== 'pendiente') {
        const textoAdm =
          data.reporteParcial.adminEstado === 'aprobado'
            ? 'Aprobado'
            : 'Rechazado';
        const claseAdm =
          data.reporteParcial.adminEstado === 'aprobado'
            ? 'status-aprobado'
            : 'status-rechazado';
        const comentarioAdm = data.reporteParcial.adminObs || '';
        const rowAdm = document.createElement('tr');
        rowAdm.innerHTML = `
          <td></td>
          <td><strong>Admin</strong></td>
          <td class="${claseAdm}">${textoAdm}</td>
          <td>${comentarioAdm}</td>
        `;
        tbodyRep.appendChild(rowAdm);
      }
    } else {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><em>Sin archivo</em></td>
        <td colspan="3" class="status-pendiente">Ningún archivo subido aún</td>
      `;
      tbodyRep.appendChild(row);
    }

    enlacesDiv.appendChild(tableRep);

    // —========== PROYECTO FINAL ==========—
    const tableFin = document.createElement('table');
    tableFin.innerHTML = `
      <caption>Proyecto Final</caption>
      <thead>
        <tr>
          <th>Enlace</th>
          <th>Asesor</th>
          <th>Estado</th>
          <th>Comentario</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbodyFin = tableFin.querySelector('tbody');

    if (data.proyectoFinal?.url) {
      const enlaceCell = `<a href="${data.proyectoFinal.url}" target="_blank">Descargar PDF</a>`;

      const evFin = data.proyectoFinal.evaluacionesDocente;
      if (evFin && typeof evFin === 'object' && Object.keys(evFin).length > 0) {
        for (const uidDoc of Object.keys(evFin)) {
          const evalObj = evFin[uidDoc];
          const nombreDoc = docentesNombres[uidDoc] || '[Docente eliminado]';
          const estadoDoc = evalObj.estado || 'pendiente';
          const textoEstado =
            estadoDoc === 'aprobado'
              ? 'Aprobado'
              : estadoDoc === 'rechazado'
              ? 'Rechazado'
              : 'Pendiente';
          const claseEstado =
            estadoDoc === 'aprobado'
              ? 'status-aprobado'
              : estadoDoc === 'rechazado'
              ? 'status-rechazado'
              : 'status-pendiente';
          const comentarioDoc = evalObj.obs || '';

          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${enlaceCell}</td>
            <td>${nombreDoc}</td>
            <td class="${claseEstado}">${textoEstado}</td>
            <td>${comentarioDoc}</td>
          `;
          tbodyFin.appendChild(row);
        }
      } else if (Array.isArray(data.asesores) && data.asesores.length > 0) {
        for (const uidDoc of data.asesores) {
          const nombreDoc = docentesNombres[uidDoc] || '[Docente eliminado]';
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${enlaceCell}</td>
            <td>${nombreDoc}</td>
            <td class="status-pendiente">Pendiente</td>
            <td></td>
          `;
          tbodyFin.appendChild(row);
        }
      } else {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${enlaceCell}</td>
          <td colspan="3" class="status-pendiente">Pendiente (sin asesor asignado)</td>
        `;
        tbodyFin.appendChild(row);
      }

      if (data.proyectoFinal.adminEstado && data.proyectoFinal.adminEstado !== 'pendiente') {
        const textoAdm =
          data.proyectoFinal.adminEstado === 'aprobado'
            ? 'Aprobado'
            : 'Rechazado';
        const claseAdm =
          data.proyectoFinal.adminEstado === 'aprobado'
            ? 'status-aprobado'
            : 'status-rechazado';
        const comentarioAdm = data.proyectoFinal.adminObs || '';
        const rowAdm = document.createElement('tr');
        rowAdm.innerHTML = `
          <td></td>
          <td><strong>Admin</strong></td>
          <td class="${claseAdm}">${textoAdm}</td>
          <td>${comentarioAdm}</td>
        `;
        tbodyFin.appendChild(rowAdm);
      }
    } else {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><em>Sin archivo</em></td>
        <td colspan="3" class="status-pendiente">Ningún archivo subido aún</td>
      `;
      tbodyFin.appendChild(row);
    }

    enlacesDiv.appendChild(tableFin);
  }

  // 6) Referencia al contenedor y primera llamada
  const enlacesDiv = document.getElementById('enlaces-documentos');
  renderizarDocumentos();

  // 7) Botón “Cerrar Sesión” → redirigir a index.html
  document.getElementById('logout-button').addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = 'index.html';
  });

  // 8) Mostrar / ocultar formularios
  const btnMostrarAnte = document.getElementById('btn-mostrar-ante');
  const btnMostrarRep  = document.getElementById('btn-mostrar-rep');
  const btnMostrarFin  = document.getElementById('btn-mostrar-fin');

  const contAnte = document.getElementById('form-ante-container');
  const contRep  = document.getElementById('form-rep-container');
  const contFin  = document.getElementById('form-fin-container');

  btnMostrarAnte.addEventListener('click', () => {
    contAnte.style.display = contAnte.style.display === 'none' ? 'block' : 'none';
    contRep.style.display = 'none';
    contFin.style.display = 'none';
  });
  btnMostrarRep.addEventListener('click', () => {
    contRep.style.display = contRep.style.display === 'none' ? 'block' : 'none';
    contAnte.style.display = 'none';
    contFin.style.display = 'none';
  });
  btnMostrarFin.addEventListener('click', () => {
    contFin.style.display = contFin.style.display === 'none' ? 'block' : 'none';
    contAnte.style.display = 'none';
    contRep.style.display = 'none';
  });

  // 9) SUBIR ANTEPROYECTO
  document.getElementById('form-anteproyecto').addEventListener('submit', async (e) => {
    e.preventDefault();
    const file = document.getElementById('archivo').files[0];
    if (!file) {
      alert('Debes seleccionar un PDF de anteproyecto.');
      return;
    }
    try {
      const url = await uploadPdf(file, `anteproyectos/${uid}.pdf`);
      await updateDoc(resRef, {
        'anteproyecto.url': url,
        'anteproyecto.evaluacionesDocente': {},
        'anteproyecto.adminEstado': 'pendiente',
        'anteproyecto.adminObs': ''
      });
      data.anteproyecto.url = url;
      data.anteproyecto.evaluacionesDocente = {};
      data.anteproyecto.adminEstado = 'pendiente';
      data.anteproyecto.adminObs = '';
      renderizarDocumentos();
      alert('Anteproyecto subido correctamente.');
      contAnte.style.display = 'none';
    } catch (error) {
      console.error(error);
      alert('Error al subir anteproyecto: ' + error.message);
    }
  });

  // 10) SUBIR REPORTE PARCIAL
  document.getElementById('form-reporte').addEventListener('submit', async (e) => {
    e.preventDefault();
    const file = document.getElementById('reporte').files[0];
    if (!file) {
      alert('Debes seleccionar un PDF de reporte parcial.');
      return;
    }
    try {
      const url = await uploadPdf(file, `reportes/${uid}.pdf`);
      await updateDoc(resRef, {
        'reporteParcial.url': url,
        'reporteParcial.evaluacionesDocente': {},
        'reporteParcial.adminEstado': 'pendiente',
        'reporteParcial.adminObs': ''
      });
      data.reporteParcial.url = url;
      data.reporteParcial.evaluacionesDocente = {};
      data.reporteParcial.adminEstado = 'pendiente';
      data.reporteParcial.adminObs = '';
      renderizarDocumentos();
      alert('Reporte parcial subido correctamente.');
      contRep.style.display = 'none';
    } catch (error) {
      console.error(error);
      alert('Error al subir reporte: ' + error.message);
    }
  });

  // 11) SUBIR PROYECTO FINAL
  document.getElementById('form-final').addEventListener('submit', async (e) => {
    e.preventDefault();
    const file = document.getElementById('final').files[0];
    if (!file) {
      alert('Debes seleccionar un PDF de proyecto final.');
      return;
    }
    try {
      const url = await uploadPdf(file, `finales/${uid}.pdf`);
      await updateDoc(resRef, {
        'proyectoFinal.url': url,
        'proyectoFinal.evaluacionesDocente': {},
        'proyectoFinal.adminEstado': 'pendiente',
        'proyectoFinal.adminObs': ''
      });
      data.proyectoFinal.url = url;
      data.proyectoFinal.evaluacionesDocente = {};
      data.proyectoFinal.adminEstado = 'pendiente';
      data.proyectoFinal.adminObs = '';
      renderizarDocumentos();
      alert('Proyecto final subido correctamente.');
      contFin.style.display = 'none';
    } catch (error) {
      console.error(error);
      alert('Error al subir proyecto final: ' + error.message);
    }
  });
});
