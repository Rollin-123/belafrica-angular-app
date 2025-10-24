const fs = require('fs');
const path = require('path');


// Liste des fichiers CSS problématiques
const problemFiles = [
  'src/app/modules/main/pages/messaging.component/messaging.component.scss',
  'src/app/modules/main/pages/profile.component/profile.component.scss',
  'src/app/modules/main/pages/admin-request.component/admin-request.component.scss',
  'src/app/modules/main/pages/settings.component/settings.component.scss',
  'src/app/modules/admin/pages/admin-code-generator.component/admin-code-generator.component.scss',
  'src/app/modules/main/pages/create-post-modal.component/create-post-modal.component.scss'
];

problemFiles.forEach(file => {
  if (fs.existsSync(file)) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      
      let optimized = content
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\s+/g, ' ')
        .replace(/\s*([{};:,])\s*/g, '$1')
        .replace(/;}/g, '}')
        .replace(/(\s|:)0(px|em|%|rem)/g, '$10')
        .trim();
      
      fs.writeFileSync(file, optimized);
    } catch (error) {
      console.log(`❌ Erreur avec: ${file}`, error.message);
    }
  } else {
  }
});
