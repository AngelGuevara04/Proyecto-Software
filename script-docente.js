// script-docente.js
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

onAuthStateChanged(auth, async user => {
  if (!user) return window.location.href = "login.html";
  const uid = user.uid;

  // 1) Traer residencias donde asesorId == uid
  const q = query(collection(db, "residencias"), where("asesorId", "==", uid));
  const snap = await getDocs(q);
  const lista = document.getElementById("reportes-pendientes");
  lista.innerHTML = "";

  // Por cada alumno asignado…
  for (const resDoc of snap.docs) {
    const data = resDoc.data();
    const alumnoId = resDoc.id;

    // Mostrar nombre real
    const userSnap = await getDoc(doc(db, "usuarios", alumnoId));
    const nombre = userSnap.exists() ? userSnap.data().nombre : alumnoId;

    // Mostrar todos los archivos pendientes de este alumno
    data.reportes.forEach((rpt, i) => {
      if (rpt.docente === "pendiente") {
        const div = document.createElement("div");
        div.innerHTML = `
          <p><strong>${nombre}</strong> - Reporte ${i+1} (${new Date(rpt.fecha).toLocaleDateString()})</p>
          <a href="${rpt.url}" target="_blank">Ver PDF</a>
          <form data-alumno="${alumnoId}" data-index="${i}" class="form-docente">
            <label>Calificar: 
              <select required>
                <option value="">-----</option>
                <option value="aprobado">Aprobado</option>
                <option value="rechazado">Rechazado</option>
              </select>
            </label>
            <input type="text" placeholder="Observaciones…">
            <button type="submit">Guardar</button>
          </form><hr>
        `;
        lista.appendChild(div);
      }
    });

    // Proyecto Final
    if (data.proyectoFinal.url && data.proyectoFinal.docente === "pendiente") {
      const div = document.createElement("div");
      div.innerHTML = `
        <p><strong>${nombre}</strong> - Proyecto Final</p>
        <a href="${data.proyectoFinal.url}" target="_blank">Ver PDF</a>
        <form data-alumno="${alumnoId}" class="form-final-docente">
          <label>Estado:
            <select required>
              <option value="">-----</option>
              <option value="aprobado">Aprobado</option>
              <option value="rechazado">Rechazado</option>
            </select>
          </label>
          <input type="text" placeholder="Observaciones…">
          <button type="submit">Guardar</button>
        </form><hr>
      `;
      lista.appendChild(div);
    }
  }

  // Manejar envíos de formulario
  document.addEventListener('submit', async e => {
    if (e.target.matches('.form-docente')) {
      e.preventDefault();
      const alumnoId = e.target.dataset.alumno;
      const idx       = +e.target.dataset.index;
      const estado    = e.target[0].value;
      const obs       = e.target[1].value;
      const refRes    = doc(db, "residencias", alumnoId);
      const snapRes   = await getDoc(refRes);
      const rptArr    = snapRes.data().reportes;
      rptArr[idx].docente     = estado;
      rptArr[idx].obsDocente  = obs;
      await updateDoc(refRes, { reportes: rptArr });
      alert("Reporte actualizado.");
      window.location.reload();
    }

    if (e.target.matches('.form-final-docente')) {
      e.preventDefault();
      const alumnoId = e.target.dataset.alumno;
      const estado   = e.target[0].value;
      const obs      = e.target[1].value;
      const refRes   = doc(db, "residencias", alumnoId);
      await updateDoc(refRes, {
        "proyectoFinal.docente":    estado,
        "proyectoFinal.obsDocente": obs
      });
      alert("Proyecto final actualizado.");
      window.location.reload();
    }
  });
});
