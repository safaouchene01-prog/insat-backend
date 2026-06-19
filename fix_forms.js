const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, "frontend/src/components/auth/PatientRegistration.tsx"),
  path.join(__dirname, "frontend/src/components/auth/DoctorRegistration.tsx"),
  path.join(__dirname, "frontend/src/components/auth/ClinicRegistration.tsx")
];

for (const file of files) {
  if (!fs.existsSync(file)) {
    console.log(`File not found: ${file}`);
    continue;
  }
  let content = fs.readFileSync(file, 'utf8');
  
  // Labels
  content = content.replace(/block text-sm font-medium text-gray-700/g, 'label');
  
  // Inputs
  content = content.replace(/mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-\[var\(--color-primary\)\]/g, 'input mt-1');
  content = content.replace(/mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl/g, 'input mt-1');
  
  // Inputs with icons
  content = content.replace(/block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-\[var\(--color-primary\)\]/g, 'input pl-10');
  content = content.replace(/block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl/g, 'input pl-10');
  
  // Textarea fixes
  content = content.replace(/input mt-1" placeholder/g, 'input !h-auto py-3 mt-1" placeholder');
  
  // Buttons
  content = content.replace(/w-full flex items-center justify-center py-4 rounded-xl text-base font-bold text-white bg-\[var\(--color-primary\)\] hover:bg-\[var\(--color-secondary\)\]/g, 'btn-primary w-full py-4 text-base');
  content = content.replace(/w-full flex items-center justify-center py-4 rounded-xl font-bold text-white bg-\[var\(--color-primary\)\] hover:bg-\[var\(--color-secondary\)\]/g, 'btn-primary w-full py-4 text-base');
  content = content.replace(/w-2\/3 flex items-center justify-center py-4 rounded-xl font-bold text-white bg-\[var\(--color-primary\)\] hover:bg-\[var\(--color-secondary\)\] disabled:opacity-50/g, 'btn-primary w-2/3 py-4 text-base disabled:opacity-50');
  content = content.replace(/w-1\/3 flex items-center justify-center py-4 rounded-xl font-bold text-gray-700 bg-gray-200 hover:bg-gray-300/g, 'btn-secondary w-1/3 py-4 text-base');
  
  // Colors
  content = content.replace(/var\(--color-primary\)/g, 'var(--insat-blue)');
  content = content.replace(/var\(--color-secondary\)/g, 'var(--insat-blue-dark)');
  
  // Containers
  content = content.replace(/bg-gray-50 p-6 rounded-2xl mb-6/g, 'bg-[var(--insat-page-bg)] p-6 rounded-[var(--radius-card)] border border-[var(--insat-border)] mb-6');
  content = content.replace(/border-b border-gray-100/g, 'border-b border-[var(--insat-border)]');
  
  // Text colors
  content = content.replace(/text-gray-800/g, 'text-[var(--insat-text-heading)]');
  content = content.replace(/text-gray-500/g, 'text-[var(--insat-text-muted)]');
  content = content.replace(/text-gray-400/g, 'text-[var(--insat-text-hint)]');

  fs.writeFileSync(file, content, 'utf8');
  console.log(`Updated ${file}`);
}
