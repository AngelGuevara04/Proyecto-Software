// script-ejecutivo.js
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { collection, getDocs, query, where, doc, updateDoc } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

onAuthStateChanged(async user => {
  if (!user) return window.location.href = "login.html";

  const listaUsuarios = document.getElementById('lista-documentos');
  const alumnoSelect   = document.getElementById('alumno');
  const docenteSelect  = document.getElementById('docente');
  const asignarForm    = document.getElementById('form-asignar-asesor');
  listaUsuarios.innerHTML = "";

  // 1) Cargar todos los residencias para ver estado
  const resSnap = await getDocs(collection(db, "residencias"));
  for (const docRes of resSnap.docs) {
    const data  = docRes.data();
    const id    = docRes.id;
    // Saltar si docente aún no aprobó nada
    const pendientes = [
      data.anteproyectoEstado.docente === "pendiente",
      ...data.reportes.map(r=>r.docente==="pendiente"),
      data.proyectoFinal.docente === "pendiente"
    ].some(x=>x);
    // Solo mostrar los que ya aprobó el docente
    const aprobados = [
      data.anteproyectoEstado.docente === "aprobado",
      ...data.reportes.map(r=>r.docente==="aprobado"),
      data.proyectoFinal.docente === "aprobado"
    ].some(x=>x);

    // Mostrar siempre la asignación de rol + estado general
    listaUsuarios.insertAdjacentHTML('beforeend', `
      <div>
        <strong>Alumno:</strong> ${data.estudianteNombre} (${id})<br>
        <strong>Asesor:</strong> ${data.asesorId || "—"}<br>
        <strong>Anteproyecto:</strong> ${data.anteproyectoEstado.admin}<br>
        <strong># Reportes:</strong> ${data.reportes.length}<br>
        <strong>Proyecto Final:</strong> ${data.proyectoFinal.admin}<br>
        ${aprobados ? `<details>
          <summary>Ver aprobados x docente</summary>
          <p>¡Listo para revisión administrativa!</p>
          <form data-id="${id}" class="form-admin-ante">
            <label>Anteproyecto: 
              <select required>
                <option value="">-----</option>
                <option value="aprobado">Aprobado</option>
                <option value="rechazado">Rechazado</option>
              </select>
            </label>
            <label>Obs:</label>
            <input type="text" placeholder="Observaciones…">
            <button>Guardar</button>
          </form>
          <hr>
          <form data-id="${id}" class="form-admin-final">
            <label>Proyecto Final: 
              <select required>
                <option value="">-----</option>
                <option value="aprobado">Aprobado</option>
                <option value="rechazado">Rechazado</option>
              </select>
            </label>
            <label>Obs:</label>
            <input type="text" placeholder="Observaciones…">
            <button>Guardar</button>
          </form>
        </details>` : ''}
        <hr>
      </div>
    `);
  }

  // 2) Llenar selects para asignar asesor
  const alumnosSnap  = await getDocs(collection(db, "residencias"));
  alumnosSnap.forEach(d => {
    alumnoSelect.innerHTML += `<option value="${d.id}">${d.data().estudianteNombre}</option>`;
  });
  const docentesSnap = await getDocs(query(collection(db, "usuarios"), where("rol", "==", "docente")));
  docentesSnap.forEach(d => {
    const u = d.data();
    docenteSelect.innerHTML += `<option value="${d.id}">${u.nombre}</option>`;
  });

  // 3) Asignar asesor
  asignarForm.addEventListener('submit', async e => {
    e.preventDefault();
    const alumnoId  = alumnoSelect.value;
    const docenteId = docenteSelect.value;
    await updateDoc(doc(db, "residencias", alumnoId), { asesorId: docenteId });
    alert("Asesor asignado.");
    window.location.reload();
  });

  // 4) Manejar aprobación administrativa
  document.addEventListener('submit', async e => {
    if (e.target.matches('.form-admin-ante')) {
      e.preventDefault();
      const id      = e.target.dataset.id;
      const est     = e.target[0].value;
      const obs     = e.target[1].value;
      await updateDoc(doc(db, "residencias", id), {
        "anteproyectoEstado.admin": est,
        "anteproyectoEstado.obsAdmin": obs
      });
      alert("Anteproyecto validado por admin.");
      window.location.reload();
    }
    if (e.target.matches('.form-admin-final')) {
      e.preventDefault();
      const id  = e.target.dataset.id;
      const est = e.target[0].value;
      const obs = e.target[1].value;
      await updateDoc(doc(db, "residencias", id), {
        "proyectoFinal.admin": est,
        "proyectoFinal.obsAdmin": obs
      });
      alert("Proyecto final validado por admin.");
      window.location.reload();
    }
  });

});
