const path = require('path');
const fs = require('fs');

// Utility: ensure unique filename (base name without ext)
function uniquePath(dir, baseName, ext) {
    let candidate = path.join(dir, `${baseName}.${ext}`);
    let i = 1;
    while (fs.existsSync(candidate)) {
        candidate = path.join(dir, `${baseName}_${i}.${ext}`);
        i++;
    }
    return candidate;
}

// Parse simple duration strings HH:MM:SS
function parseDurationStr(s) {
    const m = s.match(/(\d+):(\d+):(\d+)/);
    if (!m) return null;
    return parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseInt(m[3]);
}

module.exports = {
    uniquePath,
    parseDurationStr
};