const fs = require('fs');
let code = fs.readFileSync('/var/www/self-host/backend/system.js', 'utf8');

code = code.replace(
  /const getSshPublicKey = async \(\) => \{[\s\S]*?return null;\n\};/,
  `const getSshKeys = async () => {
  const sshDir = path.join(os.homedir(), '.ssh');
  try {
    const files = await fs.readdir(sshDir);
    const pubFiles = files.filter(f => f.endsWith('.pub'));
    const keys = [];
    for (const file of pubFiles) {
      const content = await fs.readFile(path.join(sshDir, file), 'utf8');
      keys.push({ filename: file.replace('.pub', ''), publicKey: content });
    }
    return keys;
  } catch (e) {
    return [];
  }
};`
);

code = code.replace(
  /const generateSshKey = async \(\) => \{/,
  `const generateSshKey = async (keyName = 'id_ed25519') => {`
);

code = code.replace(
  /const keyPath = path.join\(sshDir, 'id_ed25519'\);/,
  `const keyPath = path.join(sshDir, keyName);`
);

code = code.replace(
  /fs.readFile\(\`\$\{keyPath\}\.pub\`, 'utf8'\)\.then\(resolve\)\.catch\(reject\);/,
  `fs.readFile(\`\$\{keyPath\}.pub\`, 'utf8').then(content => resolve({ filename: keyName, publicKey: content })).catch(reject);`
);

code = code.replace(
  /getSshPublicKey/,
  `getSshKeys`
);

fs.writeFileSync('/var/www/self-host/backend/system.js', code);
