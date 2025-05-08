// script.js (基于用户上传的旧版UI script.js 进行修改)
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
    const playModeIcons = ['🔁', '🔂', '🔀']; // 对应图标

    console.log("播放器变量初始化完毕");

    function getTrackNameFromFile(file) { // 用于从File对象获取名称
        if (file instanceof File) {
            return file.name.replace(/\.[^/.]+$/, ""); // 移除扩展名
        }
        return "Unknown Track";
    }

    function getTrackNameFromUrl(url) { // 用于从URL获取名称
        try {
            const path = new URL(url).pathname;
            const filename = path.substring(path.lastIndexOf('/') + 1);
            return decodeURIComponent(filename.replace(/\.[^/.]+$/, "")) || "Online Track";
        } catch (e) {
            const shortUrl = url.length > 30 ? "..." + url.substring(url.length - 27) : url;
            return shortUrl.replace(/\.[^/.]+$/, "") || "Online Track";
        }
    }


    openFileBtn.addEventListener('click', () => {
        console.log("openFileBtn 点击 (将触发文件夹/文件选择)");
        // HTML input 的 accept 属性理论上会帮助筛选，但JS层面仍需检查
        audioFileInput.click();
    });

    audioFileInput.addEventListener('change', (event) => {
        console.log("audioFileInput 'change' 事件触发 (可能选择了文件夹或文件)");
        const files = event.target.files;
        console.log("选择的文件/文件夹中的文件数量:", files.length);

        if (files.length > 0) {
            const wasPlaylistEmpty = playlist.length === 0;
            const newSongStartIndex = playlist.length; // 记录添加前播放列表的长度
            let addedSongsCount = 0;

            Array.from(files).forEach(file => {
                // 筛选 MP3 文件
                if (file.type === 'audio/mpeg' || file.name.toLowerCase().endsWith('.mp3')) {
                    // 基础的重复文件检查 (基于文件名和大小)
                    const isDuplicate = playlist.some(track =>
                        track.type === 'local' &&
                        track.originalFile &&
                        track.originalFile.name === file.name &&
                        track.originalFile.size === file.size
                    );

                    if (!isDuplicate) {
                        const trackSrc = URL.createObjectURL(file);
                        console.log(`为音频文件 ${file.name} 创建 Object URL: ${trackSrc}`);
                        playlist.push({
                            name: getTrackNameFromFile(file),
                            src: trackSrc,
                            type: 'local',
                            originalFile: file // 保存原始 File 对象
                        });
                        addedSongsCount++;
                    } else {
                        console.log(`跳过重复的本地文件: ${file.name}`);
                    }
                } else {
                    console.log(`跳过非 MP3 文件: ${file.name} (类型: ${file.type})`);
                }
            });

            if (addedSongsCount > 0) {
                console.log(`${addedSongsCount} 首新歌曲已添加到播放列表。`);
                renderPlaylist();
                if (wasPlaylistEmpty || currentTrackIndex === -1) { // 如果列表原本为空，或之前没有选中任何歌曲
                    currentTrackIndex = newSongStartIndex; // 指向新添加歌曲的第一个
                     if(playlist.length > 0 && currentTrackIndex >= playlist.length) currentTrackIndex = 0; // 安全检查
                    console.log("播放列表曾为空或无选中曲目, 准备加载新添加的歌曲，起始索引:", currentTrackIndex);
                    if (currentTrackIndex !== -1) loadTrack(currentTrackIndex);
                }
            } else {
                console.log("选择的文件夹中没有找到新的 MP3 文件或均为重复。");
            }
        }
        audioFileInput.value = null; // 允许用户重新选择相同的文件夹/文件
    });

    openUrlBtn.addEventListener('click', () => {
        console.log("openUrlBtn 点击");
        const audioUrl = prompt("请输入在线音频链接 (例如: https://example.com/audio.mp3):");
        if (audioUrl && audioUrl.trim() !== "") {
            const trimmedUrl = audioUrl.trim();
            console.log("输入的 URL:", trimmedUrl);
            const newSong = {
                name: getTrackNameFromUrl(trimmedUrl), // 使用新的辅助函数
                src: trimmedUrl,
                type: 'url'
            };

            const wasPlaylistEmpty = playlist.length === 0;
            playlist.push(newSong);
            console.log("在线歌曲已添加到播放列表:", newSong);
            renderPlaylist();

            currentTrackIndex = playlist.length - 1;
            console.log("准备加载在线歌曲, 索引:", currentTrackIndex);
            loadTrack(currentTrackIndex);
            if (isPlaying || wasPlaylistEmpty) {
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
            alert("请先打开一个音频文件或输入链接。");
            console.log("播放列表为空，提示用户选择文件。");
        } else {
            console.warn("playPauseBtn 点击，但条件不明确。readyState:", audioPlayer.readyState, "error:", audioPlayer.error);
            if (!audioPlayer.src && currentTrackIndex !== -1) { // 尝试重新加载
                loadTrack(currentTrackIndex);
                audioPlayer.play().catch(handlePlayError);
            } else if (!audioPlayer.src) {
                 alert("请先选择一首歌曲。");
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
                    console.log("audioPlayer.play() Promise resolved.");
                }).catch(handlePlayError);
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
            if (playMode === 2 && playlist.length > 1) { // Random mode
                let prevRandomIndex;
                do {
                    prevRandomIndex = Math.floor(Math.random() * playlist.length);
                } while (prevRandomIndex === currentTrackIndex && playlist.length > 1);
                currentTrackIndex = prevRandomIndex;
            } else { // Sequential or single song
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
        playNextTrack(true); // true indicates user manually clicked next
    });

    volumeSlider.addEventListener('input', (event) => {
        audioPlayer.volume = parseFloat(event.target.value);
    });

    progressBar.addEventListener('input', (event) => {
        if (audioPlayer.src && audioPlayer.duration) {
            const seekTime = (parseFloat(event.target.value) / 100) * audioPlayer.duration;
            audioPlayer.currentTime = seekTime;
        }
    });

    playlistToggleBtn.addEventListener('click', () => {
        console.log("playlistToggleBtn 点击");
        playlistContainer.style.display = playlistContainer.style.display === 'none' ? 'block' : 'none';
        console.log("播放列表显示状态:", playlistContainer.style.display);
    });

    playModeBtn.addEventListener('click', () => {
        playMode = (playMode + 1) % playModeIcons.length; // Cycle through 0, 1, 2
        playModeBtn.textContent = playModeIcons[playMode];
        console.log("播放模式切换至:", playMode, playModeIcons[playMode]);
    });

    audioPlayer.addEventListener('loadstart', () => {
        console.log("Audio 事件: loadstart. src:", audioPlayer.currentSrc);
        playStatusDisplay.textContent = "状态: 加载中...";
    });

    audioPlayer.addEventListener('loadedmetadata', () => {
        console.log(`Audio 事件: loadedmetadata. 时长: ${audioPlayer.duration}`);
        totalTimeDisplay.textContent = formatTime(audioPlayer.duration);
        if (currentTrackIndex !== -1 && playlist[currentTrackIndex]) { // 确保歌曲信息更新
            trackInfoDisplay.textContent = `${currentTrackIndex + 1}. ${playlist[currentTrackIndex].name}`;
        }
    });
    
    audioPlayer.addEventListener('canplay', () => {
        console.log("Audio 事件: canplay. readyState:", audioPlayer.readyState);
        playStatusDisplay.textContent = "状态: 准备就绪";
    });

    audioPlayer.addEventListener('play', () => {
        console.log("Audio 事件: play");
        isPlaying = true;
        playPauseBtn.textContent = '❚❚';
        playStatusDisplay.textContent = "状态: 播放";
        updatePlaylistUI(); // Update highlight when play starts
    });

    audioPlayer.addEventListener('pause', () => {
        console.log(`Audio 事件: pause. 是否播放完毕: ${audioPlayer.ended}`);
        isPlaying = false;
        playPauseBtn.textContent = '►';
        if (!audioPlayer.ended) {
            playStatusDisplay.textContent = "状态: 暂停";
        }
    });

    audioPlayer.addEventListener('ended', () => {
        console.log("Audio 事件: ended - 播放完毕");
        playStatusDisplay.textContent = "状态: 播放完毕";
        playNextTrack(false); // false indicates automatic progression
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
        // ... (之前的错误处理逻辑可以保留)
        if (audioPlayer.error) {
            switch (audioPlayer.error.code) {
                case MediaError.MEDIA_ERR_ABORTED: errorMessage = '错误: 播放被中止'; break;
                case MediaError.MEDIA_ERR_NETWORK: errorMessage = '错误: 网络问题'; break;
                case MediaError.MEDIA_ERR_DECODE: errorMessage = '错误: 解码失败'; break;
                case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED: errorMessage = '错误: 格式不支持/URL无效'; break;
                default: errorMessage = `未知音频错误 (代码: ${audioPlayer.error.code})`; break;
            }
        }
        trackInfoDisplay.textContent = errorMessage;
        playStatusDisplay.textContent = "状态: 错误";
        playPauseBtn.textContent = '►';
        isPlaying = false;
    });
    
    audioPlayer.addEventListener('emptied', () => {
        console.log("Audio 事件: emptied");
        if (!audioPlayer.currentSrc) { // Reset UI only if src is truly gone
            trackInfoDisplay.textContent = (currentTrackIndex !== -1 && playlist[currentTrackIndex]) ? `${currentTrackIndex + 1}. ${playlist[currentTrackIndex].name}` : "请选择音频文件";
            if (!playlist[currentTrackIndex]) trackInfoDisplay.textContent = "请选择音频文件";
            playStatusDisplay.textContent = "状态: 空闲";
            currentTimeDisplay.textContent = "00:00";
            totalTimeDisplay.textContent = "00:00";
            progressBar.value = 0;
        }
    });


    function handlePlayError(error) {
        console.error("播放操作错误 (play() .catch):", error);
        let userMessage = "无法播放音频";
        if (error.name === 'NotAllowedError') {
            userMessage = "浏览器阻止了自动播放。";
        } else if (error.name === 'NotSupportedError') {
            userMessage = "音频格式不支持或URL无效。";
        } else {
             userMessage = `播放失败: ${error.name || '未知错误'}`;
        }
        trackInfoDisplay.textContent = userMessage;
        playStatusDisplay.textContent = "状态: 错误";
        playPauseBtn.textContent = '►';
        isPlaying = false;
    }

    function playNextTrack(manualNext) {
        console.log(`playNextTrack 调用。手动: ${manualNext}, 模式: ${playMode}`);
        if (playlist.length === 0) return;

        let playBehaviorAfterLoad = isPlaying || !manualNext; // Play if was playing or auto-next

        if (playMode === 1 && !manualNext) { // 单曲循环 (mode 1), 且是自动结束
            console.log("单曲循环，重新播放当前曲目。");
            loadTrack(currentTrackIndex);
            audioPlayer.play().catch(handlePlayError);
            return;
        }

        if (playMode === 2) { // 随机播放 (mode 2)
            if (playlist.length > 1) {
                let nextRandomIndex;
                do {
                    nextRandomIndex = Math.floor(Math.random() * playlist.length);
                } while (nextRandomIndex === currentTrackIndex);
                currentTrackIndex = nextRandomIndex;
            } else { // 只有一首歌，就播这一首
                currentTrackIndex = 0;
            }
        } else { // 列表循环 (mode 0) 或用户手动切歌
            currentTrackIndex = (currentTrackIndex + 1) % playlist.length;
        }
        console.log(`下一曲索引: ${currentTrackIndex}`);
        loadTrack(currentTrackIndex);
        if (playBehaviorAfterLoad) {
            audioPlayer.play().catch(handlePlayError);
        }
    }

    function loadTrack(index) {
        console.log(`loadTrack 调用，索引: ${index}`);
        if (index >= 0 && index < playlist.length) {
            currentTrackIndex = index; // 更新当前播放索引
            const track = playlist[index];
            console.log("加载音轨:", track);

            // 在更改 src 之前，如果旧 src 是 blob URL，则 revoke 它
            // 避免 revoke 当前要加载的同一个 blob URL
            if (audioPlayer.currentSrc && audioPlayer.currentSrc.startsWith('blob:') && audioPlayer.currentSrc !== track.src) {
                URL.revokeObjectURL(audioPlayer.currentSrc);
                console.log("Revoked previous Object URL:", audioPlayer.currentSrc);
            }

            audioPlayer.src = track.src;
            audioPlayer.load(); // 重新加载音频
            trackInfoDisplay.textContent = `${index + 1}. ${track.name}`;
            updatePlaylistUI();
        } else {
            console.warn("loadTrack: 无效的轨道索引:", index);
            // 清理UI，但不改变 currentTrackIndex 以免破坏播放列表状态
            trackInfoDisplay.textContent = "请选择音频文件";
            playStatusDisplay.textContent = "状态: 空闲";
            currentTimeDisplay.textContent = "00:00";
            totalTimeDisplay.textContent = "00:00";
            progressBar.value = 0;
            if (audioPlayer.src) {
                audioPlayer.pause();
                if (audioPlayer.currentSrc && audioPlayer.currentSrc.startsWith('blob:')) {
                     URL.revokeObjectURL(audioPlayer.currentSrc);
                }
                audioPlayer.removeAttribute('src');
                audioPlayer.load(); // 重置播放器
            }
        }
    }

    function formatTime(seconds) {
        if (isNaN(seconds) || seconds < 0) seconds = 0;
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    function renderPlaylist() {
        console.log("renderPlaylist 调用");
        playlistElement.innerHTML = ''; // 清空现有列表
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
                if (prevPlayingState || playlist.length === 1) { // 如果之前在播放，或只有一首歌，则播放
                    audioPlayer.play().catch(handlePlayError);
                }
            });
            playlistElement.appendChild(li);
        });
        updatePlaylistUI(); // 确保高亮正确
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

    function initializePlayer() {
        console.log("播放器初始化...");
        volumeSlider.value = audioPlayer.volume;
        playModeBtn.textContent = playModeIcons[playMode];

        const defaultSong = {
            name: "Forever Love - 王力宏",
            src: "Forever Love - 王力宏.mp3", // 确保此文件与 index.html 在同一目录
            type: 'local-default' // 特定类型标记
        };

        if (playlist.length === 0) { // 仅当播放列表为空时添加默认歌曲
            // 检查默认歌曲是否已存在（例如，通过文件名）- 虽然这里列表为空，此检查用于更复杂场景
            const defaultSongExists = playlist.some(track => track.src === defaultSong.src);
            if (!defaultSongExists) {
                playlist.unshift(defaultSong);
                currentTrackIndex = 0;
                console.log("已添加默认歌曲到播放列表:", defaultSong);
            } else if (playlist.length > 0) { // 如果默认歌曲已存在（不太可能在这里发生）
                 currentTrackIndex = playlist.findIndex(track => track.src === defaultSong.src);
            }
        }
        
        renderPlaylist(); // 渲染包括默认歌曲（如果添加了）的列表

        if (currentTrackIndex !== -1) { // 如果有有效索引（例如默认歌曲）
             console.log("初始化：加载索引为 " + currentTrackIndex + " 的歌曲");
            loadTrack(currentTrackIndex); // 加载但不自动播放
        } else if (playlist.length > 0) { // 如果列表不为空但没有有效索引
            currentTrackIndex = 0;
            console.log("初始化：播放列表不为空，加载索引 0");
            loadTrack(currentTrackIndex);
        } else {
            trackInfoDisplay.textContent = "请选择音频文件或输入链接";
            console.log("初始化时播放列表为空。");
        }
        console.log("播放器初始化完成。");
    }

    initializePlayer();
});
