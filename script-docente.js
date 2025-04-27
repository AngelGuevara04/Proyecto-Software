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
    return window.location.href = 'login.html';
  }

  // Verificar que sea docente
  const perfilSnap = await getDoc(doc(db, 'usuarios', user.uid));
  if (!perfilSnap.exists() || perfilSnap.data().rol !== 'docente') {
    alert('Acceso denegado: solo docentes pueden revisar documentos.');
    await signOut(auth);
    return window.location.href = 'login.html';
  }

  // Cerrar sesión
  document.getElementById('logout-button')
    .addEventListener('click', async () => {
      await signOut(auth);
      window.location.href = 'login.html';
    });

  const asesorId = user.uid;
  const cont     = document.getElementById('reportes-pendientes');
  cont.innerHTML = '';

  // Traer residencias asignadas
  const q    = query(collection(db, 'residencias'), where('asesorId', '==', asesorId));
  const snap = await getDocs(q);

  for (const resDoc of snap.docs) {
    const data     = resDoc.data();
    const alumnoId = resDoc.id;
    const uSnap    = await getDoc(doc(db, 'usuarios', alumnoId));
    const nombre   = uSnap.exists() ? uSnap.data().nombre : alumnoId;

    // Mostrar reportes pendientes
    data.reportes.forEach((rpt, i) => {
      if (rpt.docente === 'pendiente') {
        cont.insertAdjacentHTML('beforeend', `
          <div>
            <p><strong>${nombre}</strong> - Reporte ${i+1} (${new Date(rpt.fecha).toLocaleDateString()})</p>
            <a href="${rpt.url}" target="_blank">Ver PDF</a>
            <form data-alumno="${alumnoId}" data-index="${i}" class="form-docente">
              <select required>
                <option value="">---</option>
                <option value="aprobado">Aprobado</option>
                <option value="rechazado">Rechazado</option>
              </select>
              <input type="text" placeholder="Observaciones">
              <button type="submit">Guardar</button>
            </form>
          </div><hr>
        `);
      }
    });

    // Mostrar proyecto final pendiente
    if (data.proyectoFinal.url && data.proyectoFinal.docente === 'pendiente') {
      cont.insertAdjacentHTML('beforeend', `
        <div>
          <p><strong>${nombre}</strong> - Proyecto Final</p>
          <a href="${data.proyectoFinal.url}" target="_blank">Ver PDF</a>
          <form data-alumno="${alumnoId}" class="form-final-docente">
            <select required>
              <option value="">---</option>
              <option value="aprobado">Aprobado</option>
              <option value="rechazado">Rechazado</option>
            </select>
            <input type="text" placeholder="Observaciones">
            <button type="submit">Guardar</button>
          </form>
        </div><hr>
      `);
    }
  }

  // Manejar envíos de formularios
  document.addEventListener('submit', async e => {
    if (e.target.matches('.form-docente')) {
      e.preventDefault();
      const alumId  = e.target.dataset.alumno;
      const idx     = +e.target.dataset.index;
      const est     = e.target[0].value;
      const obs     = e.target[1].value;
      const refRes  = doc(db, 'residencias', alumId);
      const snapRes = await getDoc(refRes);
      const arr     = snapRes.data().reportes;
      arr[idx].docente    = est;
      arr[idx].obsDocente = obs;
      await updateDoc(refRes, { reportes: arr });
      alert('Reporte actualizado.');
      window.location.reload();
    }

    if (e.target.matches('.form-final-docente')) {
      e.preventDefault();
      const alumId = e.target.dataset.alumno;
      const est    = e.target[0].value;
      const obs    = e.target[1].value;
      const refRes = doc(db, 'residencias', alumId);
      await updateDoc(refRes, {
        'proyectoFinal.docente':    est,
        'proyectoFinal.obsDocente': obs
      });
      alert('Proyecto final actualizado.');
      window.location.reload();
    }
  });
});
