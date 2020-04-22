const ap = new APlayer({
    container: document.getElementById('aplayer'),
    fixed: true,
    autoplay: false,
    lrcType: 3,
    audio: [
      {
        name: '麻雀',
        artist: '李荣浩',
        url: '/video/F000000lv3Zi13dSVA.flac',
        cover: 'https://y.gtimg.cn/music/photo_new/T002R300x300M000003eE8gA3TfuKc_1.jpg?max_age=2592000p://oeff2vktt.bkt.clouddn.com/image/96.jpg',
        lrc: '/lrc/F000000lv3Zi13dSVA.lrc',
      },
      {
        name: '我的中国心',
        artist: '张明敏',
        url: '/video/张明敏 - 我的中国心.flac',
      }
    ]
});