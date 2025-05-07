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
    let playMode = 0;
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
        // For local-default, the name is pre-defined, so this function isn't strictly needed for it.
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
                // Revoke previous object URL if it's for the same file name to prevent memory leaks
                // This is a basic approach; more robust would involve checking the actual File object if persisted
                const existingFileIndex = playlist.findIndex(track => track.originalFile && track.originalFile.name === file.name && track.src.startsWith('blob:'));
                if (existingFileIndex !== -1) {
                    console.log(`发现已存在的本地文件 ${file.name} 的 Object URL: ${playlist[existingFileIndex].src}，准备移除旧的并添加新的。`);
                    URL.revokeObjectURL(playlist[existingFileIndex].src);
                    playlist.splice(existingFileIndex, 1); // Remove old entry
                }

                const trackSrc = URL.createObjectURL(file);
                console.log(`为文件 ${file.name} 创建 Object URL: ${trackSrc}`);
                playlist.push({
                    name: getTrackName(file, 'local'),
                    src: trackSrc,
                    type: 'local',
                    originalFile: file // Store the original File object
                });
            });
            console.log("新歌曲已添加到播放列表:", playlist);

            renderPlaylist();
            if (wasEmpty) {
                currentTrackIndex = 0;
                console.log("播放列表曾为空, 准备加载索引为 0 的音轨");
                loadTrack(currentTrackIndex);
            } else if (!isPlaying && currentTrackIndex === -1) { // If playlist had items but none were loaded
                 currentTrackIndex = newSongStartIndex; // Point to the first of the newly added songs
                 console.log("播放器未播放且无当前音轨, 准备加载新添加的第一个音轨, 索引:", currentTrackIndex);
                 loadTrack(currentTrackIndex);
            }
        }
        audioFileInput.value = null; // Allow re-selection of the same file
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

            currentTrackIndex = playlist.length - 1; // Load the newly added URL track
            console.log("准备加载在线歌曲, 索引:", currentTrackIndex);
            loadTrack(currentTrackIndex);
            if (isPlaying || wasEmpty) { // Auto-play if already playing or if it's the first track ever
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
             audioPlayer.play().catch(handlePlayError); // Attempt to play after loading
        } else if (audioPlayer.src && audioPlayer.readyState >= 2 && !audioPlayer.error) { // readyState >= 2 (HAVE_CURRENT_DATA) or more
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
            console.warn("playPauseBtn 点击，但条件不明确，未执行操作。readyState:", audioPlayer.readyState, "error:", audioPlayer.error);
            if (!audioPlayer.src) {
                // This case might be hit if currentTrackIndex is valid but loadTrack failed silently or src is bad
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
            // Ensure there's something to play
            if (!audioPlayer.src && currentTrackIndex !== -1 && playlist[currentTrackIndex]) {
                console.log("togglePlayPause: src为空但有选中曲目，尝试重新加载。");
                loadTrack(currentTrackIndex); // Reload if src is missing
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
                 } while (prevRandomIndex === currentTrackIndex && playlist.length > 1); // Ensure different track if possible
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
        playNextTrack(true); // true indicates user manually clicked next
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

    // --- Audio Element Events ---
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
        if (!audioPlayer.ended) { // Only set to "Paused" if not ended
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
        } else { // Reset if duration is not available (e.g., after error or src cleared)
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
        playPauseBtn.textContent = '►'; // Reset play button
        isPlaying = false;
    });

    audioPlayer.addEventListener('emptied', () => {
        console.log("Audio 事件: emptied - src 设置为空或网络错误导致媒体被清空。");
        // Reset UI elements if src is gone
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

    audioPlayer.addEventListener('playing', () => { // Fired when playback actually begins after buffering
        console.log("Audio 事件: playing - 缓冲结束后实际开始播放。");
        playStatusDisplay.textContent = "状态: 播放"; // Ensure status is "Playing"
    });


    // --- Core Functions ---
    function handlePlayError(error) {
        console.error("播放操作错误 (play() .catch):", error);
        let userMessage = "无法播放音频";
        // Prioritize error name for more specific messages
        if (error.name === 'NotAllowedError') {
            userMessage = "浏览器阻止了自动播放。请点击播放按钮。";
            console.error("详细错误: NotAllowedError - 用户未与页面交互或权限不足。");
        } else if (error.name === 'NotSupportedError') {
            userMessage = "音频格式不支持或URL无效/CORS限制。";
            console.error("详细错误: NotSupportedError - 格式或源不支持。");
        } else if (audioPlayer.error) { // Fallback to audio element's error if name is not specific enough
             switch (audioPlayer.error.code) {
                case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED: userMessage = '错误: 格式不支持或URL无效 (检查CORS)'; break;
                case MediaError.MEDIA_ERR_NETWORK: userMessage = '错误: 网络问题 (检查CORS)'; break;
                case MediaError.MEDIA_ERR_DECODE: userMessage = '错误: 解码失败'; break;
                 default: userMessage = `音频错误 (代码: ${audioPlayer.error.code})`; break;
            }
        } else { // Generic error if no other info
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

        if (playMode === 1 && !manualNext && currentTrackIndex !== -1) { // Single loop and track ended automatically
            console.log("单曲循环模式，重新加载当前音轨。");
            loadTrack(currentTrackIndex); // Reload current track
            audioPlayer.play().catch(handlePlayError);
            return;
        }

        if (playMode === 2 && playlist.length > 1) { // Random
            let nextRandomIndex;
            do {
                nextRandomIndex = Math.floor(Math.random() * playlist.length);
            } while (nextRandomIndex === currentTrackIndex && playlist.length > 1); // Ensure different track if possible
            currentTrackIndex = nextRandomIndex;
            console.log(`随机模式，下一曲索引: ${currentTrackIndex}`);
        } else { // Normal (list loop) or manual next for single loop/random
            currentTrackIndex = (currentTrackIndex + 1) % playlist.length;
            console.log(`顺序/列表循环模式，下一曲索引: ${currentTrackIndex}`);
        }
        loadTrack(currentTrackIndex);
        // Play if it was playing before, or if it was an automatic next (track ended)
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
            // Reset times and progress bar before loading new track metadata
            currentTimeDisplay.textContent = "00:00";
            totalTimeDisplay.textContent = "00:00";
            progressBar.value = 0;

            // Revoke old object URL if:
            // 1. audioPlayer.currentSrc exists and is a blob URL
            // 2. The new track's src is different OR the new track is not a blob URL (e.g. default song path, online URL)
            // This prevents revoking the same blob URL if simply reloading the current blob track.
            if (audioPlayer.currentSrc && audioPlayer.currentSrc.startsWith('blob:')) {
                if (audioPlayer.currentSrc !== track.src || !track.src.startsWith('blob:')) {
                    URL.revokeObjectURL(audioPlayer.currentSrc);
                    console.log("Revoked previous Object URL:", audioPlayer.currentSrc);
                }
            }

            audioPlayer.src = track.src; // This can be a blob URL, a relative file path, or an http(s) URL
            console.log(`audioPlayer.src 已设置为: ${track.src}`);
            audioPlayer.load(); // Crucial: apply the new src and reset the media element's state
            console.log("已调用 audioPlayer.load()");
            updatePlaylistUI();
        } else {
            console.warn(`loadTrack 索引无效: ${index}。播放列表长度: ${playlist.length}`);
            currentTrackIndex = -1; // Invalidate index
            trackInfoDisplay.textContent = "播放列表为空或索引无效";
            playStatusDisplay.textContent = "状态: 空闲";
            currentTimeDisplay.textContent = "00:00";
            totalTimeDisplay.textContent = "00:00";
            progressBar.value = 0;
            if (audioPlayer.src) { // If there was a src, clear it
                audioPlayer.pause();
                if (audioPlayer.currentSrc && audioPlayer.currentSrc.startsWith('blob:')) {
                    URL.revokeObjectURL(audioPlayer.currentSrc); // Clean up blob if one was loaded
                    console.log("Revoked Object URL on invalid index:", audioPlayer.currentSrc);
                }
                audioPlayer.removeAttribute('src'); // Completely remove src
                audioPlayer.load(); // Reload to reflect no src and reset state
                console.log("已移除 audioPlayer.src 并调用 load()");
            }
            updatePlaylistUI(); // Ensure playlist UI reflects no selection
        }
    }

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    function renderPlaylist() {
        console.log("renderPlaylist 调用");
        playlistElement.innerHTML = ''; // Clear existing items
        playlist.forEach((song, index) => {
            const li = document.createElement('li');
            li.textContent = `${index + 1}. ${song.name}`;
            li.dataset.index = index; // Store index for click handling
            if (index === currentTrackIndex) {
                li.classList.add('playing');
            }
            li.addEventListener('click', () => {
                console.log(`播放列表项点击，索引: ${index}`);
                const prevPlayingState = isPlaying; // Preserve current playing state
                loadTrack(index);
                if (prevPlayingState) { // If it was playing, attempt to play new track
                    audioPlayer.play().catch(handlePlayError);
                }
            });
            playlistElement.appendChild(li);
        });
    }

    function updatePlaylistUI() {
        // console.log("updatePlaylistUI 调用"); // Can be frequent, log if needed for debugging
        const items = playlistElement.querySelectorAll('li');
        items.forEach(item => {
            // Check if this item corresponds to the currently loaded track
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
            src: "Forever Love - 王力宏.mp3", // Ensure this file is in the same folder as index.html
            type: 'local-default'
        };

        // Only add default song if playlist is truly empty (e.g. first load)
        if (playlist.length === 0) {
            playlist.unshift(defaultSong);
            currentTrackIndex = 0;
            console.log("已添加默认歌曲到播放列表:", defaultSong);
            renderPlaylist();
            console.log("初始化：加载默认歌曲，索引 0");
            loadTrack(currentTrackIndex);

            // Optional: Attempt to autoplay default song (often blocked by browsers)
            /*
            console.log("尝试自动播放默认歌曲...");
            const playPromise = audioPlayer.play();
            if (playPromise !== undefined) {
                playPromise.then(_ => {
                    console.log("默认歌曲自动播放成功 (或已在播放).");
                }).catch(error => {
                    console.warn("默认歌曲自动播放失败 (常见情况，通常需要用户交互):", error.name);
                    if (error.name === 'NotAllowedError') {
                        playStatusDisplay.textContent = "状态: 点击播放";
                    }
                    // handlePlayError(error); // Optionally call full error handler
                });
            }
            */
        } else if (currentTrackIndex === -1 && playlist.length > 0) {
            // If playlist was populated by other means but no track selected
            currentTrackIndex = 0;
            loadTrack(currentTrackIndex);
        } else if (currentTrackIndex !== -1) {
            // If a track was already selected (e.g. page refresh with persisted state)
            loadTrack(currentTrackIndex); // Reload current track details and src
        } else {
            trackInfoDisplay.textContent = "请选择音频文件或输入链接";
            console.log("初始化时播放列表为空且未添加默认歌曲 (此情况不应发生如果默认歌曲逻辑正确)");
        }
        console.log("播放器初始化完成。");
    }

    initializePlayer(); // Call initialization function
});