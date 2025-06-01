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
    // Sin usuario → ir a index
    return window.location.href = 'index.html';
  }

  const uid = user.uid;

  // 1) Verificar rol “alumno”
  const perfilSnap = await getDoc(doc(db, 'usuarios', uid));
  if (!perfilSnap.exists() || perfilSnap.data().rol !== 'alumno') {
    alert('Acceso denegado: Solo alumnos pueden ver este panel.');
    await signOut(auth);
    return window.location.href = 'index.html';
  }

  // 2) Bienvenida
  const nombreAlumno = perfilSnap.data().nombre || '';
  document.getElementById('bienvenida-text').textContent = `Bienvenido(a), ${nombreAlumno}`;

  // 3) Obtener documento en Firestore
  const resRef = doc(db, 'residencias', uid);
  const resSnap = await getDoc(resRef);
  if (!resSnap.exists()) {
    console.error('No existe el documento residencias para este alumno.');
    return;
  }
  // Guardamos localmente la data para ir actualizando sin recargar
  const data = resSnap.data();

  // 4) Mostrar lista de asesores
  const listaAsesoresUL = document.getElementById('lista-asesores');
  listaAsesoresUL.innerHTML = '';
  if (Array.isArray(data.asesores) && data.asesores.length > 0) {
    for (const uidDocente of data.asesores) {
      const docSnap = await getDoc(doc(db, 'usuarios', uidDocente));
      const nombreDocente = docSnap.exists() ? docSnap.data().nombre : '[Docente eliminado]';
      const li = document.createElement('li');
      li.textContent = nombreDocente;
      listaAsesoresUL.appendChild(li);
    }
  } else {
    const li = document.createElement('li');
    li.textContent = 'Aún no tienes asesores asignados.';
    listaAsesoresUL.appendChild(li);
  }

  // 5) Función para renderizar “Mis Documentos”
  function renderizarDocumentos() {
    enlacesDiv.innerHTML = ''; // Limpiar

    // ************* ANTEPROYECTO *************
    const bloqueAnte = document.createElement('div');
    bloqueAnte.classList.add('enlace-con-estado');

    // 5.1) Enlace o texto “Sin archivo”
    if (data.anteproyecto?.url) {
      const enlaceAnte = document.createElement('a');
      enlaceAnte.href = data.anteproyecto.url;
      enlaceAnte.target = '_blank';
      enlaceAnte.textContent = 'Ver Anteproyecto';
      enlaceAnte.classList.add('btn-enlace');
      bloqueAnte.appendChild(enlaceAnte);
    } else {
      const spanNoFile = document.createElement('span');
      spanNoFile.textContent = 'Anteproyecto: Sin archivo subido';
      spanNoFile.classList.add('status-pendiente');
      bloqueAnte.appendChild(spanNoFile);
    }

    // 5.2) Evaluaciones de cada docente
    if (data.anteproyecto?.evaluacionesDocente) {
      for (const [uidDoc, evalObj] of Object.entries(data.anteproyecto.evaluacionesDocente)) {
        const docSnap = await getDoc(doc(db, 'usuarios', uidDoc));
        const nombreDoc = docSnap.exists() ? docSnap.data().nombre : '[Docente eliminado]';
        const estadoDoc = evalObj.estado || 'pendiente';
        const textoDoc = estadoDoc === 'aprobado'
          ? `Aprobado por ${nombreDoc}`
          : estadoDoc === 'rechazado'
            ? `Rechazado por ${nombreDoc}`
            : `Pendiente evaluación de ${nombreDoc}`;
        const spanE = document.createElement('span');
        spanE.textContent = textoDoc;
        spanE.classList.add(
          estadoDoc === 'aprobado'
            ? 'status-aprobado'
            : estadoDoc === 'rechazado'
              ? 'status-rechazado'
              : 'status-pendiente'
        );
        bloqueAnte.appendChild(spanE);
      }
    }

    // 5.3) Evaluación del Admin
    if (data.anteproyecto?.adminEstado && data.anteproyecto.adminEstado !== 'pendiente') {
      const textoAdm = data.anteproyecto.adminEstado === 'aprobado'
        ? 'Aprobado por Admin'
        : 'Rechazado por Admin';
      const spanAdmin = document.createElement('span');
      spanAdmin.textContent = textoAdm;
      spanAdmin.classList.add(
        data.anteproyecto.adminEstado === 'aprobado'
          ? 'status-aprobado'
          : 'status-rechazado'
      );
      bloqueAnte.appendChild(spanAdmin);
    }

    // 5.4) Comentarios de cada docente
    if (data.anteproyecto?.evaluacionesDocente) {
      for (const [uidDoc, evalObj] of Object.entries(data.anteproyecto.evaluacionesDocente)) {
        if (evalObj.obs) {
          const docSnap = await getDoc(doc(db, 'usuarios', uidDoc));
          const nombreDoc = docSnap.exists() ? docSnap.data().nombre : '[Docente eliminado]';
          const pObs = document.createElement('p');
          pObs.innerHTML = `<strong>Comentario de ${nombreDoc}:</strong> ${evalObj.obs}`;
          bloqueAnte.appendChild(pObs);
        }
      }
    }

    // 5.5) Comentarios del Admin
    if (data.anteproyecto?.adminObs) {
      const pObsAdm = document.createElement('p');
      pObsAdm.innerHTML = `<strong>Comentario Admin:</strong> ${data.anteproyecto.adminObs}`;
      bloqueAnte.appendChild(pObsAdm);
    }

    enlacesDiv.appendChild(bloqueAnte);

    // ************* REPORTE PARCIAL *************
    const bloqueRep = document.createElement('div');
    bloqueRep.classList.add('enlace-con-estado');

    if (data.reporteParcial?.url) {
      const enlaceRep = document.createElement('a');
      enlaceRep.href = data.reporteParcial.url;
      enlaceRep.target = '_blank';
      enlaceRep.textContent = 'Ver Reporte Parcial';
      enlaceRep.classList.add('btn-enlace');
      bloqueRep.appendChild(enlaceRep);
    } else {
      const spanNoFileR = document.createElement('span');
      spanNoFileR.textContent = 'Reporte Parcial: Sin archivo subido';
      spanNoFileR.classList.add('status-pendiente');
      bloqueRep.appendChild(spanNoFileR);
    }

    if (data.reporteParcial?.evaluacionesDocente) {
      for (const [uidDoc, evalObj] of Object.entries(data.reporteParcial.evaluacionesDocente)) {
        const docSnap = await getDoc(doc(db, 'usuarios', uidDoc));
        const nombreDoc = docSnap.exists() ? docSnap.data().nombre : '[Docente eliminado]';
        const estadoDoc = evalObj.estado || 'pendiente';
        const textoDoc = estadoDoc === 'aprobado'
          ? `Aprobado por ${nombreDoc}`
          : estadoDoc === 'rechazado'
            ? `Rechazado por ${nombreDoc}`
            : `Pendiente evaluación de ${nombreDoc}`;
        const spanE = document.createElement('span');
        spanE.textContent = textoDoc;
        spanE.classList.add(
          estadoDoc === 'aprobado'
            ? 'status-aprobado'
            : estadoDoc === 'rechazado'
              ? 'status-rechazado'
              : 'status-pendiente'
        );
        bloqueRep.appendChild(spanE);
      }
    }

    if (data.reporteParcial?.adminEstado && data.reporteParcial.adminEstado !== 'pendiente') {
      const textoAdm = data.reporteParcial.adminEstado === 'aprobado'
        ? 'Aprobado por Admin'
        : 'Rechazado por Admin';
      const spanAdminR = document.createElement('span');
      spanAdminR.textContent = textoAdm;
      spanAdminR.classList.add(
        data.reporteParcial.adminEstado === 'aprobado'
          ? 'status-aprobado'
          : 'status-rechazado'
      );
      bloqueRep.appendChild(spanAdminR);
    }

    if (data.reporteParcial?.evaluacionesDocente) {
      for (const [uidDoc, evalObj] of Object.entries(data.reporteParcial.evaluacionesDocente)) {
        if (evalObj.obs) {
          const docSnap = await getDoc(doc(db, 'usuarios', uidDoc));
          const nombreDoc = docSnap.exists() ? docSnap.data().nombre : '[Docente eliminado]';
          const pObs = document.createElement('p');
          pObs.innerHTML = `<strong>Comentario de ${nombreDoc}:</strong> ${evalObj.obs}`;
          bloqueRep.appendChild(pObs);
        }
      }
    }

    if (data.reporteParcial?.adminObs) {
      const pObsAdmR = document.createElement('p');
      pObsAdmR.innerHTML = `<strong>Comentario Admin:</strong> ${data.reporteParcial.adminObs}`;
      bloqueRep.appendChild(pObsAdmR);
    }

    enlacesDiv.appendChild(bloqueRep);

    // ************* PROYECTO FINAL *************
    const bloqueFin = document.createElement('div');
    bloqueFin.classList.add('enlace-con-estado');

    if (data.proyectoFinal?.url) {
      const enlaceFin = document.createElement('a');
      enlaceFin.href = data.proyectoFinal.url;
      enlaceFin.target = '_blank';
      enlaceFin.textContent = 'Ver Proyecto Final';
      enlaceFin.classList.add('btn-enlace');
      bloqueFin.appendChild(enlaceFin);
    } else {
      const spanNoFileF = document.createElement('span');
      spanNoFileF.textContent = 'Proyecto Final: Sin archivo subido';
      spanNoFileF.classList.add('status-pendiente');
      bloqueFin.appendChild(spanNoFileF);
    }

    if (data.proyectoFinal?.evaluacionesDocente) {
      for (const [uidDoc, evalObj] of Object.entries(data.proyectoFinal.evaluacionesDocente)) {
        const docSnap = await getDoc(doc(db, 'usuarios', uidDoc));
        const nombreDoc = docSnap.exists() ? docSnap.data().nombre : '[Docente eliminado]';
        const estadoDoc = evalObj.estado || 'pendiente';
        const textoDoc = estadoDoc === 'aprobado'
          ? `Aprobado por ${nombreDoc}`
          : estadoDoc === 'rechazado'
            ? `Rechazado por ${nombreDoc}`
            : `Pendiente evaluación de ${nombreDoc}`;
        const spanE = document.createElement('span');
        spanE.textContent = textoDoc;
        spanE.classList.add(
          estadoDoc === 'aprobado'
            ? 'status-aprobado'
            : estadoDoc === 'rechazado'
              ? 'status-rechazado'
              : 'status-pendiente'
        );
        bloqueFin.appendChild(spanE);
      }
    }

    if (data.proyectoFinal?.adminEstado && data.proyectoFinal.adminEstado !== 'pendiente') {
      const textoAdm = data.proyectoFinal.adminEstado === 'aprobado'
        ? 'Aprobado por Admin'
        : 'Rechazado por Admin';
      const spanAdminF = document.createElement('span');
      spanAdminF.textContent = textoAdm;
      spanAdminF.classList.add(
        data.proyectoFinal.adminEstado === 'aprobado'
          ? 'status-aprobado'
          : 'status-rechazado'
      );
      bloqueFin.appendChild(spanAdminF);
    }

    if (data.proyectoFinal?.evaluacionesDocente) {
      for (const [uidDoc, evalObj] of Object.entries(data.proyectoFinal.evaluacionesDocente)) {
        if (evalObj.obs) {
          const docSnap = await getDoc(doc(db, 'usuarios', uidDoc));
          const nombreDoc = docSnap.exists() ? docSnap.data().nombre : '[Docente eliminado]';
          const pObs = document.createElement('p');
          pObs.innerHTML = `<strong>Comentario de ${nombreDoc}:</strong> ${evalObj.obs}`;
          bloqueFin.appendChild(pObs);
        }
      }
    }

    if (data.proyectoFinal?.adminObs) {
      const pObsAdmF = document.createElement('p');
      pObsAdmF.innerHTML = `<strong>Comentario Admin:</strong> ${data.proyectoFinal.adminObs}`;
      bloqueFin.appendChild(pObsAdmF);
    }

    enlacesDiv.appendChild(bloqueFin);
  }

  // Referencia del contenedor de enlaces
  const enlacesDiv = document.getElementById('enlaces-documentos');
  renderizarDocumentos();

  // 6) Botón “Cerrar Sesión” → redirigir a index.html
  document.getElementById('logout-button').addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = 'index.html';
  });

  // 7) Mostrar / ocultar formularios
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

  // 8) SUBIR ANTEPROYECTO
  document.getElementById('form-anteproyecto').addEventListener('submit', async (e) => {
    e.preventDefault();
    const file = document.getElementById('archivo').files[0];
    if (!file) {
      return alert('Debes seleccionar un PDF de anteproyecto.');
    }
    try {
      const url = await uploadPdf(file, `anteproyectos/${uid}.pdf`);
      // Actualizar Firestore: establecemos URL y dejamos evaluacionesDocente vacío, admin en "pendiente"
      await updateDoc(resRef, {
        'anteproyecto.url': url,
        'anteproyecto.evaluacionesDocente': {},  // reseteamos cualquier evaluación previa del docente
        'anteproyecto.adminEstado': 'pendiente',
        'anteproyecto.adminObs': ''
      });
      // Actualizamos variable local
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

  // 9) SUBIR REPORTE PARCIAL
  document.getElementById('form-reporte').addEventListener('submit', async (e) => {
    e.preventDefault();
    const file = document.getElementById('reporte').files[0];
    if (!file) {
      return alert('Debes seleccionar un PDF de reporte parcial.');
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

  // 10) SUBIR PROYECTO FINAL
  document.getElementById('form-final').addEventListener('submit', async (e) => {
    e.preventDefault();
    const file = document.getElementById('final').files[0];
    if (!file) {
      return alert('Debes seleccionar un PDF de proyecto final.');
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
