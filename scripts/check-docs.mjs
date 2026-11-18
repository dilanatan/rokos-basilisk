import {execFileSync} from 'node:child_process';
import {existsSync} from 'node:fs';
const paths=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const allowed=/^(docs|\.claude|\.codex|\.cursor|\.gemini)\//i;
const misplaced=[...new Set(paths)].filter(file=>/\.md$/i.test(file)&&existsSync(file)&&!allowed.test(file));
if(misplaced.length){
  console.error('Markdown belgeleri docs/ veya ilgili AI dizininde bulunmalı:\n'+misplaced.join('\n'));
  process.exitCode=1;
}else console.log('Markdown yerleşimi uygun: docs/ ve AI dizinleri.');
