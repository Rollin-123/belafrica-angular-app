const fs = require('fs');
const path = require('path');

// Liste des fichiers CSS problématiques
const problemFiles = [
  'src/app/modules/main/pages/messaging.component/messaging.component.scss',
  'src/app/modules/main/pages/profile.component/profile.component.scss',
  'src/app/modules/main/pages/admin-request.component/admin-request.component.scss'
];

console.log('🔧 Optimisation des fichiers CSS...');

problemFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    let optimized = content.replace(/\/\*[\s\S]*?\*\//g, '');
    optimized = optimized.replace(/\s+/g, ' ').trim();
    
    fs.writeFileSync(file, optimized);
  }
});