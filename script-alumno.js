// script-alumno.js
import { auth, db, storage } from './firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { doc, getDoc, updateDoc, arrayUnion } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';
import { ref, uploadBytes, getDownloadURL }  from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-storage.js';

onAuthStateChanged(auth, async user => {
  if (!user) return window.location.href = "login.html";

  // Logout funcional
  document.getElementById('logout-button')
    .addEventListener('click', async () => {
      await signOut(auth);
      window.location.href = "login.html";
    });

  const uid    = user.uid;
  const resRef = doc(db, "residencias", uid);
  const estadoDiv = document.getElementById('estado-proyecto');

  const actualizarEstado = async () => {
    const snap = await getDoc(resRef);
    if (!snap.exists()) return;
    const d = snap.data();
    estadoDiv.innerHTML = `
      <p>Anteproyecto: ${d.anteproyectoEstado.docente} / ${d.anteproyectoEstado.admin}</p>
      <p>Reportes: ${d.reportes.length}</p>
      <p>Proyecto Final: ${d.proyectoFinal.docente} / ${d.proyectoFinal.admin}</p>
    `;
  };
  await actualizarEstado();

  // Subir Anteproyecto
  document.getElementById('form-anteproyecto')
    .addEventListener('submit', async e => {
      e.preventDefault();
      const file = e.target.archivo.files[0];
      const stRef = ref(storage, `anteproyectos/${uid}.pdf`);
      await uploadBytes(stRef, file);
      const url = await getDownloadURL(stRef);
      await updateDoc(resRef, {
        anteproyectoURL: url,
        anteproyectoEstado: { docente: "pendiente", admin: "pendiente", obsDocente: "", obsAdmin: "" }
      });
      alert("Anteproyecto subido.");
      await actualizarEstado();
    });

  // Subir Reporte
  document.getElementById('form-reporte')
    .addEventListener('submit', async e => {
      e.preventDefault();
      const file = e.target.reporte.files[0];
      const ts   = Date.now();
      const stRef = ref(storage, `reportes/${uid}_${ts}.pdf`);
      await uploadBytes(stRef, file);
      const url = await getDownloadURL(stRef);
      await updateDoc(resRef, {
        reportes: arrayUnion({
          url, fecha: new Date().toISOString(),
          docente: "pendiente", admin: "pendiente",
          obsDocente: "", obsAdmin: ""
        })
      });
      alert("Reporte subido.");
      await actualizarEstado();
    });

  // Subir Proyecto Final
  document.getElementById('form-final')
    .addEventListener('submit', async e => {
      e.preventDefault();
      const file = e.target.final.files[0];
      const stRef = ref(storage, `finales/${uid}.pdf`);
      await uploadBytes(stRef, file);
      const url = await getDownloadURL(stRef);
      await updateDoc(resRef, {
        proyectoFinal: { url, docente: "pendiente", admin: "pendiente", obsDocente: "", obsAdmin: "" }
      });
      alert("Proyecto final subido.");
      await actualizarEstado();
    });
});
