const fs = require('fs');
const path = require('path');
const mm = require('music-metadata');

async function generate() {
  const musicDir = __dirname;
  let playlist = [];
  console.log(`正在生成 ${musicDir} 目录下的音乐列表...`);

  const files = fs.readdirSync(musicDir);
  for (const file of files) {
    if (file.endsWith('.mp3') || file.endsWith('.wav') || file.endsWith('.flac') || file.endsWith('.ogg')) {
      const filePath = path.join(musicDir, file);
      console.log(`正在处理文件: ${filePath}`);
      mm.parseFile(filePath).then(metadata => {
        console.log(`读取 ${file} 的元数据成功`);
        let coverPath = '/video/default-cover.jpg'; // 默认封面
        if (metadata.common.picture && metadata.common.picture.length > 0) {
          // 保存封面图片为同名 jpg
          const pic = metadata.common.picture[0];
          const imgName = path.parse(file).name + '.jpg';
          fs.writeFileSync(path.join(musicDir, imgName), pic.data);
          coverPath = `/video/${imgName}`;
        }
        playlist.push({
          title: metadata.common.title || path.parse(file).name,
          artist: metadata.common.artist || '未知',
          album: metadata.common.album || '',
          mp3: `/video/${file}`,
          cover: coverPath
        });
      }).then(() => {
        console.log(`已添加 ${file} 到播放列表`);
        fs.writeFileSync(
          path.join(musicDir, 'playlist.json'),
          JSON.stringify(playlist, null, 2)
        );
      }).
      catch(err => {
        console.log(`无法读取 ${file} 的元数据, 错误: ${err.message}`);
      });
    }
  }
}

generate();