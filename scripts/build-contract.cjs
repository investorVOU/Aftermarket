const {spawnSync}=require('node:child_process');const path=require('node:path');const fs=require('node:fs');
const root=path.join(__dirname,'..'),local=path.join(root,'.tooling/rust');
const flags=['-C','target-feature=-bulk-memory,-reference-types,-multivalue',...(fs.existsSync(path.join(local,'lib/rustlib/wasm32-unknown-unknown'))?['--sysroot',local]:[])];
const localConfig=path.join(root,'.tooling/cargo/config.toml');
const offline=fs.existsSync(localConfig)&&fs.readFileSync(localConfig,'utf8').includes('local-transport');
const result=spawnSync('cargo',['build',...(offline?['--offline']:[]),'--locked','--manifest-path',path.join(root,'contracts/economy/Cargo.toml'),'--target','wasm32-unknown-unknown','--release'],{stdio:'inherit',env:{...process.env,CARGO_HOME:path.join(root,'.tooling/cargo'),CARGO_ENCODED_RUSTFLAGS:flags.join('\x1f')}});
process.exit(result.status??1);
