import fs from 'fs';
import path from 'path';

function checkCaseSensitivity(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            checkCaseSensitivity(fullPath);
        } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
            let match;
            while ((match = importRegex.exec(content)) !== null) {
                const importPath = match[1];
                if (importPath.startsWith('.')) {
                    const resolvedPath = path.resolve(dir, importPath);
                    const parsedPath = path.parse(resolvedPath);
                    // Check if file exists with exact case
                    const dirFiles = fs.readdirSync(parsedPath.dir).map(f => f);
                    if (!dirFiles.includes(parsedPath.base)) {
                        // Might be missing extension
                        const baseWithoutExt = parsedPath.base;
                        const extensions = ['.js', '.jsx', '.ts', '.tsx', '.css'];
                        let found = false;
                        for (const ext of extensions) {
                            if (dirFiles.includes(baseWithoutExt + ext)) {
                                found = true;
                                break;
                            }
                        }
                        if (!found) {
                            console.log(`CASE ISSUE or MISSING FILE: In ${fullPath}, imported ${importPath}`);
                        }
                    }
                }
            }
        }
    }
}

checkCaseSensitivity(path.resolve('./src'));
console.log("Check complete.");
