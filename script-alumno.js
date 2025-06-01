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
    // Si no hay usuario logueado, redirigir a inicio
    return window.location.href = 'index.html';
  }

  const uid = user.uid;

  // 1) Verificar rol en 'usuarios/{uid}'
  const perfilSnap = await getDoc(doc(db, 'usuarios', uid));
  if (!perfilSnap.exists() || perfilSnap.data().rol !== 'alumno') {
    alert('Acceso denegado: Solo alumnos pueden ver este panel.');
    await signOut(auth);
    return window.location.href = 'index.html';
  }

  // 2) Mostrar nombre en “Bienvenido, <nombre>”
  const nombreAlumno = perfilSnap.data().nombre || '';
  document.getElementById('bienvenida-text').textContent = `Bienvenido(a), ${nombreAlumno}`;

  // 3) Mostrar lista de asesores (hasta 2)
  const resRef = doc(db, 'residencias', uid);
  const resSnap = await getDoc(resRef);
  if (!resSnap.exists()) {
    console.error('No existe el documento residencias para este alumno.');
    return;
  }
  const data = resSnap.data();

  const listaAsesoresUL = document.getElementById('lista-asesores');
  listaAsesoresUL.innerHTML = '';
  if (Array.isArray(data.asesores) && data.asesores.length > 0) {
    for (const uidDocente of data.asesores) {
      // Obtener nombre de cada docente
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

  // 4) Mostrar enlaces y estados de PDF
  function renderizarDocumentos() {
    // Esta función se llama al cargar y cada vez que cambiamos algo
    enlacesDiv.innerHTML = ''; // Limpiar

    // ===================== Anteproyecto =====================
    const divAnte = document.createElement('div');
    divAnte.classList.add('enlace-con-estado');

    if (data.anteproyecto?.url) {
      // 4.1) Enlace
      const enlaceAnte = document.createElement('a');
      enlaceAnte.href = data.anteproyecto.url;
      enlaceAnte.target = '_blank';
      enlaceAnte.textContent = 'Ver Anteproyecto';
      enlaceAnte.classList.add('btn-enlace');
      divAnte.appendChild(enlaceAnte);

      // 4.2) Estado por docente
      let estadoDocente = data.anteproyecto.docente || 'pendiente';
      let textoEstadoDocente = '';
      let claseEstadoDocente = '';
      if (estadoDocente === 'aprobado') {
        textoEstadoDocente = 'Aprobado por Docente';
        claseEstadoDocente = 'status-aprobado';
      } else if (estadoDocente === 'rechazado') {
        textoEstadoDocente = 'Rechazado por Docente';
        claseEstadoDocente = 'status-rechazado';
      } else {
        textoEstadoDocente = 'Pendiente evaluación Docente';
        claseEstadoDocente = 'status-pendiente';
      }
      const spanDoc = document.createElement('span');
      spanDoc.textContent = textoEstadoDocente;
      spanDoc.classList.add(claseEstadoDocente);
      divAnte.appendChild(spanDoc);

      // 4.3) Estado por admin (solo si existe)
      if (data.anteproyecto.admin && data.anteproyecto.admin !== 'pendiente') {
        let estadoAdmin = data.anteproyecto.admin;
        let textoEstadoAdmin = '';
        let claseEstadoAdmin = '';
        if (estadoAdmin === 'aprobado') {
          textoEstadoAdmin = 'Aprobado por Admin';
          claseEstadoAdmin = 'status-aprobado';
        } else if (estadoAdmin === 'rechazado') {
          textoEstadoAdmin = 'Rechazado por Admin';
          claseEstadoAdmin = 'status-rechazado';
        }
        const spanAdmin = document.createElement('span');
        spanAdmin.textContent = textoEstadoAdmin;
        spanAdmin.classList.add(claseEstadoAdmin);
        divAnte.appendChild(spanAdmin);
      }

      // 4.4) Comentarios del docente
      if (data.anteproyecto.obsDocente) {
        const pObsDoc = document.createElement('p');
        pObsDoc.innerHTML = `<strong>Comentario Docente:</strong> ${data.anteproyecto.obsDocente}`;
        enlacesDiv.appendChild(pObsDoc);
      }
      // Comentarios del admin
      if (data.anteproyecto.obsAdmin) {
        const pObsAdmin = document.createElement('p');
        pObsAdmin.innerHTML = `<strong>Comentario Admin:</strong> ${data.anteproyecto.obsAdmin}`;
        enlacesDiv.appendChild(pObsAdmin);
      }
    } else {
      // No hay URL → mostrar “Sin archivo” + estado pendiente
      const spanNoFile = document.createElement('span');
      spanNoFile.textContent = 'Anteproyecto: Sin archivo subido';
      spanNoFile.classList.add('status-pendiente');
      divAnte.appendChild(spanNoFile);
    }
    enlacesDiv.appendChild(divAnte);

    // ===================== Reporte Parcial =====================
    const divRep = document.createElement('div');
    divRep.classList.add('enlace-con-estado');

    if (data.reporteParcial?.url) {
      const enlaceRep = document.createElement('a');
      enlaceRep.href = data.reporteParcial.url;
      enlaceRep.target = '_blank';
      enlaceRep.textContent = 'Ver Reporte Parcial';
      enlaceRep.classList.add('btn-enlace');
      divRep.appendChild(enlaceRep);

      let estadoDoc = data.reporteParcial.docente || 'pendiente';
      let textoDoc = '';
      let claseDoc = '';
      if (estadoDoc === 'aprobado') {
        textoDoc = 'Aprobado por Docente';
        claseDoc = 'status-aprobado';
      } else if (estadoDoc === 'rechazado') {
        textoDoc = 'Rechazado por Docente';
        claseDoc = 'status-rechazado';
      } else {
        textoDoc = 'Pendiente evaluación Docente';
        claseDoc = 'status-pendiente';
      }
      const spanDocR = document.createElement('span');
      spanDocR.textContent = textoDoc;
      spanDocR.classList.add(claseDoc);
      divRep.appendChild(spanDocR);

      if (data.reporteParcial.admin && data.reporteParcial.admin !== 'pendiente') {
        let estadoAdm = data.reporteParcial.admin;
        let textoAdm = estadoAdm === 'aprobado'
          ? 'Aprobado por Admin'
          : 'Rechazado por Admin';
        let claseAdm = estadoAdm === 'aprobado'
          ? 'status-aprobado'
          : 'status-rechazado';
        const spanAdmR = document.createElement('span');
        spanAdmR.textContent = textoAdm;
        spanAdmR.classList.add(claseAdm);
        divRep.appendChild(spanAdmR);
      }

      if (data.reporteParcial.obsDocente) {
        const pObsDocR = document.createElement('p');
        pObsDocR.innerHTML = `<strong>Comentario Docente:</strong> ${data.reporteParcial.obsDocente}`;
        enlacesDiv.appendChild(pObsDocR);
      }
      if (data.reporteParcial.obsAdmin) {
        const pObsAdmR = document.createElement('p');
        pObsAdmR.innerHTML = `<strong>Comentario Admin:</strong> ${data.reporteParcial.obsAdmin}`;
        enlacesDiv.appendChild(pObsAdmR);
      }
    } else {
      const spanNoFileR = document.createElement('span');
      spanNoFileR.textContent = 'Reporte Parcial: Sin archivo subido';
      spanNoFileR.classList.add('status-pendiente');
      divRep.appendChild(spanNoFileR);
    }
    enlacesDiv.appendChild(divRep);

    // ===================== Proyecto Final =====================
    const divFin = document.createElement('div');
    divFin.classList.add('enlace-con-estado');

    if (data.proyectoFinal?.url) {
      const enlaceFin = document.createElement('a');
      enlaceFin.href = data.proyectoFinal.url;
      enlaceFin.target = '_blank';
      enlaceFin.textContent = 'Ver Proyecto Final';
      enlaceFin.classList.add('btn-enlace');
      divFin.appendChild(enlaceFin);

      let estadoD = data.proyectoFinal.docente || 'pendiente';
      let textoD = '';
      let claseD = '';
      if (estadoD === 'aprobado') {
        textoD = 'Aprobado por Docente';
        claseD = 'status-aprobado';
      } else if (estadoD === 'rechazado') {
        textoD = 'Rechazado por Docente';
        claseD = 'status-rechazado';
      } else {
        textoD = 'Pendiente evaluación Docente';
        claseD = 'status-pendiente';
      }
      const spanDocF = document.createElement('span');
      spanDocF.textContent = textoD;
      spanDocF.classList.add(claseD);
      divFin.appendChild(spanDocF);

      if (data.proyectoFinal.admin && data.proyectoFinal.admin !== 'pendiente') {
        let estadoA = data.proyectoFinal.admin;
        let textoA = estadoA === 'aprobado'
          ? 'Aprobado por Admin'
          : 'Rechazado por Admin';
        let claseA = estadoA === 'aprobado'
          ? 'status-aprobado'
          : 'status-rechazado';
        const spanAdmF = document.createElement('span');
        spanAdmF.textContent = textoA;
        spanAdmF.classList.add(claseA);
        divFin.appendChild(spanAdmF);
      }

      if (data.proyectoFinal.obsDocente) {
        const pObsDocF = document.createElement('p');
        pObsDocF.innerHTML = `<strong>Comentario Docente:</strong> ${data.proyectoFinal.obsDocente}`;
        enlacesDiv.appendChild(pObsDocF);
      }
      if (data.proyectoFinal.obsAdmin) {
        const pObsAdmF = document.createElement('p');
        pObsAdmF.innerHTML = `<strong>Comentario Admin:</strong> ${data.proyectoFinal.obsAdmin}`;
        enlacesDiv.appendChild(pObsAdmF);
      }
    } else {
      const spanNoFileF = document.createElement('span');
      spanNoFileF.textContent = 'Proyecto Final: Sin archivo subido';
      spanNoFileF.classList.add('status-pendiente');
      divFin.appendChild(spanNoFileF);
    }
    enlacesDiv.appendChild(divFin);
  }

  // Referencia al contenedor de enlaces
  const enlacesDiv = document.getElementById('enlaces-documentos');
  // Llamamos la primera vez para renderizar
  renderizarDocumentos();

  // 5) BOTÓN “Cerrar Sesión” → redirigir a index.html
  document.getElementById('logout-button').addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = 'index.html';
  });

  // 6) REFERENCIAS A BOTONES Y CONTENEDORES DE FORMULARIOS
  const btnMostrarAnte = document.getElementById('btn-mostrar-ante');
  const btnMostrarRep  = document.getElementById('btn-mostrar-rep');
  const btnMostrarFin  = document.getElementById('btn-mostrar-fin');

  const contAnte = document.getElementById('form-ante-container');
  const contRep  = document.getElementById('form-rep-container');
  const contFin  = document.getElementById('form-fin-container');

  // 7) MOSTRAR / OCULTAR FORMULARIOS
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
      // 8.1) Subir a Supabase
      const url = await uploadPdf(file, `anteproyectos/${uid}.pdf`);

      // 8.2) Actualizar Firestore
      await updateDoc(resRef, {
        'anteproyecto.url': url,
        'anteproyecto.docente': 'pendiente',
        'anteproyecto.obsDocente': '',
        'anteproyecto.admin': 'pendiente',
        'anteproyecto.obsAdmin': ''
      });

      // 8.3) Actualizar variable local y re-renderizar
      data.anteproyecto.url = url;
      data.anteproyecto.docente = 'pendiente';
      data.anteproyecto.obsDocente = '';
      data.anteproyecto.admin = 'pendiente';
      data.anteproyecto.obsAdmin = '';
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
        'reporteParcial.docente': 'pendiente',
        'reporteParcial.obsDocente': '',
        'reporteParcial.admin': 'pendiente',
        'reporteParcial.obsAdmin': ''
      });

      data.reporteParcial.url = url;
      data.reporteParcial.docente = 'pendiente';
      data.reporteParcial.obsDocente = '';
      data.reporteParcial.admin = 'pendiente';
      data.reporteParcial.obsAdmin = '';
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
        'proyectoFinal.docente': 'pendiente',
        'proyectoFinal.obsDocente': '',
        'proyectoFinal.admin': 'pendiente',
        'proyectoFinal.obsAdmin': ''
      });

      data.proyectoFinal.url = url;
      data.proyectoFinal.docente = 'pendiente';
      data.proyectoFinal.obsDocente = '';
      data.proyectoFinal.admin = 'pendiente';
      data.proyectoFinal.obsAdmin = '';
      renderizarDocumentos();

      alert('Proyecto final subido correctamente.');
      contFin.style.display = 'none';
    } catch (error) {
      console.error(error);
      alert('Error al subir proyecto final: ' + error.message);
    }
  });
});
