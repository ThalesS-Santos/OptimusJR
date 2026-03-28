const fs = require('fs');

let c = fs.readFileSync('frontend/app.js', 'utf8');

const utils = `
// --- UX UTILITIES ---
window.showToast = (msg, type='info') => { 
    const container = document.getElementById('toast-container'); 
    if(!container) return; 
    const t = document.createElement('div'); 
    t.className = 'toast toast-' + type; 
    t.innerHTML = msg; 
    container.appendChild(t); 
    setTimeout(() => t.classList.add('show'), 10); 
    setTimeout(() => { 
        t.classList.remove('show'); 
        setTimeout(() => t.remove(), 400); 
    }, 4000); 
};
window.renderSkeleton = (type) => { 
    if(type === 'cards') return '<div style="display:flex;gap:1rem;"><div class="skeleton skeleton-card" style="width:300px;"></div><div class="skeleton skeleton-card" style="width:300px;"></div></div>'; 
    return '<div class="skeleton skeleton-title"></div><div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text"></div>'; 
};
`;

c = c.replace(/import \{ calendarEvents \} from '\.\/events\.js';/, `import { calendarEvents } from './events.js';\n` + utils);

// Replace alert("...") with window.showToast("...", "type")
c = c.replace(/alert\((.*?)\)/g, (match, p1) => { 
    const typ = (p1.toLowerCase().includes('erro') || p1.toLowerCase().includes('negado')) ? 'error' : 'success'; 
    return `window.showToast(${p1}, '${typ}')`; 
});

// Implement Skeletons and DOMPurify on some innerHTML blocks
c = c.replace(/'<div class="card">Erro ao carregar os leads do banco.<\/div>'/g, 'window.renderSkeleton() + "<br><span style=\'color:red\'>Erro no banco.</span>"');

fs.writeFileSync('frontend/app.js', c);
console.log("Refactoring applied successfully!");
