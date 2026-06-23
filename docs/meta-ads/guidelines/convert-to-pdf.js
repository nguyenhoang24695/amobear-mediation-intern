const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const inputMd = path.resolve(__dirname, 'META_ADS_PARTNER_ONBOARDING_GUIDE_EN.md');
const outDir = path.resolve(__dirname, 'mermaid-diagrams');
const tempMd = path.resolve(__dirname, 'META_ADS_PARTNER_ONBOARDING_GUIDE_EN.rendered.md');
const outputPdf = path.resolve(__dirname, 'META_ADS_PARTNER_ONBOARDING_GUIDE_EN.pdf');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

let md = fs.readFileSync(inputMd, 'utf8');
const regex = /```mermaid\s*\n([\s\S]*?)\n```/g;

let idx = 0;
const diagrams = [];
md = md.replace(regex, (_, code) => {
    idx++;
    const mmdFile = path.join(outDir, `diagram-${idx}.mmd`);
    const pngFile = path.join(outDir, `diagram-${idx}.png`);
    fs.writeFileSync(mmdFile, code, 'utf8');
    diagrams.push({ idx, mmdFile, pngFile, code });
    const rel = `./mermaid-diagrams/diagram-${idx}.png`;
    return `![Diagram ${idx}](${rel})`;
});

console.log(`Found ${diagrams.length} mermaid diagrams. Rendering...`);

for (const d of diagrams) {
    try {
        console.log(`  → Rendering diagram ${d.idx}...`);
        execSync(`mmdc -i "${d.mmdFile}" -o "${d.pngFile}" -b white -w 1400 -s 2`, { stdio: 'pipe' });
    } catch (e) {
        console.error(`  × Failed diagram ${d.idx}:`, e.message);
    }
}

fs.writeFileSync(tempMd, md, 'utf8');
console.log('Wrote rendered markdown.');

console.log('Generating PDF...');
execSync(`md-to-pdf "${tempMd}"`, { stdio: 'inherit', cwd: __dirname });

const producedPdf = tempMd.replace(/\.md$/, '.pdf');
if (fs.existsSync(producedPdf)) {
    fs.renameSync(producedPdf, outputPdf);
    console.log(`PDF created: ${outputPdf}`);
}

fs.unlinkSync(tempMd);
console.log('Done.');
