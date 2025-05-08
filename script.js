// script.js - 针对新UI，并支持文件夹选择
document.addEventListener('DOMContentLoaded', () => {
    console.log("现代播放器 UI 初始化 - DOMContentLoaded");

    // Audio Element
    const audioPlayer = document.getElementById('audio-player-element');

    // Playback Bar Controls & Info
    const footerPlayPauseBtn = document.getElementById('footer-play-pause-btn');
    const prevTrackBtn = document.getElementById('prev-track-btn');
    const nextTrackBtn = document.getElementById('next-track-btn');
    const footerCurrentTrackArt = document.getElementById('footer-current-track-art');
    const footerCurrentTrackTitle = document.getElementById('footer-current-track-title');
    const footerCurrentTrackArtist = document.getElementById('footer-current-track-artist');
    const footerProgressBar = document.getElementById('footer-progress-bar');
    const footerCurrentTime = document.getElementById('footer-current-time');
    const footerTotalTime = document.getElementById('footer-total-time');
    const footerVolumeSlider = document.getElementById('footer-volume-slider');
    const volumeMuteBtn = document.getElementById('volume-mute-btn'); // Mute button

    // Playlist
    const playlistElement = document.getElementById('playlist-ul');

    // File Input & Trigger Button
    const audioFileInput = document.getElementById('audio-file-input');
    const openFilesOrFolderBtn = document.getElementById('open-files-or-folder-btn'); // Visible button to trigger input

    // Other UI elements (you'll need to connect these if you implement their functionality)
    const shuffleBtn = document.getElementById('shuffle-btn');
    const repeatBtn = document.getElementById('repeat-btn'); // Replaces playModeBtn from older examples
    // Hero section elements (example)
    const heroArtistName = document.getElementById('hero-artist-name');
    const heroSongCount = document.getElementById('hero-song-count');
    const heroPlayAllBtn = document.getElementById('hero-play-all-btn');
    const heroArtistImage = document.getElementById('hero-artist-image');


    let playlist = []; // Array of track objects: { name, artist, src, art, duration, type, originalFile }
    let currentTrackIndex = -1;
    let isPlaying = false;
    let currentPlayMode = 0; // 0: No repeat, 1: Repeat playlist, 2: Repeat track
    const repeatIcons = ['fa-solid fa-repeat', 'fa-solid fa-repeat', 'fa-solid fa-repeat-1']; // Icons for repeat modes (0 and 1 same for now)
    let isShuffled = false;
    let originalPlaylistOrder = []; // For unshuffling


    console.log("播放器变量初始化完毕");

    // --- Helper Functions ---
    function getTrackNameFromFile(file) {
        if (file instanceof File) {
            return file.name.replace(/\.[^/.]+$/, ""); // Remove extension
        }
        return "Unknown Track";
    }

    function formatTime(seconds) {
        if (isNaN(seconds) || seconds < 0) return "0:00";
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    // --- File/Folder Handling ---
    if (openFilesOrFolderBtn) {
        openFilesOrFolderBtn.addEventListener('click', () => {
            console.log("Open Files/Folder 按钮点击");
            audioFileInput.click(); // Trigger the hidden file input
        });
    }

    audioFileInput.addEventListener('change', (event) => {
        console.log("audioFileInput 'change' 事件触发");
        const files = event.target.files;
        console.log("选择的文件/文件夹中的文件数量:", files.length);

        if (files.length > 0) {
            const newSongs = [];
            Array.from(files).forEach(file => {
                // Filter for MP3 files
                if (file.type === 'audio/mpeg' || file.name.toLowerCase().endsWith('.mp3')) {
                    // Basic duplicate check based on name and size for local files
                    const isDuplicate = playlist.some(track =>
                        track.type === 'local' &&
                        track.originalFile &&
                        track.originalFile.name === file.name &&
                        track.originalFile.size === file.size
                    );

                    if (!isDuplicate) {
                        const trackSrc = URL.createObjectURL(file);
                        console.log(`为音频文件 ${file.name} 创建 Object URL: ${trackSrc}`);
                        newSongs.push({
                            name: getTrackNameFromFile(file),
                            artist: "Unknown Artist", // You might try to parse this from ID3 later
                            src: trackSrc,
                            art: "default_album_art.png", // Placeholder
                            duration: 0, // Will be updated on loadedmetadata
                            type: 'local',
                            originalFile: file
                        });
                    } else {
                        console.log(`跳过重复文件: ${file.name}`);
                    }
                } else {
                    console.log(`跳过非 MP3 文件: ${file.name} (类型: ${file.type})`);
                }
            });

            if (newSongs.length > 0) {
                const wasPlaylistEmpty = playlist.length === 0;
                playlist = playlist.concat(newSongs);
                if (isShuffled) { // If shuffled, add to original list and re-shuffle
                    originalPlaylistOrder = originalPlaylistOrder.concat(newSongs);
                    shufflePlaylist(false); // Re-shuffle without changing current track if possible
                }
                renderPlaylist();
                console.log(`${newSongs.length} 首新歌曲已添加到播放列表。`);

                if (wasPlaylistEmpty || currentTrackIndex === -1) {
                    currentTrackIndex = playlist.findIndex(track => track.src === newSongs[0].src); // Find index in potentially shuffled list
                    if (currentTrackIndex === -1 && playlist.length > 0) currentTrackIndex = 0; // Fallback
                    console.log("播放列表曾为空或无选中曲目, 准备加载新添加的第一个音轨, 索引:", currentTrackIndex);
                    loadTrack(currentTrackIndex);
                }
            } else {
                console.log("选择的文件夹中没有找到新的 MP3 文件或均为重复。");
            }
        }
        audioFileInput.value = null; // Allow re-selection
    });


    // --- Core Player Logic ---
    function loadTrack(index, autoplay = false) {
        console.log(`loadTrack 调用，目标索引: ${index}, 自动播放: ${autoplay}`);
        if (index < 0 || index >= playlist.length) {
            console.warn(`loadTrack 索引无效: ${index}。播放列表长度: ${playlist.length}`);
            // Optionally clear UI or handle "end of playlist" if not repeating
            return;
        }
        currentTrackIndex = index;
        const track = playlist[index];
        console.log("准备加载音轨详情:", track);

        if (audioPlayer.currentSrc && audioPlayer.currentSrc.startsWith('blob:') && audioPlayer.currentSrc !== track.src) {
            URL.revokeObjectURL(audioPlayer.currentSrc);
            console.log("Revoked previous Object URL:", audioPlayer.currentSrc);
        }

        audioPlayer.src = track.src;
        audioPlayer.load();

        // Update Footer UI
        footerCurrentTrackTitle.textContent = track.name;
        footerCurrentTrackArtist.textContent = track.artist || "";
        footerCurrentTrackArt.src = track.art || "default_album_art.png";
        footerCurrentTime.textContent = "0:00";
        footerTotalTime.textContent = formatTime(track.duration || 0); // Use stored duration initially
        footerProgressBar.value = 0;

        // Update Hero section if it's the main artist context (example)
        if (heroArtistName) heroArtistName.textContent = track.artist || "Various Artists";
        // heroSongCount.textContent = ... (this would require more complex logic)
        if (heroArtistImage && heroArtistImage.firstChild && track.art) (heroArtistImage.firstChild).src = track.art;


        updatePlaylistUIHighlights();

        if (autoplay) {
            audioPlayer.play().catch(handlePlayError);
        }
    }

    function togglePlayPause() {
        console.log(`togglePlayPause 调用。是否正在播放: ${isPlaying}`);
        if (currentTrackIndex === -1 && playlist.length > 0) { // No track loaded, play first
            loadTrack(0, true);
            return;
        }
        if (!audioPlayer.src && currentTrackIndex !== -1) { // Src missing for current track
            loadTrack(currentTrackIndex, true);
            return;
        }

        if (isPlaying) {
            audioPlayer.pause();
        } else {
            audioPlayer.play().catch(handlePlayError);
        }
    }

    function playNext(manual = false) {
        console.log("playNext 调用, manual:", manual);
        if (playlist.length === 0) return;
        let nextIndex = currentTrackIndex;

        if (isShuffled) { // Shuffle logic takes precedence if active
            if (playlist.length > 1) {
                // In shuffle, just pick another random one, could be any if not truly smart shuffle
                let randomIndex;
                do {
                    randomIndex = Math.floor(Math.random() * playlist.length);
                } while (randomIndex === currentTrackIndex && playlist.length > 1);
                nextIndex = randomIndex;
            } else {
                nextIndex = 0; // Only one song
            }
        } else { // Normal order
            nextIndex = (currentTrackIndex + 1);
        }


        if (currentPlayMode === 2 && !manual) { // Repeat current track (if ended automatically)
             console.log("单曲循环模式，重新播放当前歌曲。");
            loadTrack(currentTrackIndex, true);
            return;
        }

        if (nextIndex >= playlist.length) { // Reached end of playlist
            if (currentPlayMode === 1) { // Repeat playlist
                nextIndex = 0;
                console.log("列表循环，回到第一首。");
            } else { // No repeat or end of shuffled list (if not repeating shuffle)
                console.log("播放列表结束，无循环。");
                 // Optionally stop or clear UI
                audioPlayer.pause(); // Stop playback
                currentTrackIndex = 0; // Reset to first song but don't play
                loadTrack(currentTrackIndex, false); // Load first song but don't play
                return;
            }
        }
        loadTrack(nextIndex, true);
    }

    function playPrevious() {
        console.log("playPrevious 调用");
        if (playlist.length === 0) return;
        let prevIndex = currentTrackIndex;

        if (isShuffled) { // Shuffle logic
             if (playlist.length > 1) {
                let randomIndex;
                do {
                    randomIndex = Math.floor(Math.random() * playlist.length);
                } while (randomIndex === currentTrackIndex && playlist.length > 1);
                prevIndex = randomIndex;
            } else {
                prevIndex = 0;
            }
        } else { // Normal order
            prevIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
        }
        loadTrack(prevIndex, true);
    }

    // --- UI Rendering & Updates ---
    function renderPlaylist() {
        console.log("renderPlaylist 调用");
        if (!playlistElement) return;
        playlistElement.innerHTML = '';

        playlist.forEach((song, index) => {
            const li = document.createElement('li');
            li.classList.add('song-item');
            if (index === currentTrackIndex) li.classList.add('playing-active');
            li.dataset.index = index;

            // Structure based on the new UI image
            li.innerHTML = `
                <span class="song-index">${index + 1}</span>
                <img src="${song.art || 'default_album_art.png'}" alt="${song.name}" class="song-album-art">
                <div class="song-title-artist">
                    <span class="song-title">${song.name}</span>
                    ${song.artist ? `<span class="song-artist-playlist">${song.artist}</span>` : ''}
                </div>
                <span class="song-tag">${(song.tags && song.tags.length > 0) ? song.tags[0] : ''}</span>
                <span class="song-plays">${song.plays || ''}</span>
                <span class="song-duration">${formatTime(song.duration || 0)}</span>
                <div class="song-actions">
                    <button class="icon-btn song-like-btn"><i class="far fa-heart"></i></button>
                    <button class="icon-btn song-add-btn"><i class="fas fa-plus"></i></button>
                    <button class="icon-btn song-more-btn"><i class="fas fa-ellipsis-h"></i></button>
                </div>
            `;
            li.addEventListener('click', () => {
                console.log(`播放列表项点击，索引: ${index}`);
                loadTrack(index, true); // Click to play
            });
            playlistElement.appendChild(li);
        });
    }

    function updatePlaylistUIHighlights() {
        if (!playlistElement) return;
        const items = playlistElement.querySelectorAll('.song-item');
        items.forEach(item => {
            if (parseInt(item.dataset.index) === currentTrackIndex) {
                item.classList.add('playing-active');
            } else {
                item.classList.remove('playing-active');
            }
        });
    }


    // --- Event Listeners for Controls ---
    if (footerPlayPauseBtn) footerPlayPauseBtn.addEventListener('click', togglePlayPause);
    if (prevTrackBtn) prevTrackBtn.addEventListener('click', playPrevious);
    if (nextTrackBtn) nextTrackBtn.addEventListener('click', () => playNext(true));

    if (footerProgressBar) {
        footerProgressBar.addEventListener('input', (e) => {
            if (audioPlayer.duration) {
                audioPlayer.currentTime = (e.target.value / 100) * audioPlayer.duration;
            }
        });
    }

    if (footerVolumeSlider) {
        footerVolumeSlider.addEventListener('input', (e) => {
            audioPlayer.volume = parseFloat(e.target.value);
            updateVolumeIcon(audioPlayer.volume, audioPlayer.muted);
        });
    }
    if(volumeMuteBtn){
        volumeMuteBtn.addEventListener('click', () => {
            audioPlayer.muted = !audioPlayer.muted;
            updateVolumeIcon(audioPlayer.volume, audioPlayer.muted);
            // Optional: Store mute state or reflect on slider
            if(audioPlayer.muted && footerVolumeSlider) footerVolumeSlider.value = 0;
            else if (!audioPlayer.muted && footerVolumeSlider && audioPlayer.volume > 0) footerVolumeSlider.value = audioPlayer.volume;
            else if (!audioPlayer.muted && footerVolumeSlider && audioPlayer.volume === 0) footerVolumeSlider.value = 0.5; // Default if unmuting from 0
        });
    }

    function updateVolumeIcon(volume, muted) {
        if (!volumeMuteBtn) return;
        const icon = volumeMuteBtn.querySelector('i');
        if (muted || volume === 0) {
            icon.className = 'fa-solid fa-volume-xmark';
        } else if (volume < 0.5) {
            icon.className = 'fa-solid fa-volume-low';
        } else {
            icon.className = 'fa-solid fa-volume-high';
        }
    }


    if (repeatBtn) {
        repeatBtn.addEventListener('click', () => {
            currentPlayMode = (currentPlayMode + 1) % 3; // 0: No repeat, 1: Repeat list, 2: Repeat track
            const icon = repeatBtn.querySelector('i');
            icon.className = repeatIcons[currentPlayMode];
            if (currentPlayMode === 2) icon.classList.remove('fa-repeat'); icon.classList.add('fa-repeat-1'); // Ensure fa-repeat-1 for single
            else icon.classList.remove('fa-repeat-1'); icon.classList.add('fa-repeat');

            console.log("Repeat mode set to:", currentPlayMode);
             // Visual cue for repeat-1 if needed, e.g. highlight
            if(currentPlayMode === 2) repeatBtn.classList.add('active-repeat-one');
            else repeatBtn.classList.remove('active-repeat-one');
        });
    }

    if (shuffleBtn) {
        shuffleBtn.addEventListener('click', () => {
            isShuffled = !isShuffled;
            shuffleBtn.classList.toggle('active', isShuffled);
            shufflePlaylist(true); // Shuffle and re-render
            console.log("Shuffle mode:", isShuffled);
        });
    }

    function shufflePlaylist(updateCurrent = true) {
        if (isShuffled) {
            if (originalPlaylistOrder.length === 0 || originalPlaylistOrder.length !== playlist.length) {
                originalPlaylistOrder = [...playlist]; // Store current order before shuffling
            }
            // Fisher-Yates shuffle
            let shuffled = [...originalPlaylistOrder];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            // If current track exists, try to find it in the shuffled list and set currentTrackIndex
            let currentTrackStillInPlaylist = null;
            if (currentTrackIndex !== -1 && originalPlaylistOrder[currentTrackIndex]) {
                 currentTrackStillInPlaylist = originalPlaylistOrder[currentTrackIndex];
            }

            playlist = shuffled;

            if (updateCurrent && currentTrackStillInPlaylist) {
                const newIdx = playlist.findIndex(track => track.src === currentTrackStillInPlaylist.src);
                if (newIdx !== -1) currentTrackIndex = newIdx;
                else if (playlist.length > 0) currentTrackIndex = 0; // Fallback
                else currentTrackIndex = -1;
            } else if (updateCurrent && playlist.length > 0) {
                 currentTrackIndex = 0; // Default to first if current was lost or not set
            }


        } else { // Unshuffle
            if (originalPlaylistOrder.length > 0) {
                let currentTrackBeforeUnshuffle = null;
                if (currentTrackIndex !== -1 && playlist[currentTrackIndex]) {
                    currentTrackBeforeUnshuffle = playlist[currentTrackIndex];
                }
                playlist = [...originalPlaylistOrder]; // Restore original order
                originalPlaylistOrder = []; // Clear stored order

                if (updateCurrent && currentTrackBeforeUnshuffle) {
                     const newIdx = playlist.findIndex(track => track.src === currentTrackBeforeUnshuffle.src);
                     if (newIdx !== -1) currentTrackIndex = newIdx;
                     else if (playlist.length > 0) currentTrackIndex = 0;
                     else currentTrackIndex = -1;
                } else if (updateCurrent && playlist.length > 0) {
                    currentTrackIndex = 0;
                }
            }
        }
        renderPlaylist();
        updatePlaylistUIHighlights(); // Ensure correct highlight after re-render
    }


    // --- Audio Element Event Listeners ---
    audioPlayer.addEventListener('loadedmetadata', () => {
        console.log(`Audio 事件: loadedmetadata - 元数据加载完成。时长: ${audioPlayer.duration}`);
        if (currentTrackIndex !== -1 && playlist[currentTrackIndex]) {
            playlist[currentTrackIndex].duration = audioPlayer.duration; // Store duration
        }
        footerTotalTime.textContent = formatTime(audioPlayer.duration);
        // Update hero artist info if needed (e.g., when first song of an artist loads)
        // This would typically be more complex, fetching artist data
    });

    audioPlayer.addEventListener('timeupdate', () => {
        if (audioPlayer.duration) {
            footerCurrentTime.textContent = formatTime(audioPlayer.currentTime);
            footerProgressBar.value = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        }
    });

    audioPlayer.addEventListener('play', () => {
        isPlaying = true;
        if (footerPlayPauseBtn) footerPlayPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
        console.log("Audio 事件: play");
        updatePlaylistUIHighlights(); // Highlight current track
    });

    audioPlayer.addEventListener('pause', () => {
        isPlaying = false;
        if (footerPlayPauseBtn) footerPlayPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
        console.log(`Audio 事件: pause. Ended: ${audioPlayer.ended}`);
    });

    audioPlayer.addEventListener('ended', () => {
        console.log("Audio 事件: ended - 播放完毕");
        playNext(false); // Play next automatically
    });

    audioPlayer.addEventListener('volumechange', () => {
        if(footerVolumeSlider) footerVolumeSlider.value = audioPlayer.muted ? 0 : audioPlayer.volume;
        updateVolumeIcon(audioPlayer.volume, audioPlayer.muted);
        console.log("Volume changed to:", audioPlayer.volume, "Muted:", audioPlayer.muted);
    });

    // (Error, loadstart, canplay, etc. listeners from previous version can be kept)
    // Simplified error handler for brevity here, refer to previous more detailed one if needed
    audioPlayer.addEventListener('error', handlePlayError);


    // --- Initialization ---
    function initializePlayer() {
        console.log("播放器初始化...");
        updateVolumeIcon(audioPlayer.volume, audioPlayer.muted);
        if(footerVolumeSlider) footerVolumeSlider.value = audioPlayer.volume;
        if(repeatBtn && repeatBtn.querySelector('i')) repeatBtn.querySelector('i').className = repeatIcons[currentPlayMode];


        const defaultSong = {
            name: "Forever Love",
            artist: "王力宏",
            src: "Forever Love - 王力宏.mp3",
            art: "default_album_art.png", // Provide a path or leave as placeholder
            duration: 0, // Will be updated
            type: 'local-default'
        };

        if (playlist.length === 0) { // Only add default if playlist is truly empty
            playlist.unshift(defaultSong);
            currentTrackIndex = 0;
            console.log("已添加默认歌曲到播放列表:", defaultSong);
            renderPlaylist();
            console.log("初始化：加载默认歌曲，索引 0");
            loadTrack(currentTrackIndex, false); // Load but don't autoplay initially
        } else if (currentTrackIndex !== -1) {
            loadTrack(currentTrackIndex, false); // Reload current track if one was set
        } else if (playlist.length > 0 && currentTrackIndex === -1) {
            currentTrackIndex = 0; // If playlist exists but no index, load first
            loadTrack(currentTrackIndex, false);
        }

        console.log("播放器初始化完成。");
    }

    initializePlayer();
});
