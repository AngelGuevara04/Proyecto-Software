// subir-documentos.js
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { collection, addDoc } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

onAuthStateChanged(auth, async (user) => {
  if (!user) return window.location.href = 'login.html';

  const subirForm = document.getElementById('subir-form');
  subirForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const anteproyecto = document.getElementById('anteproyecto').files[0];
    const proyectoFinal = document.getElementById('proyecto-final').files[0];

    if (anteproyecto || proyectoFinal) {
      try {
        const docRef = await addDoc(collection(db, 'residencias'), {
          anteproyectoURL: anteproyecto ? URL.createObjectURL(anteproyecto) : null,
          proyectoFinalURL: proyectoFinal ? URL.createObjectURL(proyectoFinal) : null,
          estado: 'Pendiente',
          usuarioId: user.uid,
        });
        alert("Documentos subidos correctamente.");
      } catch (error) {
        alert("Error al subir documentos: " + error.message);
      }
    }
  });
});
