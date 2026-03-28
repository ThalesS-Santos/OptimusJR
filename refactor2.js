const fs = require('fs');

let appContent = fs.readFileSync('frontend/app.js', 'utf8');

function extractSection(regexStart, regexEnd, filename) {
    const startIdx = appContent.search(regexStart);
    if(startIdx === -1) {
        console.log("Could not find start for " + filename);
        return;
    }
    
    // We search for the end regex from the startIdx
    let substringAfterStart = appContent.substring(startIdx);
    let endIdxOffset = substringAfterStart.search(regexEnd);
    
    if(endIdxOffset === -1) {
        endIdxOffset = substringAfterStart.length; // to the end
    }
    
    const block = substringAfterStart.substring(0, endIdxOffset);
    
    // Replace in main appContent
    appContent = appContent.substring(0, startIdx) + "\n// ---> Extracted to modules/" + filename + "\n" + appContent.substring(startIdx + endIdxOffset);
    
    // Save module
    let fileHeader = `import { supabase } from '../supabase-config.js';\n\n`;
    
    // Fix function declarations so they attach to window to keep HTML inline handlers alive 
    // e.g. async function renderComercial becomes window.renderComercial = async function
    let modularizedBlock = block.replace(/async function (render[A-Za-z0-9_]+)\(container\)/g, "window.$1 = async function(container)");
    modularizedBlock = modularizedBlock.replace(/function (render[A-Za-z0-9_]+)\(container\)/g, "window.$1 = function(container)");
    
    fs.writeFileSync('frontend/modules/' + filename, fileHeader + modularizedBlock);
    console.log("Extracted: " + filename);
}

fs.mkdirSync('frontend/modules', {recursive: true});

// Order is important because we search forward and delete! Start from bottom to top or just use precise boundaries.
extractSection(/async function renderMinhasDemandas/, /async function renderMinhaDiretoria/, 'demandas.js');
extractSection(/async function renderMinhaDiretoria/, /window\.calendarEvents =/, 'diretoria.js');
extractSection(/async function renderCalendario/, /async function renderFeedbacks/, 'calendario.js');
extractSection(/async function renderFeedbacks/, /async function renderMinhasDemandas/, 'feedbacks.js');
extractSection(/window\.funnelColumns = \[/, /async function renderCalendario/, 'comercial.js');
extractSection(/async function renderFinancas/, /window\.funnelColumns = \[/, 'financas.js');
extractSection(/function renderHistoria/, /async function renderFinancas/, 'historia.js');
extractSection(/async function renderProjetos/, /function renderHistoria/, 'projetos.js');
extractSection(/async function renderMembros/, /async function renderProjetos/, 'membros.js');
extractSection(/async function renderProfile/, /window\.uploadPhoto =/, 'profile.js'); // Wait, profile has uploadPhoto below it, we need to extract the whole block
// Actually, let's just do bulk extraction for Profile
extractSection(/async function renderProfile/, /async function renderMembros/, 'profile.js');
extractSection(/async function renderHome/, /async function renderProfile/, 'dashboard.js');

// Add module imports to index.html using an injection script
let indexHtml = fs.readFileSync('frontend/index.html', 'utf8');

// Change script type to module if it's not already
indexHtml = indexHtml.replace(/<script src="app.js\?v=4"><\/script>/, '<script type="module" src="app.js?v=5"></script>');
indexHtml = indexHtml.replace(/<script src="app.js"><\/script>/, '<script type="module" src="app.js"></script>');
fs.writeFileSync('frontend/index.html', indexHtml);

// Add imports to the top of `app.js`
const moduleImports = `
import './modules/dashboard.js';
import './modules/profile.js';
import './modules/membros.js';
import './modules/projetos.js';
import './modules/historia.js';
import './modules/financas.js';
import './modules/comercial.js';
import './modules/calendario.js';
import './modules/feedbacks.js';
import './modules/demandas.js';
import './modules/diretoria.js';

// Global exports para módulos que dependem um do outro (como o router)
window.showDashboard = showDashboard;
window.navTo = window.navTo;
window.currentUser = currentUser; // Note: In ES6 modules, assigning to window makes it globally mutable
`;

// Replace `let currentUser = null;` with `window.currentUser = null;` so modules can access it easily, along with other globals
appContent = appContent.replace(/let currentUser = null;/g, "window.currentUser = null;\n// We use window.currentUser in modules");
appContent = appContent.replace(/let currentPage = 'home';/g, "window.currentPage = 'home';");
appContent = appContent.replace(/currentUser\./g, "window.currentUser.");
appContent = appContent.replace(/currentUser/g, "(window.currentUser)");

appContent = appContent.replace(/import \{ calendarEvents \} from '\.\/events\.js';/, `import { calendarEvents } from './events.js';` + moduleImports);

fs.writeFileSync('frontend/app.js', appContent);
console.log("app.js completely refactored!");
