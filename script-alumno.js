// script-alumno.js
import { auth, db, storage } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { doc, getDoc, updateDoc, arrayUnion } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';
import { ref, uploadBytes, getDownloadURL }  from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-storage.js';

onAuthStateChanged(auth, async user => {
  if (!user) return window.location.href = "login.html";

  const uid = user.uid;
  const resRef = doc(db, "residencias", uid);

  // Mostrar estado actual
  const estadoDiv = document.getElementById('estado-proyecto');
  const actualizarEstado = async () => {
    const snap = await getDoc(resRef);
    if (!snap.exists()) return;
    const data = snap.data();
    estadoDiv.innerHTML = `
      <p>Anteproyecto: ${data.anteproyectoEstado.docente} / ${data.anteproyectoEstado.admin}</p>
      <p>Reportes subidos: ${data.reportes.length}</p>
      <p>Proyecto final: ${data.proyectoFinal.docente} / ${data.proyectoFinal.admin}</p>
    `;
  };
  await actualizarEstado();

  // 1) Anteproyecto
  document.getElementById('form-anteproyecto')
    .addEventListener('submit', async e => {
      e.preventDefault();
      const file = e.target.archivo.files[0];
      const storageRef = ref(storage, `anteproyectos/${uid}.pdf`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await updateDoc(resRef, {
        anteproyectoURL: url,
        anteproyectoEstado: { docente: "pendiente", admin: "pendiente", obsDocente: "", obsAdmin: "" }
      });
      alert("Anteproyecto subido.");
      await actualizarEstado();
    });

  // 2) Reportes
  document.getElementById('form-reporte')
    .addEventListener('submit', async e => {
      e.preventDefault();
      const file = e.target.reporte.files[0];
      const ts = Date.now();
      const refSt = ref(storage, `reportes/${uid}_${ts}.pdf`);
      await uploadBytes(refSt, file);
      const url = await getDownloadURL(refSt);
      await updateDoc(resRef, {
        reportes: arrayUnion({
          url,
          fecha: new Date().toISOString(),
          docente: "pendiente",
          admin: "pendiente",
          obsDocente: "",
          obsAdmin: ""
        })
      });
      alert("Reporte subido.");
      await actualizarEstado();
    });

  // 3) Proyecto Final
  document.getElementById('form-final')
    .addEventListener('submit', async e => {
      e.preventDefault();
      const file = e.target.final.files[0];
      const storageRef = ref(storage, `finales/${uid}.pdf`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await updateDoc(resRef, {
        proyectoFinal: {
          url,
          docente: "pendiente",
          admin: "pendiente",
          obsDocente: "",
          obsAdmin: ""
        }
      });
      alert("Proyecto final subido.");
      await actualizarEstado();
    });
});
