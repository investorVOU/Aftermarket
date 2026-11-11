const fs=require('node:fs'),path=require('node:path'),esbuild=require('esbuild');
const root=path.join(__dirname,'..');
esbuild.buildSync({absWorkingDir:root,stdin:{contents:fs.readFileSync(path.join(root,'game/near-auth.js'),'utf8'),resolveDir:path.join(root,'game'),sourcefile:'near-auth.js',loader:'js'},outfile:path.join(root,'.tooling/near-auth-check.js'),bundle:true,platform:'browser',format:'esm',tsconfigRaw:{compilerOptions:{}},define:{global:'globalThis'}});
console.log('NEAR Auth adapter and its SDK imports bundle successfully. Live login/linking remain unverified.');
