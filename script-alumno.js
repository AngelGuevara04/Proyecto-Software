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
    // Si no hay usuario logueado → login
    return window.location.href = 'login.html';
  }

  const uid = user.uid;

  // 1) Verificar rol en 'usuarios/{uid}'
  const perfilSnap = await getDoc(doc(db, 'usuarios', uid));
  if (!perfilSnap.exists() || perfilSnap.data().rol !== 'alumno') {
    alert('Acceso denegado: Solo alumnos pueden ver este panel.');
    await signOut(auth);
    return window.location.href = 'login.html';
  }

  // 2) Extraer el nombre del alumno y mostrar "Bienvenido, <nombre>"
  const nombreAlumno = perfilSnap.data().nombre || '';
  document.getElementById('bienvenida-text').textContent = `Bienvenido(a), ${nombreAlumno}`;

  // 3) Obtener la referencia a 'residencias/{uid}'
  const resRef = doc(db, 'residencias', uid);
  const resSnap = await getDoc(resRef);
  if (!resSnap.exists()) {
    console.error('No existe el documento residencias para este alumno.');
    return;
  }
  const data = resSnap.data();

  // 4) Mostrar lista de asesores (hasta 2)
  const listaAsesoresUL = document.getElementById('lista-asesores');
  listaAsesoresUL.innerHTML = '';

  if (Array.isArray(data.asesores) && data.asesores.length > 0) {
    for (const uidDocente of data.asesores) {
      // Obtener nombre de cada docente de 'usuarios/{uidDocente}'
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

  // 5) Mostrar enlaces a PDFs si existen
  const enlacesDiv = document.getElementById('enlaces-documentos');

  // Limpia cualquier enlace previo
  enlacesDiv.innerHTML = '';

  // 5.1) Anteproyecto
  if (data.anteproyecto?.url) {
    const botonAnte = document.createElement('a');
    botonAnte.href = data.anteproyecto.url;
    botonAnte.target = '_blank';
    botonAnte.textContent = 'Ver Anteproyecto';
    botonAnte.classList.add('btn-enlace');
    enlacesDiv.appendChild(botonAnte);

    // Mostrar comentario del docente, si existe
    if (data.anteproyecto.obsDocente) {
      const pObsDoc = document.createElement('p');
      pObsDoc.innerHTML = `<strong>Comentario Docente (Anteproyecto):</strong> ${data.anteproyecto.obsDocente}`;
      enlacesDiv.appendChild(pObsDoc);
    }
    // Mostrar comentario del admin (ejecutivo), si existe
    if (data.anteproyecto.obsAdmin) {
      const pObsAdmin = document.createElement('p');
      pObsAdmin.innerHTML = `<strong>Comentario Admin (Anteproyecto):</strong> ${data.anteproyecto.obsAdmin}`;
      enlacesDiv.appendChild(pObsAdmin);
    }
  }

  // 5.2) Reporte Parcial
  if (data.reporteParcial?.url) {
    const botonRep = document.createElement('a');
    botonRep.href = data.reporteParcial.url;
    botonRep.target = '_blank';
    botonRep.textContent = 'Ver Reporte Parcial';
    botonRep.classList.add('btn-enlace');
    enlacesDiv.appendChild(botonRep);

    // Comentarios docente
    if (data.reporteParcial.obsDocente) {
      const pObsDoc = document.createElement('p');
      pObsDoc.innerHTML = `<strong>Comentario Docente (Reporte):</strong> ${data.reporteParcial.obsDocente}`;
      enlacesDiv.appendChild(pObsDoc);
    }
    // Comentarios admin
    if (data.reporteParcial.obsAdmin) {
      const pObsAdmin = document.createElement('p');
      pObsAdmin.innerHTML = `<strong>Comentario Admin (Reporte):</strong> ${data.reporteParcial.obsAdmin}`;
      enlacesDiv.appendChild(pObsAdmin);
    }
  }

  // 5.3) Proyecto Final
  if (data.proyectoFinal?.url) {
    const botonFin = document.createElement('a');
    botonFin.href = data.proyectoFinal.url;
    botonFin.target = '_blank';
    botonFin.textContent = 'Ver Proyecto Final';
    botonFin.classList.add('btn-enlace');
    enlacesDiv.appendChild(botonFin);

    // Comentarios docente
    if (data.proyectoFinal.obsDocente) {
      const pObsDoc = document.createElement('p');
      pObsDoc.innerHTML = `<strong>Comentario Docente (Final):</strong> ${data.proyectoFinal.obsDocente}`;
      enlacesDiv.appendChild(pObsDoc);
    }
    // Comentarios admin
    if (data.proyectoFinal.obsAdmin) {
      const pObsAdmin = document.createElement('p');
      pObsAdmin.innerHTML = `<strong>Comentario Admin (Final):</strong> ${data.proyectoFinal.obsAdmin}`;
      enlacesDiv.appendChild(pObsAdmin);
    }
  }

  // 6) BOTÓN “Cerrar Sesión”
  document.getElementById('logout-button').addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = 'login.html';
  });

  // 7) REFERENCIAS A BOTONES Y CONTENEDORES DE FORMULARIOS
  const btnMostrarAnte = document.getElementById('btn-mostrar-ante');
  const btnMostrarRep  = document.getElementById('btn-mostrar-rep');
  const btnMostrarFin  = document.getElementById('btn-mostrar-fin');

  const contAnte = document.getElementById('form-ante-container');
  const contRep  = document.getElementById('form-rep-container');
  const contFin  = document.getElementById('form-fin-container');

  // 8) MOSTRAR / OCULTAR FORMULARIOS
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
      return alert('Debes seleccionar un PDF de anteproyecto.');
    }
    try {
      // 9.1) Subir a Supabase
      const url = await uploadPdf(file, `anteproyectos/${uid}.pdf`);

      // 9.2) Actualizar Firestore
      await updateDoc(resRef, {
        'anteproyecto.url': url,
        'anteproyecto.docente': 'pendiente',
        'anteproyecto.obsDocente': '',
        'anteproyecto.admin': 'pendiente',
        'anteproyecto.obsAdmin': ''
      });

      // 9.3) Crear enlace “Ver Anteproyecto”
      const botonAnteNuevo = document.createElement('a');
      botonAnteNuevo.href = url;
      botonAnteNuevo.target = '_blank';
      botonAnteNuevo.textContent = 'Ver Anteproyecto';
      botonAnteNuevo.classList.add('btn-enlace');
      enlacesDiv.appendChild(botonAnteNuevo);

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

      const botonRepNuevo = document.createElement('a');
      botonRepNuevo.href = url;
      botonRepNuevo.target = '_blank';
      botonRepNuevo.textContent = 'Ver Reporte Parcial';
      botonRepNuevo.classList.add('btn-enlace');
      enlacesDiv.appendChild(botonRepNuevo);

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

      const botonFinNuevo = document.createElement('a');
      botonFinNuevo.href = url;
      botonFinNuevo.target = '_blank';
      botonFinNuevo.textContent = 'Ver Proyecto Final';
      botonFinNuevo.classList.add('btn-enlace');
      enlacesDiv.appendChild(botonFinNuevo);

      alert('Proyecto final subido correctamente.');
      contFin.style.display = 'none';
    } catch (error) {
      console.error(error);
      alert('Error al subir proyecto final: ' + error.message);
    }
  });
});
