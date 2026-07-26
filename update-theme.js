const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'artifacts/study-tracker/src/index.css');
let css = fs.readFileSync(cssPath, 'utf8');

const regex = /:root, \.dark \{([\s\S]*?)\}\n\n@layer base/m;

const match = css.match(/:root, \.dark \{([\s\S]*?)\}\n\n@layer base/m) || css.match(/:root, \.dark \{([\s\S]*?)\}\n@layer base/m);

if (match) {
  const darkVars = match[1];
  const newCss = css.replace(match[0], `:root {
  --button-outline: rgba(0, 0, 0, 0.08);
  --badge-outline: rgba(0, 0, 0, 0.05);
  --opaque-button-border-intensity: 9;
  
  --elevate-1: rgba(0, 0, 0, 0.03);
  --elevate-2: rgba(0, 0, 0, 0.07);
  
  --background: 60 14% 98%;
  --foreground: 220 8% 8%;
  --border: 213 12% 90%;
  
  --card: 0 0% 100%;
  --card-foreground: 220 8% 8%;
  --card-border: 213 12% 90%;
  
  --sidebar: 0 0% 100%;
  --sidebar-foreground: 220 8% 8%;
  --sidebar-border: 213 12% 90%;
  --sidebar-primary: 174 69% 39%;
  --sidebar-primary-foreground: 0 0% 100%;
  --sidebar-accent: 213 12% 95%;
  --sidebar-accent-foreground: 220 8% 8%;
  --sidebar-ring: 174 69% 39%;
  
  --popover: 0 0% 100%;
  --popover-foreground: 220 8% 8%;
  --popover-border: 213 12% 90%;
  
  --primary: 174 69% 39%;
  --primary-foreground: 0 0% 100%;
  
  --secondary: 213 12% 95%;
  --secondary-foreground: 220 8% 8%;
  
  --muted: 213 12% 95%;
  --muted-foreground: 212 9% 45%; 
  
  --accent: 213 12% 95%;
  --accent-foreground: 220 8% 8%;
  
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 100%;
  
  --input: 213 12% 90%;
  --ring: 174 69% 39%;
  
  --chart-1: 174 69% 39%;
  --chart-2: 40 51% 47%;
  --chart-3: 210 90% 52%;
  --chart-4: 270 70% 60%;
  --chart-5: 22 80% 52%;
  
  --app-font-sans: 'Inter', sans-serif;
  --app-font-serif: Georgia, serif;
  --app-font-mono: 'JetBrains Mono', monospace;
  
  --gold: 40 51% 47%;
  --radius: 1rem;
  
  --shadow-2xs: 0px 1px 2px 0px rgba(0,0,0,0.05);
  --shadow-xs: 0px 1px 2px 0px rgba(0,0,0,0.05);
  --shadow-sm: 0px 1px 3px 0px rgba(0,0,0,0.1), 0px 1px 2px -1px rgba(0,0,0,0.1);
  --shadow: 0px 1px 3px 0px rgba(0,0,0,0.1), 0px 1px 2px -1px rgba(0,0,0,0.1);
  --shadow-md: 0px 4px 6px -1px rgba(0,0,0,0.1), 0px 2px 4px -2px rgba(0,0,0,0.05);
  --shadow-lg: 0px 10px 15px -3px rgba(0,0,0,0.1), 0px 4px 6px -4px rgba(0,0,0,0.05);
  --shadow-xl: 0px 20px 25px -5px rgba(0,0,0,0.1), 0px 8px 10px -6px rgba(0,0,0,0.1);
  --shadow-2xl: 0px 25px 50px -12px rgba(0,0,0,0.25);
  
  --tracking-normal: 0em;
  --spacing: 0.25rem;
  --sidebar-primary-border: hsl(from hsl(var(--sidebar-primary)) h s calc(l + var(--opaque-button-border-intensity)) / alpha);
  --sidebar-accent-border: hsl(from hsl(var(--sidebar-accent)) h s calc(l + var(--opaque-button-border-intensity)) / alpha);
  --primary-border: hsl(from hsl(var(--primary)) h s calc(l + var(--opaque-button-border-intensity)) / alpha);
  --secondary-border: hsl(from hsl(var(--secondary)) h s calc(l + var(--opaque-button-border-intensity)) / alpha);
  --muted-border: hsl(from hsl(var(--muted)) h s calc(l + var(--opaque-button-border-intensity)) / alpha);
  --accent-border: hsl(from hsl(var(--accent)) h s calc(l + var(--opaque-button-border-intensity)) / alpha);
  --destructive-border: hsl(from hsl(var(--destructive)) h s calc(l + var(--opaque-button-border-intensity)) / alpha);
}

.dark {${darkVars}}

@layer base`);
  fs.writeFileSync(cssPath, newCss, 'utf8');
  console.log("Updated index.css");
} else {
  console.log("Match not found in index.css");
}
