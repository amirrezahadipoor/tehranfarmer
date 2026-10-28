#!/usr/bin/env bash
# استفاده: ./scripts/done.sh P0-04 "پیام کوتاه"
set -euo pipefail
ID="$1"; MSG="$2"
node -e "
const fs=require('fs');const id=process.argv[1];let t=fs.readFileSync('ROADMAP.md','utf8');
const re=new RegExp('^- \\\\[ \\\\] ('+id.replace(/[-]/g,'\\\\-')+') —','m');
if(!re.test(t)){console.error('✕ تسک '+id+' پیدا نشد یا قبلاً تیک خورده');process.exit(1);}
t=t.replace(re,'- [x] $1 —');fs.writeFileSync('ROADMAP.md',t);
" "$ID"
npm run --silent roadmap:progress > /dev/null
git add -A
git commit -q -m "[$ID] $MSG"
git push -q origin main
echo "✔ [$ID] $MSG — push شد"
