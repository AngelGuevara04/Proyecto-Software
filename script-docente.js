// script-docente.js
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import {
  collection, query, where, getDocs,
  doc, updateDoc, getDoc
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

onAuthStateChanged(auth, async user => {
  if (!user) return window.location.href = "login.html";

  // Logout funcional
  document.getElementById('logout-button')
    .addEventListener('click', async () => {
      await signOut(auth);
      window.location.href = "login.html";
    });

  const uid = user.uid;
  const cont = document.getElementById("reportes-pendientes");
  cont.innerHTML = "";

  const q    = query(collection(db, "residencias"), where("asesorId", "==", uid));
  const snap = await getDocs(q);

  for (const resDoc of snap.docs) {
    const data     = resDoc.data();
    const alumnoId = resDoc.id;
    const userSnap = await getDoc(doc(db, "usuarios", alumnoId));
    const nombre   = userSnap.exists() ? userSnap.data().nombre : alumnoId;

    // Reportes pendientes
    data.reportes.forEach((rpt, i) => {
      if (rpt.docente === "pendiente") {
        cont.insertAdjacentHTML('beforeend', `
          <div>
            <p><strong>${nombre}</strong> - Reporte ${i+1}</p>
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

    // Proyecto final pendiente
    if (data.proyectoFinal.url && data.proyectoFinal.docente === "pendiente") {
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

  document.addEventListener('submit', async e => {
    if (e.target.matches('.form-docente')) {
      e.preventDefault();
      const alumId = e.target.dataset.alumno;
      const idx    = +e.target.dataset.index;
      const est    = e.target[0].value;
      const obs    = e.target[1].value;
      const refRes = doc(db, "residencias", alumId);
      const snapR  = await getDoc(refRes);
      const arr    = snapR.data().reportes;
      arr[idx].docente    = est;
      arr[idx].obsDocente = obs;
      await updateDoc(refRes, { reportes: arr });
      alert("Reporte actualizado.");
      window.location.reload();
    }
    if (e.target.matches('.form-final-docente')) {
      e.preventDefault();
      const alumId = e.target.dataset.alumno;
      const est    = e.target[0].value;
      const obs    = e.target[1].value;
      const refRes = doc(db, "residencias", alumId);
      await updateDoc(refRes, {
        "proyectoFinal.docente":    est,
        "proyectoFinal.obsDocente": obs
      });
      alert("Proyecto final actualizado.");
      window.location.reload();
    }
  });
});
