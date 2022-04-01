import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const _filename = fileURLToPath(import.meta.url);
const _dirname = dirname(_filename);

function load(uri) {
    let result = false;
    try {
        uri = `${_dirname}/../${uri}`;
        
        if(!fs.existsSync(uri)) {
            fs.writeFileSync(uri, '');
        }

        const rawdata = fs.readFileSync(uri);
        result = JSON.parse(rawdata);
    } catch (err) {
        console.log(`Ошибка при загрузке файла: ${err}`);
    }
    return result;
}

export { load };