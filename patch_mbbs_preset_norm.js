const fs = require('fs');
const file = '/app/applet/artifacts/study-tracker/src/lib/mbbs-preset.ts';
let content = fs.readFileSync(file, 'utf8');

const target = `export async function loadMBBSPreset() {`;

const replacement = `function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // remove spaces and punctuation
    .replace(/labour/g, 'labor')
    .replace(/gynaecolog/g, 'gynecolog')
    .replace(/orthopaedics/g, 'orthopedics')
    .replace(/paediatrics/g, 'pediatrics')
    .replace(/tumour/g, 'tumor')
    .replace(/obstetrics/g, 'obstetric')
    .replace(/haematolog/g, 'hematolog')
    .replace(/anaesthesia/g, 'anesthesia')
    .replace(/foetus/g, 'fetus')
    .replace(/foetal/g, 'fetal')
    .replace(/oesophagus/g, 'esophagus')
    .replace(/diarrhoea/g, 'diarrhea')
    .replace(/programme/g, 'program')
    .replace(/complicationsinpregnancy/g, 'complications')
    .replace(/medicalandsurgical/g, ''); // just some aggressive normalization for those specific obstetrics topics
}

export async function loadMBBSPreset() {`;

content = content.replace(target, replacement);

const targetSubjectMatch = `let subject = existingSubjects.find(s => s.name.toLowerCase().trim() === item.subject.toLowerCase().trim());`;
const replacementSubjectMatch = `let subject = existingSubjects.find(s => normalizeName(s.name) === normalizeName(item.subject));`;
content = content.replace(targetSubjectMatch, replacementSubjectMatch);

const targetSystemMatch = `const topicExists = existingSystems.find(sys => 
          sys.subjectId === subjectId && 
          sys.name.toLowerCase().trim() === topic.toLowerCase().trim()
        );`;
const replacementSystemMatch = `const topicExists = existingSystems.find(sys => 
          sys.subjectId === subjectId && 
          normalizeName(sys.name) === normalizeName(topic)
        );`;
content = content.replace(targetSystemMatch, replacementSystemMatch);

fs.writeFileSync(file, content);
console.log("Done");
