const bcrypt = require('bcrypt');
const hash = '$2b$10$tMh4EeeZJgVfN8l.HExbQeS.jJ.tOa5zP48KkK4P263h/Y2B6hI.q';
const words = ['password', 'password123', 'admin', 'admin123', '123456', 'student', 'student123', 'teacher', 'teacher123'];
for (const w of words) {
  if (bcrypt.compareSync(w, hash)) {
    console.log('MATCH FOUND:', w);
    process.exit(0);
  }
}
console.log('NO MATCH FOUND.');
