const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const JSON_PATH = path.join(__dirname, 'data', '식단데이터.json');
const XML_PATH = path.join(__dirname, 'data', '식단데이터.xml');

// Helper wrapper to handle CORS
const setCORSHeaders = (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
};

const server = http.createServer((req, res) => {
    setCORSHeaders(res);

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.url === '/api/diet' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const newDiet = JSON.parse(body);

                // 1. Update JSON
                let diets = [];
                if (fs.existsSync(JSON_PATH)) {
                    diets = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
                }
                const existingIndex = diets.findIndex(d => d['식단ID'] == newDiet['식단ID']);

                if (existingIndex > -1) {
                    diets[existingIndex] = newDiet;
                    console.log(`[JSON] Updated Diet ID: ${newDiet['식단ID']}`);
                } else {
                    diets.push(newDiet);
                    console.log(`[JSON] Created Diet ID: ${newDiet['식단ID']}`);
                }
                fs.writeFileSync(JSON_PATH, JSON.stringify(diets, null, 2), 'utf8');

                // 2. Update XML
                if (fs.existsSync(XML_PATH)) {
                    let xml = fs.readFileSync(XML_PATH, 'utf8');

                    // Simple Regex to remove existing
                    const regex = new RegExp(`<식단>[\\s\\S]*?<식단ID>${newDiet['식단ID']}</식단ID>[\\s\\S]*?</식단>\\s*`, 'g');
                    xml = xml.replace(regex, '');

                    // Build new XML block
                    let foodXml = newDiet['음식'].map(f => `
            <식품>
                <식품코드>${f['식품코드'] || ''}</식품코드>
                <식품명>${f['식품명'] || ''}</식품명>
                <에너지>${f['에너지'] || 0}</에너지>
                <탄수화물>${f['탄수화물'] || 0}</탄수화물>
                <단백질>${f['단백질'] || 0}</단백질>
                <지방>${f['지방'] || 0}</지방>
                <식품중량>${f['식품중량'] || '100g'}</식품중량>
            </식품>`).join('');

                    const dietXml = `
    <식단>
        <식단ID>${newDiet['식단ID']}</식단ID>
        <날짜>${newDiet['날짜']}</날짜>
        <식사구분>${newDiet['식사구분']}</식사구분>
        <음식>${foodXml}
        </음식>
    </식단>`;

                    xml = xml.replace('</식단데이터>', dietXml + '\n</식단데이터>');
                    fs.writeFileSync(XML_PATH, xml, 'utf8');
                    console.log(`[XML] Updated Diet ID: ${newDiet['식단ID']}`);
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'ok' }));
            } catch (err) {
                console.error("Save Error:", err);
                res.writeHead(500);
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    if (req.url.startsWith('/api/diet/') && req.method === 'DELETE') {
        const dietId = req.url.split('/').pop();
        try {
            // 1. Delete JSON
            if (fs.existsSync(JSON_PATH)) {
                let diets = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
                diets = diets.filter(d => d['식단ID'] != dietId);
                fs.writeFileSync(JSON_PATH, JSON.stringify(diets, null, 2), 'utf8');
                console.log(`[JSON] Deleted Diet ID: ${dietId}`);
            }

            // 2. Delete XML
            if (fs.existsSync(XML_PATH)) {
                let xml = fs.readFileSync(XML_PATH, 'utf8');
                const regex = new RegExp(`<식단>[\\s\\S]*?<식단ID>${dietId}</식단ID>[\\s\\S]*?</식단>\\s*`, 'g');
                xml = xml.replace(regex, '');
                fs.writeFileSync(XML_PATH, xml, 'utf8');
                console.log(`[XML] Deleted Diet ID: ${dietId}`);
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'deleted' }));
        } catch (err) {
            console.error("Delete Error:", err);
            res.writeHead(500);
            res.end(JSON.stringify({ error: err.message }));
        }
        return;
    }

    res.writeHead(404);
    res.end();
});

server.listen(PORT, () => {
    console.log("=================================================");
    console.log(` YAMYAM Backend Node Server Running on : ${PORT}`);
    console.log("=================================================");
    console.log("1. Live Server runs your HTML on 5500");
    console.log("2. Your frontend saves directly to JSON & XML here!");
    console.log("=================================================");
});
