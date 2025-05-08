// script.js
document.addEventListener('DOMContentLoaded', () => {
    console.log("播放器 DOMContentLoaded - 脚本开始加载");
    const audioPlayer = document.getElementById('audio-player');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const stopBtn = document.getElementById('stop-btn');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const openFileBtn = document.getElementById('open-file-btn');
    const audioFileInput = document.getElementById('audio-file-input');
    const openUrlBtn = document.getElementById('open-url-btn');

    const progressBar = document.getElementById('progress-bar');
    const currentTimeDisplay = document.getElementById('current-time');
    const totalTimeDisplay = document.getElementById('total-time');
    const volumeSlider = document.getElementById('volume-slider');

    const trackInfoDisplay = document.getElementById('track-info');
    const playStatusDisplay = document.getElementById('play-status');

    const playlistToggleBtn = document.getElementById('playlist-toggle-btn');
    const playlistContainer = document.querySelector('.playlist-container');
    const playlistElement = document.getElementById('playlist');
    const playModeBtn = document.getElementById('play-mode-btn');

    let playlist = [];
    let currentTrackIndex = -1;
    let isPlaying = false;
    let playMode = 0; // 0: 列表循环, 1: 单曲循环, 2: 随机播放
    const playModeIcons = ['🔁', '🔂', '🔀'];

    console.log("播放器变量初始化完毕");

    function getTrackName(source, type) {
        if (type === 'url') {
            try {
                const path = new URL(source).pathname;
                const filename = path.substring(path.lastIndexOf('/') + 1);
                return decodeURIComponent(filename.replace(/\.[^/.]+$/, "")) || "Online Track";
            } catch (e) {
                const shortUrl = source.length > 30 ? "..." + source.substring(source.length - 27) : source;
                return shortUrl.replace(/\.[^/.]+$/, "") || "Online Track";
            }
        } else if (type === 'local' && source instanceof File) {
            return source.name.replace(/\.[^/.]+$/, "");
        }
        // For server-provided tracks, the name comes from the JSON.
        // For local-default, the name is pre-defined.
        return "Unknown Track";
    }

    openFileBtn.addEventListener('click', () => {
        console.log("openFileBtn 点击");
        audioFileInput.click();
    });

    audioFileInput.addEventListener('change', (event) => {
        console.log("audioFileInput 'change' 事件触发");
        const files = event.target.files;
        console.log("选择的文件:", files);
        if (files.length > 0) {
            const wasEmpty = playlist.length === 0;
            const newSongStartIndex = playlist.length;
            console.log(`播放列表之前为空: ${wasEmpty}, 新歌曲起始索引: ${newSongStartIndex}`);

            Array.from(files).forEach(file => {
                const existingFileIndex = playlist.findIndex(track => track.originalFile && track.originalFile.name === file.name && track.src.startsWith('blob:'));
                if (existingFileIndex !== -1) {
                    console.log(`发现已存在的本地文件 ${file.name} 的 Object URL: ${playlist[existingFileIndex].src}，准备移除旧的并添加新的。`);
                    URL.revokeObjectURL(playlist[existingFileIndex].src);
                    playlist.splice(existingFileIndex, 1);
                }

                const trackSrc = URL.createObjectURL(file);
                console.log(`为文件 ${file.name} 创建 Object URL: ${trackSrc}`);
                playlist.push({
                    name: getTrackName(file, 'local'),
                    src: trackSrc,
                    type: 'local',
                    originalFile: file
                });
            });
            console.log("新歌曲已添加到播放列表:", playlist);

            renderPlaylist();
            if (wasEmpty && playlist.length > 0) {
                currentTrackIndex = 0;
                console.log("播放列表曾为空, 准备加载索引为 0 的音轨");
                loadTrack(currentTrackIndex);
            } else if (!isPlaying && currentTrackIndex === -1 && newSongStartIndex < playlist.length) {
                 currentTrackIndex = newSongStartIndex;
                 console.log("播放器未播放且无当前音轨, 准备加载新添加的第一个音轨, 索引:", currentTrackIndex);
                 loadTrack(currentTrackIndex);
            }
        }
        audioFileInput.value = null;
    });

    openUrlBtn.addEventListener('click', () => {
        console.log("openUrlBtn 点击");
        const audioUrl = prompt("请输入在线音频链接 (例如: https://example.com/audio.mp3):");
        if (audioUrl && audioUrl.trim() !== "") {
            const trimmedUrl = audioUrl.trim();
            console.log("输入的 URL:", trimmedUrl);
            const newSong = {
                name: getTrackName(trimmedUrl, 'url'),
                src: trimmedUrl,
                type: 'url'
            };

            const wasEmpty = playlist.length === 0;
            playlist.push(newSong);
            console.log("在线歌曲已添加到播放列表:", newSong);
            renderPlaylist();

            currentTrackIndex = playlist.length - 1;
            console.log("准备加载在线歌曲, 索引:", currentTrackIndex);
            loadTrack(currentTrackIndex);
            if (isPlaying || wasEmpty) {
                console.log("尝试自动播放在线歌曲");
                audioPlayer.play().catch(handlePlayError);
            }
        } else {
            console.log("未输入有效 URL");
        }
    });

    playPauseBtn.addEventListener('click', () => {
        console.log(`playPauseBtn 点击。当前音轨索引: ${currentTrackIndex}, 是否正在播放: ${isPlaying}, audio.src: ${audioPlayer.src || '无'}`);
        if (currentTrackIndex === -1 && playlist.length > 0) {
            console.log("无已加载音轨但播放列表有内容。准备加载索引为 0 的音轨并尝试播放。");
            currentTrackIndex = 0;
            loadTrack(currentTrackIndex);
             audioPlayer.play().catch(handlePlayError);
        } else if (audioPlayer.src && audioPlayer.readyState >= 2 && !audioPlayer.error) {
            console.log("Audio src 存在且状态可播放, 调用 togglePlayPause");
            togglePlayPause();
        } else if (playlist.length > 0 && currentTrackIndex !== -1 && (!audioPlayer.src || audioPlayer.error)) {
             console.log("Audio src 无效或有错误, 但播放列表和索引有效。重新加载当前音轨并尝试播放。");
            loadTrack(currentTrackIndex);
            audioPlayer.play().catch(handlePlayError);
        } else if (playlist.length === 0) {
            alert("播放列表为空。请先通过“打开文件”添加本地音乐，或等待服务器列表加载。");
            console.log("播放列表为空，提示用户选择文件。");
        } else {
            console.warn("playPauseBtn 点击，但条件不明确，未执行操作。readyState:", audioPlayer.readyState, "error:", audioPlayer.error);
            if (!audioPlayer.src) {
                alert("请先选择一首歌曲或当前歌曲加载失败。");
            }
        }
    });

    function togglePlayPause() {
        console.log(`togglePlayPause 调用。是否正在播放: ${isPlaying}`);
        if (isPlaying) {
            console.log("暂停音频");
            audioPlayer.pause();
        } else {
            if (!audioPlayer.src && currentTrackIndex !== -1 && playlist[currentTrackIndex]) {
                console.log("togglePlayPause: src为空但有选中曲目，尝试重新加载。");
                loadTrack(currentTrackIndex);
            }
            console.log("尝试播放音频");
            const playPromise = audioPlayer.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    console.log("audioPlayer.play() Promise resolved (播放开始或已在播放).");
                }).catch(handlePlayError);
            } else {
                console.warn("audioPlayer.play() 未返回 Promise (可能浏览器不支持或状态不对).");
            }
        }
    }

    stopBtn.addEventListener('click', () => {
        console.log("stopBtn 点击");
        if (audioPlayer.src) {
            audioPlayer.pause();
            audioPlayer.currentTime = 0;
            console.log("音频已停止并重置时间");
        }
    });

    prevBtn.addEventListener('click', () => {
        console.log("prevBtn 点击");
        if (playlist.length > 0) {
            if (playMode === 2 && playlist.length > 1) { // Random
                 let prevRandomIndex;
                 do {
                     prevRandomIndex = Math.floor(Math.random() * playlist.length);
                 } while (prevRandomIndex === currentTrackIndex && playlist.length > 1);
                 currentTrackIndex = prevRandomIndex;
            } else {
                currentTrackIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
            }
            console.log(`上一曲，新索引: ${currentTrackIndex}`);
            loadTrack(currentTrackIndex);
            if (isPlaying) audioPlayer.play().catch(handlePlayError);
        } else {
            console.log("播放列表为空，无法执行上一曲");
        }
    });

    nextBtn.addEventListener('click', () => {
        console.log("nextBtn 点击");
        playNextTrack(true);
    });


    volumeSlider.addEventListener('input', (event) => {
        audioPlayer.volume = event.target.value;
    });

    progressBar.addEventListener('input', (event) => {
        if (audioPlayer.src && audioPlayer.duration) {
            const seekTime = (event.target.value / 100) * audioPlayer.duration;
            audioPlayer.currentTime = seekTime;
        }
    });

    playlistToggleBtn.addEventListener('click', () => {
        console.log("playlistToggleBtn 点击");
        playlistContainer.style.display = playlistContainer.style.display === 'none' ? 'block' : 'none';
        console.log("播放列表显示状态:", playlistContainer.style.display);
    });

    playModeBtn.addEventListener('click', () => {
        playMode = (playMode + 1) % playModeIcons.length;
        playModeBtn.textContent = playModeIcons[playMode];
        console.log("播放模式切换至:", playMode, playModeIcons[playMode]);
    });

    audioPlayer.addEventListener('loadstart', () => {
        console.log("Audio 事件: loadstart - 浏览器开始加载媒体资源。src:", audioPlayer.currentSrc);
        playStatusDisplay.textContent = "状态: 加载中...";
    });

    audioPlayer.addEventListener('loadedmetadata', () => {
        console.log(`Audio 事件: loadedmetadata - 元数据加载完成。时长: ${audioPlayer.duration}`);
        totalTimeDisplay.textContent = formatTime(audioPlayer.duration);
        progressBar.value = 0;
        if (currentTrackIndex !== -1 && playlist[currentTrackIndex]) {
            trackInfoDisplay.textContent = `${currentTrackIndex + 1}. ${playlist[currentTrackIndex].name}`;
        }
    });

    audioPlayer.addEventListener('loadeddata', () => {
        console.log("Audio 事件: loadeddata - 当前帧数据已加载。readyState:", audioPlayer.readyState);
    });

    audioPlayer.addEventListener('canplay', () => {
        console.log("Audio 事件: canplay - 浏览器可以播放媒体，但可能需要缓冲。readyState:", audioPlayer.readyState);
        playStatusDisplay.textContent = "状态: 准备就绪";
    });

    audioPlayer.addEventListener('canplaythrough', () => {
        console.log("Audio 事件: canplaythrough - 浏览器估计可以不间断播放完毕。readyState:", audioPlayer.readyState);
        playStatusDisplay.textContent = "状态: 可以流畅播放";
    });

    audioPlayer.addEventListener('play', () => {
        console.log("Audio 事件: play");
        isPlaying = true;
        playPauseBtn.textContent = '❚❚';
        playStatusDisplay.textContent = "状态: 播放";
    });

    audioPlayer.addEventListener('pause', () => {
        console.log(`Audio 事件: pause。是否播放完毕: ${audioPlayer.ended}`);
        isPlaying = false;
        playPauseBtn.textContent = '►';
        if (!audioPlayer.ended) {
            playStatusDisplay.textContent = "状态: 暂停";
        }
    });

    audioPlayer.addEventListener('ended', () => {
        console.log("Audio 事件: ended - 播放完毕");
        playStatusDisplay.textContent = "状态: 播放完毕";
        playNextTrack(false);
    });

    audioPlayer.addEventListener('timeupdate', () => {
        if (audioPlayer.duration) {
            currentTimeDisplay.textContent = formatTime(audioPlayer.currentTime);
            progressBar.value = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        } else {
            currentTimeDisplay.textContent = "00:00";
            progressBar.value = 0;
        }
    });

    audioPlayer.addEventListener('error', (e) => {
        console.error("Audio 事件: error. 错误对象:", audioPlayer.error);
        let errorMessage = "错误: 无法加载或播放音频";
        if (audioPlayer.error) {
            switch (audioPlayer.error.code) {
                case MediaError.MEDIA_ERR_ABORTED: errorMessage = '错误: 播放被中止'; break;
                case MediaError.MEDIA_ERR_NETWORK: errorMessage = '错误: 网络问题 (检查CORS或链接)'; break;
                case MediaError.MEDIA_ERR_DECODE: errorMessage = '错误: 解码失败 (文件可能损坏或格式不受支持)'; break;
                case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED: errorMessage = '错误: 格式不支持或URL无效 (检查CORS或文件类型)'; break;
                default: errorMessage = `未知音频错误 (代码: ${audioPlayer.error.code})`; break;
            }
            console.error(`详细错误信息: ${errorMessage}`);
        }
        trackInfoDisplay.textContent = errorMessage;
        playStatusDisplay.textContent = "状态: 错误";
        playPauseBtn.textContent = '►';
        isPlaying = false;
    });

    audioPlayer.addEventListener('emptied', () => {
        console.log("Audio 事件: emptied - src 设置为空或网络错误导致媒体被清空。");
        if (!audioPlayer.currentSrc) {
            trackInfoDisplay.textContent = currentTrackIndex !== -1 && playlist[currentTrackIndex] ? `${currentTrackIndex + 1}. ${playlist[currentTrackIndex].name}` : "请选择音频文件";
            playStatusDisplay.textContent = "状态: 空闲";
            currentTimeDisplay.textContent = "00:00";
            totalTimeDisplay.textContent = "00:00";
            progressBar.value = 0;
        }
    });

    audioPlayer.addEventListener('stalled', () => {
        console.warn("Audio 事件: stalled - 浏览器尝试获取媒体数据，但数据未能如期到达。");
    });

    audioPlayer.addEventListener('waiting', () => {
        console.log("Audio 事件: waiting - 因缓冲下一帧而暂停播放。");
        playStatusDisplay.textContent = "状态: 缓冲中...";
    });

    audioPlayer.addEventListener('playing', () => {
        console.log("Audio 事件: playing - 缓冲结束后实际开始播放。");
        playStatusDisplay.textContent = "状态: 播放";
    });


    function handlePlayError(error) {
        console.error("播放操作错误 (play() .catch):", error);
        let userMessage = "无法播放音频";
        if (error.name === 'NotAllowedError') {
            userMessage = "浏览器阻止了自动播放。请点击播放按钮。";
            console.error("详细错误: NotAllowedError - 用户未与页面交互或权限不足。");
        } else if (error.name === 'NotSupportedError') {
            userMessage = "音频格式不支持或URL无效/CORS限制。";
            console.error("详细错误: NotSupportedError - 格式或源不支持。");
        } else if (audioPlayer.error) {
             switch (audioPlayer.error.code) {
                case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED: userMessage = '错误: 格式不支持或URL无效 (检查CORS)'; break;
                case MediaError.MEDIA_ERR_NETWORK: userMessage = '错误: 网络问题 (检查CORS)'; break;
                case MediaError.MEDIA_ERR_DECODE: userMessage = '错误: 解码失败'; break;
                 default: userMessage = `音频错误 (代码: ${audioPlayer.error.code})`; break;
            }
        } else {
            userMessage = `播放失败: ${error.message || error.name || '未知错误'}`;
        }

        trackInfoDisplay.textContent = userMessage;
        playStatusDisplay.textContent = "状态: 错误";
        playPauseBtn.textContent = '►';
        isPlaying = false;
    }

    function playNextTrack(manualNext) {
        console.log(`playNextTrack 调用。是否手动: ${manualNext}, 当前播放模式: ${playMode}`);
        if (playlist.length === 0) {
            console.log("播放列表为空，无法播放下一曲。");
            return;
        }

        if (playMode === 1 && !manualNext && currentTrackIndex !== -1) {
            console.log("单曲循环模式，重新加载当前音轨。");
            loadTrack(currentTrackIndex);
            audioPlayer.play().catch(handlePlayError);
            return;
        }

        if (playMode === 2 && playlist.length > 1) {
            let nextRandomIndex;
            do {
                nextRandomIndex = Math.floor(Math.random() * playlist.length);
            } while (nextRandomIndex === currentTrackIndex && playlist.length > 1);
            currentTrackIndex = nextRandomIndex;
            console.log(`随机模式，下一曲索引: ${currentTrackIndex}`);
        } else {
            currentTrackIndex = (currentTrackIndex + 1) % playlist.length;
            console.log(`顺序/列表循环模式，下一曲索引: ${currentTrackIndex}`);
        }
        loadTrack(currentTrackIndex);
        if (isPlaying || !manualNext) {
            console.log("尝试播放在 playNextTrack 中加载的音轨。");
            audioPlayer.play().catch(handlePlayError);
        }
    }

    function loadTrack(index) {
        console.log(`loadTrack 调用，目标索引: ${index}`);
        if (index >= 0 && index < playlist.length) {
            currentTrackIndex = index;
            const track = playlist[index];
            console.log("准备加载音轨详情:", track);

            trackInfoDisplay.textContent = `${index + 1}. ${track.name}`;
            currentTimeDisplay.textContent = "00:00";
            totalTimeDisplay.textContent = "00:00";
            progressBar.value = 0;

            if (audioPlayer.currentSrc && audioPlayer.currentSrc.startsWith('blob:')) {
                if (audioPlayer.currentSrc !== track.src || (track.src && !track.src.startsWith('blob:'))) {
                    URL.revokeObjectURL(audioPlayer.currentSrc);
                    console.log("Revoked previous Object URL:", audioPlayer.currentSrc);
                }
            }

            audioPlayer.src = track.src;
            console.log(`audioPlayer.src 已设置为: ${track.src}`);
            audioPlayer.load();
            console.log("已调用 audioPlayer.load()");
            updatePlaylistUI();
        } else {
            console.warn(`loadTrack 索引无效: ${index}。播放列表长度: ${playlist.length}`);
            currentTrackIndex = -1;
            trackInfoDisplay.textContent = playlist.length > 0 ? "播放列表索引无效" : "播放列表为空";
            playStatusDisplay.textContent = "状态: 空闲";
            currentTimeDisplay.textContent = "00:00";
            totalTimeDisplay.textContent = "00:00";
            progressBar.value = 0;
            if (audioPlayer.src) {
                audioPlayer.pause();
                if (audioPlayer.currentSrc && audioPlayer.currentSrc.startsWith('blob:')) {
                    URL.revokeObjectURL(audioPlayer.currentSrc);
                    console.log("Revoked Object URL on invalid index:", audioPlayer.currentSrc);
                }
                audioPlayer.removeAttribute('src');
                audioPlayer.load();
                console.log("已移除 audioPlayer.src 并调用 load()");
            }
            updatePlaylistUI();
        }
    }

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    function renderPlaylist() {
        console.log("renderPlaylist 调用");
        playlistElement.innerHTML = '';
        playlist.forEach((song, index) => {
            const li = document.createElement('li');
            li.textContent = `${index + 1}. ${song.name}`;
            li.dataset.index = index;
            if (index === currentTrackIndex) {
                li.classList.add('playing');
            }
            li.addEventListener('click', () => {
                console.log(`播放列表项点击，索引: ${index}`);
                const prevPlayingState = isPlaying;
                loadTrack(index);
                if (prevPlayingState) {
                    audioPlayer.play().catch(handlePlayError);
                }
            });
            playlistElement.appendChild(li);
        });
    }

    function updatePlaylistUI() {
        const items = playlistElement.querySelectorAll('li');
        items.forEach(item => {
            if (parseInt(item.dataset.index) === currentTrackIndex && currentTrackIndex !== -1) {
                item.classList.add('playing');
            } else {
                item.classList.remove('playing');
            }
        });
    }

    async function fetchServerPlaylist() {
        try {
            // 确保 music-list.json 文件与 index.html 在同一级目录，或者修改这里的路径
            const response = await fetch('music-list.json'); 
            if (!response.ok) {
                // 如果文件不存在或服务器返回错误，则抛出错误
                throw new Error(`HTTP error! status: ${response.status}, failed to fetch music-list.json`);
            }
            const serverSongs = await response.json();
            
            // 清空当前播放列表，确保只加载服务器列表（如果需要合并，则不执行此行）
            playlist = []; 

            if (Array.isArray(serverSongs) && serverSongs.length > 0) {
                serverSongs.forEach(song => {
                    if (song.name && song.path) {
                        playlist.push({
                            name: song.name,
                            src: song.path, // path 是相对于 index.html 的路径
                            type: 'server'  // 标记为服务器歌曲
                        });
                    } else {
                        console.warn("music-list.json 中的歌曲条目格式不正确:", song);
                    }
                });
                console.log("从服务器加载的播放列表:", playlist);
                return true; // 表示成功加载并处理了服务器列表
            } else {
                console.log("music-list.json 为空或不是有效的数组。");
                return false;
            }
        } catch (error) {
            console.error("无法获取或解析 music-list.json:", error);
            return false; // 表示加载服务器列表失败
        }
    }

    async function initializePlayer() {
        console.log("播放器初始化...");
        volumeSlider.value = audioPlayer.volume;
        playModeBtn.textContent = playModeIcons[playMode];

        const serverListLoadedSuccessfully = await fetchServerPlaylist();

        if (serverListLoadedSuccessfully && playlist.length > 0) {
            currentTrackIndex = 0;
            console.log("服务器列表已加载, 准备加载索引为 0 的音轨");
            loadTrack(currentTrackIndex);
        } else {
            // 如果服务器列表加载失败或为空，可以决定是否加载一个硬编码的本地默认歌曲作为后备
            console.log("服务器播放列表为空或加载失败。");
            // 之前的代码中有一个默认本地歌曲的逻辑，您可以选择是否保留它作为后备：
            // const defaultSong = { name: "Forever Love - 王力宏 (默认)", src: "Forever Love - 王力宏.mp3", type: 'local-default'};
            // if (playlist.length === 0) { playlist.unshift(defaultSong); currentTrackIndex = 0; loadTrack(currentTrackIndex); }
            // 当前版本，如果json加载失败或为空，则播放列表也为空
             if (playlist.length === 0) { // 确保即使fetchServerPlaylist内部清空了playlist，这里也正确处理
                trackInfoDisplay.textContent = "播放列表为空。请检查 music-list.json。";
             }
        }
        
        renderPlaylist(); // 确保在所有初始化逻辑后渲染播放列表

        if (playlist.length === 0 && !serverListLoadedSuccessfully) {
            trackInfoDisplay.textContent = "无法加载音乐列表。请检查 music-list.json 文件。";
            console.log("初始化完成，但播放列表为空，且服务器列表加载失败。");
        } else if (playlist.length === 0 && serverListLoadedSuccessfully) {
             trackInfoDisplay.textContent = "music-list.json 为空，无歌曲加载。";
             console.log("初始化完成，music-list.json 为空。");
        }
        console.log("播放器初始化完成。");
    }

    initializePlayer();
});
