const fs = require('fs');

let appContent = fs.readFileSync('frontend/app.js', 'utf8');

const startMarkerStr = 'window.funnelColumns = [';
const endMarkerStr = 'async function renderCalendario(container)';
const startIdx = appContent.indexOf(startMarkerStr);
const endIdx = appContent.indexOf(endMarkerStr);

if(startIdx !== -1 && endIdx !== -1) {
    const block = appContent.substring(startIdx, endIdx);
    
    // Prepare app.js
    appContent = appContent.slice(0, startIdx) + 
                 "// --- COMERCIAL MODULE EXPORTED ---\n" + 
                 appContent.slice(endIdx);
                 
    // Import comercial on top
    appContent = "import './modules/comercial.js';\n" + appContent;
    
    // Fix global variables used in comercial: 
    // It uses: currentUser, window.showToast, supabase, renderComercial, window.funnelColumns
    // we need to make sure currentUser is accessible globally across modules.
    if(appContent.includes("let currentUser = null;")) {
        appContent = appContent.replace("let currentUser = null;", "window.currentUser = null;");
        appContent = appContent.replace(/currentUser = userSnap/g, "window.currentUser = userSnap");
        appContent = appContent.replace(/currentUser = null;/g, "window.currentUser = null;");
        appContent = appContent.replace(/currentUser = insertedUser/g, "window.currentUser = insertedUser");
        appContent = appContent.replace(/currentUser\.bio = bio/g, "window.currentUser.bio = bio");
        appContent = appContent.replace(/currentUser\.role = role/g, "window.currentUser.role = role");
        appContent = appContent.replace(/currentUser\.dept = dept/g, "window.currentUser.dept = dept");
        appContent = appContent.replace(/currentUser\.photoURL = cacheBurstUrl/g, "window.currentUser.photoURL = cacheBurstUrl");
    }

    fs.writeFileSync('frontend/app.js', appContent);
    
    // Prepare comercial.js
    fs.mkdirSync('frontend/modules', {recursive: true});
    let modContent = "import { supabase } from '../supabase-config.js';\n\n" + block;
    
    // Bind functions to window so inline HTML works
    modContent = modContent.replace("async function renderComercial", "window.renderComercial = async function");
    modContent = modContent.replace(/currentUser/g, "window.currentUser"); // Explicit reference
    
    fs.writeFileSync('frontend/modules/comercial.js', modContent);
    console.log("Comercial extracted successfully.");
} else {
    console.log("Could not find markers.");
}
