const fs = require('fs');
let path = 'artifacts/study-tracker/src/lib/driveSync.ts';
let content = fs.readFileSync(path, 'utf8');

let newSetupTokenClient = `let activeAuthResolve: ((res: any) => void) | null = null;
let activeAuthReject: ((err: any) => void) | null = null;
let isSilentRenewal = false;

const loadGis = () => {
  return new Promise<void>((resolve) => {
    if (window.google && window.google.accounts) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
};

const setupTokenClient = async () => {
  await loadGis();
  if (!tokenClient && window.google?.accounts?.oauth2) {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: async (response: any) => {
        if (response.error !== undefined) {
          console.error('GIS token error:', response);
          if (authFailureListener) authFailureListener();
          if (activeAuthReject) {
            activeAuthReject(new Error(response.error_description || response.error));
            activeAuthReject = null;
            activeAuthResolve = null;
          }
          return;
        }
        const token = response.access_token;
        const expiresIn = response.expires_in ? Number(response.expires_in) : 3600;

        if (isSilentRenewal) {
            saveSession(currentUser, token, expiresIn);
            if (authStateListener) authStateListener(currentUser, token);
            if (activeAuthResolve) activeAuthResolve(token);
        } else {
            try {
              const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: \`Bearer \${token}\` }
              });
              const data = await res.json();
              const user = {
                displayName: data.name,
                email: data.email,
                photoURL: data.picture,
                uid: data.sub
              };

              saveSession(user, token, expiresIn);

              if (authStateListener) authStateListener(currentUser, accessToken!);
              if (activeAuthResolve) activeAuthResolve({ user: currentUser, accessToken: accessToken! });
            } catch (err) {
              console.error(err);
              if (activeAuthReject) activeAuthReject(err);
            }
        }
        activeAuthResolve = null;
        activeAuthReject = null;
      },
      error_callback: (err: any) => {
         console.warn('GIS error callback:', err);
         if (activeAuthReject) {
            activeAuthReject(new Error(err?.type || 'Authentication failed or popup closed'));
         }
         activeAuthResolve = null;
         activeAuthReject = null;
      }
    });
  }
};`;

// replace from `const loadGis = () => {` to `  }
//};` before `export const initAuth = (`
let regex = /const loadGis = \(\) => \{[\s\S]+?const setupTokenClient = async \(\) => \{[\s\S]+?\}\n    \}\);\n  \}\n\};/;
content = content.replace(regex, newSetupTokenClient);
fs.writeFileSync(path, content);
