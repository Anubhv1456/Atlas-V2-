const fs = require('fs');

let path = 'artifacts/study-tracker/src/main.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "import { registerSW } from 'virtual:pwa-register';",
  "// @ts-ignore\nimport { registerSW } from 'virtual:pwa-register';"
);

content = content.replace(
  "onRegisteredSW(swScriptUrl, registration) {",
  "onRegisteredSW(swScriptUrl: string, registration: ServiceWorkerRegistration | undefined) {"
);

content = content.replace(
  "onRegisterError(error) {",
  "onRegisterError(error: any) {"
);

fs.writeFileSync(path, content);
