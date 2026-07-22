const fs = require('fs');
const path = require('path');

function updateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Add StarHalf to lucide-react import
  if (content.includes("from 'lucide-react'") && !content.includes('StarHalf')) {
    content = content.replace(/Star,/, 'Star, StarHalf,');
  }

  // Replace various star loops
  // In PenilaianTugas.tsx around line 288 (panel penilaian attachment)
  content = content.replace(
    /\{\[1, 2, 3, 4, 5\]\.map\(\(star\) => \(\s*<Star[^>]*\(\(att\.score && star <= att\.score\)[^>]*\/>\s*\)\)}/g,
    `{[1, 2, 3, 4, 5].map((star) => (
      (att.score || 0) >= star ? <Star key={star} size={16} className="fill-amber-400 text-amber-400" />
      : (att.score || 0) >= star - 0.5 ? <StarHalf key={star} size={16} className="fill-amber-400 text-amber-400" />
      : <Star key={star} size={16} className="fill-transparent text-slate-300 stroke-current" />
    ))}`
  );

  // In PenilaianTugas.tsx main table
  content = content.replace(
    /\[1, 2, 3, 4, 5\]\.map\(\(star\) => \(\s*<Star key=\{star\} size=\{16\} className=\{`\$\{star <= report\.score! \? 'fill-amber-400 text-amber-400' : 'fill-transparent stroke-current'\}`\} \/>\s*\)\)/g,
    `[1, 2, 3, 4, 5].map((star) => (
      report.score! >= star ? <Star key={star} size={16} className="fill-amber-400 text-amber-400" />
      : report.score! >= star - 0.5 ? <StarHalf key={star} size={16} className="fill-amber-400 text-amber-400" />
      : <Star key={star} size={16} className="fill-transparent stroke-current text-slate-300" />
    ))`
  );
  
  content = content.replace(
    /\[1, 2, 3, 4, 5\]\.map\(\(star\) => \(\s*<Star key=\{\`mobile-\$\{star\}\`\} size=\{14\} className=\{`\$\{star <= report\.score! \? 'fill-amber-400 text-amber-400' : 'fill-transparent stroke-current'\}`\} \/>\s*\)\)/g,
    `[1, 2, 3, 4, 5].map((star) => (
      report.score! >= star ? <Star key={\`mobile-\${star}\`} size={14} className="fill-amber-400 text-amber-400" />
      : report.score! >= star - 0.5 ? <StarHalf key={\`mobile-\${star}\`} size={14} className="fill-amber-400 text-amber-400" />
      : <Star key={\`mobile-\${star}\`} size={14} className="fill-transparent stroke-current text-slate-300" />
    ))`
  );

  // In TugasStaff.tsx Desktop table
  content = content.replace(
    /\{\[1, 2, 3, 4, 5\]\.map\(\(star\) => \(\s*<Star\s*key=\{star\}\s*size=\{16\}\s*className=\{score >= star\s*\?\s*'fill-amber-400 text-amber-400'\s*:\s*'fill-transparent text-slate-300'\s*\}\s*\/>\s*\)\)}/g,
    `{[1, 2, 3, 4, 5].map((star) => (
      score >= star ? <Star key={star} size={16} className="fill-amber-400 text-amber-400" />
      : score >= star - 0.5 ? <StarHalf key={star} size={16} className="fill-amber-400 text-amber-400" />
      : <Star key={star} size={16} className="fill-transparent text-slate-300 stroke-current" />
    ))}`
  );

  // In TugasStaff.tsx Mobile table
  content = content.replace(
    /\{\[1, 2, 3, 4, 5\]\.map\(\(star\) => \(\s*<Star\s*key=\{\`mobile-\$\{star\}\`\}\s*size=\{16\}\s*className=\{score >= star \? 'fill-amber-400 text-amber-400' : 'fill-transparent text-slate-300'\}\s*\/>\s*\)\)}/g,
    `{[1, 2, 3, 4, 5].map((star) => (
      score >= star ? <Star key={\`mobile-\${star}\`} size={16} className="fill-amber-400 text-amber-400" />
      : score >= star - 0.5 ? <StarHalf key={\`mobile-\${star}\`} size={16} className="fill-amber-400 text-amber-400" />
      : <Star key={\`mobile-\${star}\`} size={16} className="fill-transparent text-slate-300 stroke-current" />
    ))}`
  );

  fs.writeFileSync(filePath, content);
}

updateFile(path.join(__dirname, '../src/pages/admin/PenilaianTugas.tsx'));
updateFile(path.join(__dirname, '../src/pages/admin/TugasStaff.tsx'));
console.log('Done');
