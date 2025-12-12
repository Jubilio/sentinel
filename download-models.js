import fs from 'fs';
import https from 'https';
import path from 'path';

const urls = [
    {
        url: 'https://raw.githubusercontent.com/infinitered/nsfwjs/master/example/nsfw_demo/public/model/model.json',
        file: 'public/models/nsfw/model.json'
    },
    {
        url: 'https://raw.githubusercontent.com/infinitered/nsfwjs/master/example/nsfw_demo/public/model/group1-shard1of1.bin',
        file: 'public/models/nsfw/group1-shard1of1.bin'
    }
];

const download = (url, dest) => {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
              reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
              return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => {});
            reject(err);
        });
    });
};

const main = async () => {
    // Ensure dir exists
    const dir = 'public/models/nsfw';
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }

    for (const item of urls) {
        console.log(`Downloading ${item.url}...`);
        try {
            await download(item.url, item.file);
            console.log(`Saved to ${item.file}`);
        } catch (e) {
            console.error(e);
        }
    }
};

main();
