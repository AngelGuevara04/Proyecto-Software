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
    // Sin usuario → redirigir a login
    return window.location.href = 'login.html';
  }

  const uid = user.uid;

  // 1) Verificar que sea rol 'alumno'
  const perfilSnap = await getDoc(doc(db, 'usuarios', uid));
  if (!perfilSnap.exists() || perfilSnap.data().rol !== 'alumno') {
    alert('Acceso denegado: sólo alumnos pueden ver este panel.');
    await signOut(auth);
    return window.location.href = 'login.html';
  }

  // 2) Referencia a Firestore 'residencias/{uid}'
  const resRef = doc(db, 'residencias', uid);

  // 3) BOTÓN Cerrar Sesión
  document.getElementById('logout-button')
    .addEventListener('click', async () => {
      await signOut(auth);
      window.location.href = 'login.html';
    });

  // 4) Mostrar enlaces existentes (si hay URLs en Firestore)
  const enlacesDiv = document.getElementById('enlaces-documentos');
  const resSnap = await getDoc(resRef);
  if (resSnap.exists()) {
    const data = resSnap.data();

    // Si existe anteproyecto.url
    if (data.anteproyecto?.url) {
      const botonAnte = document.createElement('a');
      botonAnte.href = data.anteproyecto.url;
      botonAnte.target = '_blank';
      botonAnte.textContent = 'Ver Anteproyecto';
      botonAnte.classList.add('btn-enlace');
      enlacesDiv.appendChild(botonAnte);
    }

    // Si existe reporteParcial.url
    if (data.reporteParcial?.url) {
      const botonRep = document.createElement('a');
      botonRep.href = data.reporteParcial.url;
      botonRep.target = '_blank';
      botonRep.textContent = 'Ver Reporte Parcial';
      botonRep.classList.add('btn-enlace');
      enlacesDiv.appendChild(botonRep);
    }

    // Si existe proyectoFinal.url
    if (data.proyectoFinal?.url) {
      const botonFinal = document.createElement('a');
      botonFinal.href = data.proyectoFinal.url;
      botonFinal.target = '_blank';
      botonFinal.textContent = 'Ver Proyecto Final';
      botonFinal.classList.add('btn-enlace');
      enlacesDiv.appendChild(botonFinal);
    }
  }

  // 5) Obtén referencias a contenedores y botones
  const btnMostrarAnte = document.getElementById('btn-mostrar-ante');
  const btnMostrarRep  = document.getElementById('btn-mostrar-rep');
  const btnMostrarFin  = document.getElementById('btn-mostrar-final');

  const contAnte = document.getElementById('form-ante-container');
  const contRep  = document.getElementById('form-rep-container');
  const contFin  = document.getElementById('form-final-container');

  // 6) Funciones para alternar (toggle) el display de cada formulario
  btnMostrarAnte.addEventListener('click', () => {
    contAnte.style.display = contAnte.style.display === 'none' ? 'block' : 'none';
    // Ocultar los otros dos por si están abiertos
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

  // 7) SUBIR Anteproyecto
  document.getElementById('form-anteproyecto')
    .addEventListener('submit', async (e) => {
      e.preventDefault();
      const file = document.getElementById('archivo').files[0];
      if (!file) {
        return alert('Debes seleccionar un PDF de anteproyecto.');
      }
      try {
        // 7.1) Subir a Supabase
        const url = await uploadPdf(file, `anteproyectos/${uid}.pdf`);

        // 7.2) Actualizar Firestore
        await updateDoc(resRef, {
          anteproyecto: {
            url: url,
            docente: 'pendiente',
            admin: 'pendiente',
            obsDocente: '',
            obsAdmin: ''
          }
        });

        // 7.3) Crear/enlazar el botón “Ver Anteproyecto”
        const botonAnteNuevo = document.createElement('a');
        botonAnteNuevo.href = url;
        botonAnteNuevo.target = '_blank';
        botonAnteNuevo.textContent = 'Ver Anteproyecto';
        botonAnteNuevo.classList.add('btn-enlace');
        enlacesDiv.appendChild(botonAnteNuevo);

        alert('Anteproyecto subido correctamente.');
        contAnte.style.display = 'none'; // ocultar el formulario
      } catch (error) {
        console.error(error);
        alert('Error al subir anteproyecto: ' + error.message);
      }
    });

  // 8) SUBIR Reporte Parcial
  document.getElementById('form-reporte')
    .addEventListener('submit', async (e) => {
      e.preventDefault();
      const file = document.getElementById('reporte').files[0];
      if (!file) {
        return alert('Debes seleccionar un PDF de reporte parcial.');
      }
      try {
        const url = await uploadPdf(file, `reportes/${uid}.pdf`);
        await updateDoc(resRef, {
          reporteParcial: {
            url: url,
            docente: 'pendiente',
            admin: 'pendiente',
            obsDocente: '',
            obsAdmin: ''
          }
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

  // 9) SUBIR Proyecto Final
  document.getElementById('form-final')
    .addEventListener('submit', async (e) => {
      e.preventDefault();
      const file = document.getElementById('final').files[0];
      if (!file) {
        return alert('Debes seleccionar un PDF de proyecto final.');
      }
      try {
        const url = await uploadPdf(file, `finales/${uid}.pdf`);
        await updateDoc(resRef, {
          proyectoFinal: {
            url: url,
            docente: 'pendiente',
            admin: 'pendiente',
            obsDocente: '',
            obsAdmin: ''
          }
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
