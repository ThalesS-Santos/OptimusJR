const fs = require('fs');
let code = fs.readFileSync('frontend/modules/comercial.js', 'utf8');

// Patch 1: Store current tab
code = code.replace(
"    window.toggleCommercialTab = (tab) => {\n        const isTabela = tab === 'tabela';",
"    window.toggleCommercialTab = (tab) => {\n        window.currentCommercialTab = tab;\n        const isTabela = tab === 'tabela';"
);

// Patch 2: Read current tab at the end of renderComercial
code = code.replace(
"        }\n    });\n}\n\nfunction generateCalendarDays",
"        }\n    });\n    window.currentCommercialTab = window.currentCommercialTab || 'tabela';\n    window.toggleCommercialTab(window.currentCommercialTab);\n}\n\nfunction generateCalendarDays"
);

fs.writeFileSync('frontend/modules/comercial.js', code);
console.log('Patch applied successfully.');
