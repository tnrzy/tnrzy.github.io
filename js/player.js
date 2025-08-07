(function ($) {
    let localStorage_init = function () {
        if (localStorage.volume == undefined) {
            localStorage.volume = 1;
        }
        if (localStorage.muted == undefined) {
            localStorage.muted = false;
        }
        if (localStorage.qplayer_mode == undefined) {
            localStorage.qplayer_mode = 0;
        }
        if (localStorage.qplayer_shuffle_array == undefined) {
            localStorage.qplayer_shuffle_array = JSON.stringify([]);
        }
        if (localStorage.song == undefined) {
            localStorage.song = 0;
        }
        if (localStorage.time == undefined) {
            localStorage.time = 0;
        }
        if (localStorage.qplayer == undefined) {
            localStorage.qplayer = false;
        }
    }
    localStorage_init();
    // Settings
    let isShowNotification = false,
        isInitMarquee = true,
        shuffleArray = [],
        shuffleIndex,
        autoClearTimer,
        autoShowTimer,
        isFirstPlay = JSON.parse(localStorage.qplayer) == undefined ? true : false,
        mode_index = JSON.parse(localStorage.qplayer_mode) == undefined ? 0 : JSON.parse(localStorage.qplayer_mode),
        mode = ['list', 'all', 'one', 'random'],
        volumeButton = $('#player .volume'),
        volumeBarWrap = $('#player .volume-bar-wrap'),
        volumeBar = $('#player .volume-bar'),
        volumeBarBackground = $('#player .volume-bar-bg');
	
    sessionStorage.autoPlay = autoplay;

    // Load playlist
    for (var i = 0; i < playlist.length; i++) {
        var item = playlist[i];
        $('#playlist').append('<li class="lib" style="overflow:hidden;"><strong style="margin-left: 5px;">' + item.title + '</strong><span style="float: right;" class="artist">' + item.artist + '</span></li>');
        if (item.mp3 == "") {
            $('#playlist li').eq(i).css('color', '#ddd');
        }
    }

    var currentTrack = JSON.parse(localStorage.song), audio, timeout;
    var shuffle_array = JSON.parse(localStorage.qplayer_shuffle_array);
    
    if (mode[mode_index] === 'random') {
        if(shuffle_array === undefined || shuffle_array === 'undefined' || playlist.length != (shuffleArray = JSON.parse(shuffle_array)).length) {
            shuffleArray = Array.from({ length: playlist.length }, (_, i) => i);
            shuffleArray = shuffle(shuffleArray);
            localStorage.qplayer_shuffle_array = JSON.stringify(shuffleArray);
        }
        else shuffleArray = JSON.parse(shuffle_array);

        if (currentTrack == undefined || currentTrack === 'undefined' || currentTrack >= playlist.length) {
            currentTrack = shuffleArray[0];
            shuffleIndex = 0;
        }
        else {
            for (var j = 0; j < shuffleArray.length; j++) {
                if (shuffleArray[j] === currentTrack) {
                    shuffleIndex = j;
                    break;
                }
            }
        }
        $('#QPlayer .cover').attr('title', '点击关闭随机播放');
    } else {
        $('#QPlayer .cover').attr('title', '点击开启随机播放');
    }
	
    //判断是否显示滚动条
    var totalHeight = 0;
    for (var i = 0; i < playlist.length; i++) {
        totalHeight += ($('#playlist li').eq(i).height() + 6);
    }
    if (totalHeight > 360) {
        $('#playlist').css("overflow", "auto");
        if (mode[mode_index] === 'random') {
            var temp = 0;
            for (var j = 0; j < currentTrack; j++) {
                temp += ($('#playlist li').eq(j).height() + 6);
            }
            $('#playlist').scrollTop(temp);
        }
    }

    var play = function () {
		// add
        sessionStorage.autoPlay = true;
        timeout = setInterval(updateProgress, 500);
        setTimeout(audio.play(), 300);
        if (isRotate) {
            $("#player .cover img").css("animation", "9.8s linear 0s normal none infinite rotate");
            $("#player .cover img").css("animation-play-state", "running");
        }
        $('.playback').addClass('playing');
        //超过显示栏运行跑马灯
        if (isExceedTag()) {
            if (isInitMarquee) {
                initMarquee();
                isInitMarquee = false;
            } else {
                $('.marquee').marquee('resume');
            }
        }
    }

    var pause = function () {
        audio.pause();
        updateProgress();
        $("#player .cover img").css("animation-play-state", "paused");
        $('.playback').removeClass('playing');
        clearInterval(timeout);
        if (isExceedTag()) {
            $('.marquee').marquee('pause');
        }
        sessionStorage.autoPlay = false;
    }

    // Update progress
    var setProgress = function (value) {
        if (!audio || !audio.duration) {
            $('.timer').html('0:00 / 0:00');
            $('.progress-bar').css('width', 0 + '%');
        }
        else {
            let currentSec = parseInt(value % 60) < 10 ? '0' + parseInt(value % 60) : parseInt(value % 60),
                currentMin = parseInt(value / 60),
                endMin = parseInt(audio.duration / 60),
                endSec = parseInt(audio.duration % 60) < 10 ? '0' + parseInt(audio.duration % 60) : parseInt(audio.duration % 60),
                ratio = value / audio.duration * 100;
            $('.timer').html(currentMin + ':' + currentSec + ' / ' + endMin + ':' + endSec);
		    $('.progress-bar').css('width', ratio + '%');
        }
        // add
        localStorage.time = value;
    }

    var updateProgress = function () {
        setProgress(audio.currentTime);
    }

    $('#QPlayer .progress-bar-bg').click(function(e) {
        if (!audio || !audio.duration) return;
        var offsetX = e.offsetX || (e.pageX - $(this).offset().left);
        var percent = offsetX / $(this).width();
        var seekTime = percent * audio.duration;
        if (audio.seekable.length > 0) {
            var start = audio.seekable.start(0);
            var end = audio.seekable.end(0);
            // 只允许跳转到已缓冲的区间
            if (seekTime >= start && seekTime <= end) {
                audio.currentTime = seekTime;
                updateProgress();
            } else {
                showNotification('该位置尚未缓冲，无法跳转');
            }
        } else {
            // 没有可寻址区间，通常是音频未加载
            showNotification('音频尚未加载完成');
        }
        updateProgress();
    });

    // Switch mode
    $('#QPlayer .mode').click(function () {
        mode_index++;
        mode_index %= mode.length;
        localStorage.qplayer_mode = mode_index;
        let mode_icon = $('#QPlayer .ctrl .mode');
        switch(mode[mode_index]) {
            case 'list':
                mode_icon.css('-webkit-mask', 'url(/images/audio/loop-list.svg)');
                mode_icon.css('mask', 'url(/images/audio/loop-list.svg)');
                mode_icon.attr('title', '列表播放');
                showNotification('已切换为列表播放');

                $("#player .cover").attr("title", "点击开启随机播放");
                break;
            case 'all':
                mode_icon.css('-webkit-mask', 'url(/images/audio/loop-all.svg)');
                mode_icon.css('mask', 'url(/images/audio/loop-all.svg)');
                mode_icon.attr('title', '循环播放');
                showNotification('已切换为循环播放');

                $("#player .cover").attr("title", "点击开启随机播放");
                break;
            case 'one':
                mode_icon.css('-webkit-mask', 'url(/images/audio/loop-one.svg)');
                mode_icon.css('mask', 'url(/images/audio/loop-one.svg)');
                mode_icon.attr('title', '单曲循环');
                showNotification('已切换为单曲循环');

                $("#player .cover").attr("title", "点击开启随机播放");
                break;
            case 'random':
                mode_icon.css('-webkit-mask', 'url(/images/audio/loop-random.svg)');
                mode_icon.css('mask', 'url(/images/audio/loop-random.svg)');
                mode_icon.attr('title', '随机播放');
                showNotification('已切换为随机播放');

                $("#player .cover").attr("title", "点击关闭随机播放");

                var temp = Array.from({ length: playlist.length }, (_, i) => i);
                shuffleArray = shuffle(temp);
                for (var j = 0; j < shuffleArray.length; j++) {
                    if (shuffleArray[j] === currentTrack) {
                        shuffleIndex = j;
                        break;
                    }
                }
                localStorage.qplayer_shuffle_array = JSON.stringify(shuffleArray);
                break;
            default:
                mode_icon.css('-webkit-mask', 'url(/images/audio/loop-list.svg)');
                mode_icon.css('mask', 'url(/images/audio/loop-list.svg)');
                mode_icon.attr('title', '列表播放');

                $("#player .cover").attr("title", "点击开启随机播放");
                break;
        }
    });

    // Switch track
    var switchTrack = function (i) {
        if (i < 0) {
            track = currentTrack = playlist.length - 1;
        } else if (i >= playlist.length) {
            track = currentTrack = 0;
        } else {
            track = currentTrack= i;
        }
        isInitMarquee = true;
        $('audio').remove();
        loadMusic(track);
        play();
    }

    // Shuffle
    var shufflePlay = function (i) {
        if (i === 1) {
            //下一首
            if (++shuffleIndex === shuffleArray.length) {
                shuffleIndex = 0;
            }
            currentTrack = shuffleArray[shuffleIndex];

        } else if (i === 0) {
            //上一首
            if (--shuffleIndex < 0) {
                shuffleIndex = shuffleArray.length - 1;
            }
            currentTrack = shuffleArray[shuffleIndex];
        }
        switchTrack(currentTrack);
    }

    // Fire when track ended
    var ended = function () {
        updateProgress();
        setTimeout(function () {
            audio.currentTime = 0;
            switch(mode[mode_index]) {
                case 'list':
                    if (currentTrack < playlist.length-1) switchTrack(++currentTrack);
                    else {
                        switchTrack(0);
                        pause();
                    }
                    break;
                case 'all':
                    switchTrack(++currentTrack);
                    break;
                case 'one':
                    play();
                    break;
                case 'random':
                    shufflePlay(1);
                    // 随机播放
                    break;
                default:
                    if (currentTrack < playlist.length-1) switchTrack(++currentTrack);
                    break;
            }
        }, 1000);
    }

    var beforeLoad = function () {
        var endVal = this.seekable && this.seekable.length ? this.seekable.end(0) : 0;
    }

    // Fire when track loaded completely
    var afterLoad = function () {
        if (sessionStorage.autoPlay === 'true') play();
    }

    // Load track
    var loadMusic = function (i) {
        var item = playlist[i];
        while (item.mp3 == "") {
            showNotification('歌曲地址为空，已自动跳过');
            if (mode[mode_index] === 'random') {
                if (++shuffleIndex === shuffleArray.length) {
                    shuffleIndex = 0;
                }
                i = currentTrack = shuffleArray[shuffleIndex];
            } else {
                currentTrack = ++i;
            }
            item = playlist[i];
        }
        var newaudio = $('<audio>').html('<source src="' + item.mp3 + '">').appendTo('#player');
        $('.cover').html('<img src="' + item.cover + '" alt="' + item.album + '">');
        $('.musicTag').html('<strong>' + item.title + '</strong><span> - </span><span class="artist">' + item.artist + '</span>');
        $('#playlist li').removeClass('playing').eq(i).addClass('playing');
        audio = newaudio[0];
        localStorage.song = currentTrack;

        audio.preload = "auto";
        audio.volume = localStorage.volume ? JSON.parse(localStorage.volume) : 1;
        audio.muted = localStorage.muted ? JSON.parse(localStorage.muted) : false;
        audio.addEventListener('progress', beforeLoad, false);
        audio.addEventListener('durationchange', beforeLoad, false);
        audio.addEventListener('canplay', afterLoad, false);
        audio.addEventListener('ended', ended, false);
    }
    
    let switchVolumeIcon = function() {
        let volumeIcon = $('#player .volume');
        if (volume() >= 0.75) {
            volumeIcon.css('-webkit-mask', 'url(/images/audio/volume-up.svg)');
            volumeIcon.css('mask', 'url(/images/audio/volume-up.svg)');
        } else if (volume() > 0) {
            volumeIcon.css('-webkit-mask', 'url(/images/audio/volume-down.svg)');
            volumeIcon.css('mask', 'url(/images/audio/volume-down.svg)');
        } else {
            volumeIcon.css('-webkit-mask', 'url(/images/audio/volume-off.svg)');
            volumeIcon.css('mask', 'url(/images/audio/volume-off.svg)');
        }
    }

    let volume = function(percentage, nostorage) {
        percentage = parseFloat(percentage);
        if (!isNaN(percentage)) {
            percentage = Math.max(percentage, 0);
            percentage = Math.min(percentage, 1);
            volumeBar.css('height', (percentage * 100) + '%');
            if (!nostorage) {
                localStorage.volume = percentage;
            }

            audio.volume = percentage;
            if (audio.muted) {
                audio.muted = false;
            }

            switchVolumeIcon();
        }

        return audio.muted ? 0 : audio.volume;
    }

    volumeButton.click ((e) => {
        if (audio.muted) {
            volume(audio.volume, true);
        } else {
            audio.muted = true;
            switchVolumeIcon();
            volumeBar.css('height','0%');
        }
        localStorage.muted = audio.muted;
    });

    const thumbMove = (e) => {
        let percentage = 1 - (e.pageY - volumeBarBackground.offset().top) / volumeBarBackground.height();
        percentage = Math.max(percentage, 0);
        percentage = Math.min(percentage, 1);
        volume(percentage);
    };

    const thumbUp = (e) => {
        document.onselectstart = null; // 恢复选中
        volumeBarWrap.removeClass('volume-bar-wrap-active');
        document.removeEventListener('mouseup', thumbUp);
        document.removeEventListener('mousemove', thumbMove);
        let percentage = 1 - (e.pageY - volumeBarBackground.offset().top) / volumeBarBackground.height();
        percentage = Math.max(percentage, 0);
        percentage = Math.min(percentage, 1);
        volume(percentage);
    };

    volumeBarWrap.mousedown ((e) => {
        document.onselectstart = () => false; // 禁止选中
        window.getSelection()?.removeAllRanges(); // 清除当前选中内容（兼容性处理）
        
        volumeBarWrap.addClass('volume-bar-wrap-active');
        document.addEventListener('mousemove', thumbMove);
        document.addEventListener('mouseup', thumbUp);
    });
	
    var FirstLoad = function (i, time) {
        if (typeof i != 'number' || isNaN(i) || i >= playlist.length) {
            i = 0;
            currentTrack = 0;
            shuffleIndex = 0;
            time = 0;
        }
        loadMusic(i)
        if (time) {
            audio.currentTime = time
        }
        if (localStorage.volume) {
            audio.volume = JSON.parse(localStorage.volume);
        }
        volume(audio.volume, true);
        if (localStorage.muted) {
            audio.muted = JSON.parse(localStorage.muted);
            if(audio.muted) {
                switchVolumeIcon();
                volumeBar.css('height','0%');
            }
        }
        if (sessionStorage.autoPlay !== 'true') {
            sessionStorage.autoPlay = false;
        }
        if (mode_index === 'undefined' || mode_index === undefined) {
            mode_index = 0;
        }
        let mode_icon = $('#QPlayer .ctrl .mode');
        switch(mode[mode_index]) {
            case 'list':
                mode_icon.css('-webkit-mask', 'url(/images/audio/loop-list.svg)');
                mode_icon.css('mask', 'url(/images/audio/loop-list.svg)');
                mode_icon.attr('title', '列表播放');

                $("#player .cover").attr("title", "点击开启随机播放");
                break;
            case 'all':
                mode_icon.css('-webkit-mask', 'url(/images/audio/loop-all.svg)');
                mode_icon.css('mask', 'url(/images/audio/loop-all.svg)');
                mode_icon.attr('title', '循环播放');

                $("#player .cover").attr("title", "点击开启随机播放");
                break;
            case 'one':
                mode_icon.css('-webkit-mask', 'url(/images/audio/loop-one.svg)');
                mode_icon.css('mask', 'url(/images/audio/loop-one.svg)');
                mode_icon.attr('title', '单曲循环');

                $("#player .cover").attr("title", "点击开启随机播放");
                break;
            case 'random':
                mode_icon.css('-webkit-mask', 'url(/images/audio/loop-random.svg)');
                mode_icon.css('mask', 'url(/images/audio/loop-random.svg)');
                mode_icon.attr('title', '随机播放');

                $("#player .cover").attr("title", "点击关闭随机播放");
                break;
            default:
                mode_icon.css('-webkit-mask', 'url(/images/audio/loop-list.svg)');
                mode_icon.css('mask', 'url(/images/audio/loop-list.svg)');
                mode_icon.attr('title', '列表播放');

                $("#player .cover").attr("title", "点击开启随机播放");
                break;
        }
    }
    
    if (localStorage.volume == undefined) {
        localStorage.volume = 1;
    }

    FirstLoad(currentTrack, localStorage.time);
    if (sessionStorage.autoPlay === 'true') {
        play()
    }

    $('.playback').on('click', function () {
        if ($(this).hasClass('playing')) {
            pause();
        } else {
            play();
        }
    });
	
	// add
    $(document).bind("contextmenu", function () {
        return false;
    })
    $('.rewind').on('click', function () {
        if (mode[mode_index] === 'random') {
            shufflePlay(0);
        } else {
            switchTrack(--currentTrack);
        }
    }).mousedown(function (e) {
        if (3 == e.which) {
            if (audio.volume >= 0.05) {
                audio.volume -= 0.05
            } else {
                audio.volume = 0;
            }
            localStorage.volume = audio.volume;
            switchVolumeIcon();
        }
    });
    $('.fastforward').on('click', function () {
        if (mode[mode_index] === 'random') {
            shufflePlay(1);
        } else {
            switchTrack(++currentTrack);
        }
    }).mousedown(function (e) {
        if (3 == e.which) {
            if (audio.volume <= 0.95) {
                audio.volume += 0.05
            } else {
                audio.volume = 1;
            }
            localStorage.volume = audio.volume;
            switchVolumeIcon();
        }
    });

    $('#playlist li').each(function (i) {
        $(this).on('click', function () {
            if (mode[mode_index] === 'random') {
                for (var j = 0; j < shuffleArray.length; j++) {
                    if (shuffleArray[j] === i) {
                        shuffleIndex = j;
                        break;
                    }
                }
            } else {
                currentTrack = i;
            }
            switchTrack(i);
        });
    });

    $('#QPlayer .liebiao').on('click', function () {
        var pl = $('#playlist');
        if (pl.hasClass('go') === false) {
            pl.css({"max-height": "360px", "transition": "max-height .5s ease"});
            pl.css("border", "1px solid #dedede");
            pl.addClass('go');
        } else {
            pl.css({"max-height": "0px", "transition": "max-height .5s ease"});
            pl.css("border", "0");
            pl.removeClass('go');
        }
    });

    $("#QPlayer .ssBtn").on('click', function () {
        var mA = $("#QPlayer");
        if ($('.ssBtn .adf').hasClass('on') === false) {
            if (isFirstPlay) {
                setTimeout("showTips('#player .cover','点击封面开启(关闭)随机播放', " + function () {
                        setTimeout("showTips('#player .ctrl .musicTag','点击拖动标题栏快进(快退)'," + function () {
                                setTimeout("showTips('#player .ctrl .musicTag','右键点击切歌按钮调节音量大小')", 1000)
                            } + ")", 1000)
                    } + ");", 500);
                isFirstPlay = !isFirstPlay;
                localStorage.qplayer = false;
            }
            mA.css("transform", "translateX(300px)");
            $('.ssBtn .adf').addClass('on');
        } else {
            if($('#playlist').hasClass('go')) $('#QPlayer .liebiao').click();
            mA.css("transform", "translateX(0px)");
            $('.ssBtn .adf').removeClass('on');
        }
    });
    //$("div.ssBtn").click()

    $("#player .cover").on('click', function () {
        mode_index = mode_index === mode.length - 1 ? 0 : mode.length - 1;
        if (mode[mode_index] === 'random') {
            $("#player .ctrl .mode").css("-webkit-mask", "url(/images/audio/loop-random.svg)");
            $("#player .ctrl .mode").css("mask", "url(/images/audio/loop-random.svg)");
            $("#player .ctrl .mode").attr("title", "随机播放");

            $("#player .cover").attr("title", "点击关闭随机播放");
            showNotification('已切换为随机播放');

            var temp = Array.from({ length: playlist.length }, (_, i) => i);
            shuffleArray = shuffle(temp);
            for (var j = 0; j < shuffleArray.length; j++) {
                if (shuffleArray[j] === currentTrack) {
                    shuffleIndex = j;
                    break;
                }
            }
            localStorage.qplayer_shuffle_array = JSON.stringify(shuffleArray);
        } else {
            mode_index = 0;
            $("#player .ctrl .mode").css("-webkit-mask", "url(/images/audio/loop-list.svg)");
            $("#player .ctrl .mode").css("mask", "url(/images/audio/loop-list.svg)");
            $("#player .ctrl .mode").attr("title", "列表播放");

            $("#player .cover").attr("title", "点击开启随机播放");
            showNotification('已切换为列表播放');
            localStorage.removeItem('qplayer_shuffle_array');
        }
        localStorage.qplayer_mode = mode_index;
    });


    // var startX, endX;
    // $('#player .ctrl .musicTag').mousedown(function (event) {
    //     startX = event.screenX;
    // }).mousemove(function (event) {
    //     //鼠标左键
    //     if (event.which === 1) {
    //         endX = event.screenX;
    //         var seekRange = Math.round((endX - startX) / 678 * 100);
    //         audio.currentTime += seekRange;
    //         setProgress(audio.currentTime);
    //     }
    // });

    // $('#player .ctrl .musicTag').bind('touchstart', function (event) {
    //     startX = event.originalEvent.targetTouches[0].screenX;
    // }).bind('touchmove', function (event) {
    //     endX = event.originalEvent.targetTouches[0].screenX;
    //     var seekRange = Math.round((endX - startX) / 678 * 100);
    //     audio.currentTime += seekRange;
    //     setProgress(audio.currentTime);
    // });

})(jQuery);


function initMarquee() {
    $('.marquee').marquee({
        //speed in milliseconds of the marquee
        duration: 15000,
        //gap in pixels between the tickers
        gap: 50,
        //time in milliseconds before the marquee will start animating
        delayBeforeStart: 0,
        //'left' or 'right'
        direction: 'left',
        //true or false - should the marquee be duplicated to show an effect of continues flow
        duplicated: true
    });
}

//检测标题和作者信息总宽度是否超出播放器，超过则返回true开启跑马灯
function isExceedTag() {
    var isExceedTag = false;
    if ($('.musicTag strong').width() + $('.musicTag span').width() + $('.musicTag .artist').width() > $('.musicTag').width()) {
        isExceedTag = true;
    }
    return isExceedTag;
}


function shuffle(array) {
    var m = array.length,
        t, i;
    // 如果还剩有元素…
    while (m) {
        // 随机选取一个元素…
        i = Math.floor(Math.random() * m--);
        // 与当前元素进行交换
        t = array[m];
        array[m] = array[i];
        array[i] = t;
    }
    return array;
}

function showNotification(info) {
    isShowNotification = true;
    //判断通知是否存在，存在就移除
    if ($('.qplayer-notification').length > 0) {
        $('.qplayer-notification').remove();
        clearTimeout(autoClearTimer);
        clearTimeout(autoShowTimer);
    }
    $('body').append('<div class="qplayer-notification animation-target"><span class="qplayer-notification-icon">i</span><span class="body" style="box-shadow: rgba(0, 0, 0, 0.0980392) 0px 0px 5px;"><span class="message"></span></span><a class="close" href="#" onclick="closeNotification();return false;">×</a><div style="clear: both"></div>');
    $('.qplayer-notification .message').text(info);
    //用width:auto来自动获取通知栏宽度
    var width = $('.qplayer-notification').css({"opacity": "0", "width": "auto"}).width() + 20;
    $('.qplayer-notification').css({"width": "50px", "opacity": "1"});

    autoShowTimer = setTimeout(function () {
        $('.qplayer-notification').css({"width": width, "transition": "all .7s ease"});
        $('.qplayer-notification .close').delay(500).show(0);
    }, 1500);
    autoClearTimer = setTimeout("if ($('.qplayer-notification').length>0) {closeNotification()}", 8000);
}


function closeNotification() {
    isShowNotification = false;
    $('.qplayer-notification').css({"width": "50px", "transition": "all .7s ease"});
    $('.qplayer-notification .close').delay(500).hide(0);
    setTimeout(function () {
        if (!isShowNotification) {
            $('.qplayer-notification').css("opacity", "0");
            $('.qplayer-notification-icon').css({"transform": "scale(0)", "transition": "transform .5s ease"});
        }
    }, 1000);
    setTimeout(function () {
        if (!isShowNotification) {
            $('.qplayer-notification').remove();
        }
    }, 1500);
    clearTimeout(autoClearTimer);
    clearTimeout(autoShowTimer);
}

/*
 *div: 要在其上面显示tip的div
 *info: tip内容
 *func: 不再提示按钮的click绑定函数
 */
function showTips(div, info, func) {
    var box_height = 100;
    $('body').append('<div class="qplayer_tips"><span class="tips_arrow"></span><span class="info" style="display:none">' + info + '</span><button class="tips_button" onclick="removeTips()">不再提示</button></div>');
    $('.qplayer_tips').css({"top": $(div).offset().top - box_height - 30 - 15, "left": $(div).offset().left - 28});
    $('.qplayer_tips').css({"height": box_height, "transition": "all .5s ease-in-out"});
    $('.qplayer_tips .info').delay(500).fadeIn();
    $('.tips_arrow').css({"border-width": "15px", "transition": "all .5s ease-in-out"});
    $('.tips_button').css({"height": "30px", "transition": "all .5s ease-in-out"});
    if (func != undefined) {
        $('.tips_button').click(func);
    }
}

function removeTips() {
    $('.qplayer_tips .info').fadeOut();
    $('.qplayer_tips').css({"height": "0", "transition": "all .5s ease-in-out"});
    $('.tips_arrow').css({"border-width": "0", "transition": "all .5s ease-in-out"});
    $('.tips_button').css({"opacity": "0", "transition": "all .2s ease-in-out"});
    setTimeout(function () {
        $('.qplayer_tips').remove()
    }, 500);
}