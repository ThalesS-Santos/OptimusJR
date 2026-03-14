import { auth, db, storage, provider } from './firebase-config.js';
import { signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// State
let currentUser = null;
let currentPage = 'home';

// DOM Elements
const views = {
    auth: document.getElementById('auth-view'),
    dashboard: document.getElementById('dashboard-view'),
    errMsg: document.getElementById('auth-error')
};

// --- AUTHENTICATION ---

window.loginWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        await checkUserInFirestore(user);
    } catch (error) {
        views.errMsg.innerText = error.message;
        views.errMsg.classList.remove('hidden');
    }
}

window.logout = async () => {
    await signOut(auth);
    window.location.reload();
}

async function checkUserInFirestore(authUser) {
    const userRef = doc(db, "users", authUser.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
        currentUser = userSnap.data();
    } else {
        // First Login - Create Profile
        const newUser = {
            uid: authUser.uid,
            name: authUser.displayName,
            email: authUser.email,
            photoURL: authUser.photoURL,
            role: "Membro", // Default
            dept: "Geral",   // Default
            bio: "Novo membro da Optimus JR",
            skills: "Iniciante"
        };
        await setDoc(userRef, newUser);
        currentUser = newUser;
    }
    showDashboard();
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        checkUserInFirestore(user);
    } else {
        views.dashboard.classList.add('hidden');
        views.auth.classList.remove('hidden');
    }
});

// --- NAVIGATION ---

function showDashboard() {
    views.auth.classList.add('hidden');
    views.dashboard.classList.remove('hidden');
    
    // Header Info
    const avatar = currentUser.photoURL || 'https://via.placeholder.com/40';
    document.getElementById('user-profile-widget').innerHTML = `
        <div style="display:flex; align-items:center; gap:1rem;">
            <div style="text-align: right;">
                <span style="display:block; font-weight:bold;">${currentUser.name}</span>
                <small style="color: var(--text-muted)">${currentUser.role} • ${currentUser.dept}</small>
            </div>
            <img src="${avatar}" style="width:40px; height:40px; border-radius:50%; border:2px solid var(--primary);">
        </div>
    `;

    navTo('home');
}

window.navTo = (page) => {
    currentPage = page;
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    
    // Highlight active
    const activeBtn = Array.from(document.querySelectorAll('.nav-item')).find(b => b.innerText.toLowerCase().includes(page) || b.getAttribute('onclick')?.includes(page));
    if(activeBtn) activeBtn.classList.add('active');

    loadContent();
}

async function loadContent() {
    const container = document.getElementById('dashboard-content');
    container.innerHTML = '<div style="text-align:center; padding:2rem;">Carregando...</div>';

    switch(currentPage) {
        case 'home': await renderHome(container); break;
        case 'perfil': await renderProfile(container); break;
        case 'membros': await renderMembros(container); break;
        case 'projetos': await renderProjetos(container); break;
        case 'historia': renderHistoria(container); break;
        case 'economia': await renderEconomia(container); break;
        case 'gastos': await renderGastos(container); break;
    }
}

// --- PAGES ---

async function renderHome(container) {
    document.getElementById('page-title').innerText = 'Dashboard Principal';
    if (currentUser.role === 'Presidente') {
        container.innerHTML = `<div class="card"><h3>🏛️ Visão da Presidência</h3><p>Bem-vindo, Chefe.</p></div>`;
    } else if (currentUser.role === 'Diretor') {
        container.innerHTML = `<div class="card"><h3>📈 Visão da Diretoria (${currentUser.dept})</h3><p>Gerencie sua equipe.</p></div>`;
    } else {
        container.innerHTML = `<div class="card"><h3>👋 Bem-vindo ao Sistema</h3><p>Acompanhe suas tarefas.</p></div>`;
    }
}

async function renderProfile(container) {
    document.getElementById('page-title').innerText = 'Meu Perfil';
    container.innerHTML = `
        <div class="card" style="max-width: 600px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 2rem;">
                <div style="position: relative; display: inline-block;">
                    <img id="profile-img-preview" src="${currentUser.photoURL}" style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 4px solid var(--primary);">
                    <label for="file-upload" style="position: absolute; bottom: 0; right: 0; background: var(--primary); padding: 0.5rem; border-radius: 50%; cursor: pointer;">📷</label>
                    <input type="file" id="file-upload" accept="image/*" style="display: none;" onchange="uploadPhoto(this)">
                </div>
                <h2 style="margin-top: 1rem;">${currentUser.name}</h2>
                <p class="text-muted">${currentUser.email}</p>
            </div>

            <div class="form-group">
                <label>Bio</label>
                <textarea id="edit-bio" style="width: 100%; padding: 1rem; background: rgba(0,0,0,0.2); color:white; border:1px solid #333; border-radius:8px;">${currentUser.bio || ''}</textarea>
            </div>

             <div class="form-group">
                <label>Habilidades (Skills)</label>
                <input type="text" id="edit-skills" value="${currentUser.skills || ''}">
            </div>

            <button onclick="saveProfile()">💾 Salvar Perfil</button>
        </div>
    `;
}

window.uploadPhoto = async (input) => {
    const file = input.files[0];
    if (!file) return;

    try {
        const storageRef = ref(storage, `profile_photos/${currentUser.uid}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        
        // Update Firestore
        await updateDoc(doc(db, "users", currentUser.uid), { photoURL: url });
        
        // Update Local State
        currentUser.photoURL = url;
        document.getElementById('profile-img-preview').src = url;
        alert("Foto atualizada!");
    } catch (err) {
        console.error(err);
        alert("Erro ao enviar foto: " + err.message);
    }
}

window.saveProfile = async () => {
    const bio = document.getElementById('edit-bio').value;
    const skills = document.getElementById('edit-skills').value;
    
    await updateDoc(doc(db, "users", currentUser.uid), { bio, skills });
    currentUser.bio = bio;
    currentUser.skills = skills;
    alert("Perfil salvo com sucesso!");
}

async function renderMembros(container) {
    document.getElementById('page-title').innerText = 'Membros da EJ';
    const snapshot = await getDocs(collection(db, "users"));
    const members = [];
    snapshot.forEach(doc => members.push(doc.data()));

    container.innerHTML = `
        <div class="card">
            <h3>Nossa Equipe</h3>
            <table>
                <thead>
                    <tr><th>Membro</th><th>Cargo</th><th>Depto</th></tr>
                </thead>
                <tbody>
                    ${members.map(m => `
                        <tr>
                            <td style="display:flex; align-items:center; gap:0.5rem;">
                                <img src="${m.photoURL || 'https://via.placeholder.com/30'}" style="width:30px; height:30px; border-radius:50%;">
                                ${m.name}
                            </td>
                            <td>${m.role}</td>
                            <td>${m.dept}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

async function renderProjetos(container) {
    // Basic Layout for now
    document.getElementById('page-title').innerText = 'Projetos';
    container.innerHTML = '<div class="card"><p>Lógica de projetos migrando para Firestore...</p></div>';
}

function renderHistoria(container) {
    container.innerHTML = '<div class="card"><h3>Nossa História</h3><p>Fundada em 2015...</p></div>';
}

async function renderEconomia(container) {
    container.innerHTML = '<div class="card"><h3>Economia</h3><p>Dados financeiros...</p></div>';
}

async function renderGastos(container) {
     container.innerHTML = '<div class="card"><h3>Gastos</h3><p>Dados de despesas...</p></div>';
}
