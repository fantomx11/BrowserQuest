import { Area } from './Area';

// Placeholders for external types
declare const Detect: {
    canPlayMP3(): boolean;
    isSafari(): boolean;
    isWindows(): boolean;
};
declare const log: any;
declare class Class {
    static extend: (props: any) => any;
}

interface Game {
    player: any;
    renderer: {
        mobile: boolean;
    };
}

interface Entity {
    gridX: number;
    gridY: number;
}

interface Music {
    sound: HTMLAudioElement;
    name: string;
}

// Export the AudioManager class as a module
export class AudioManager {
    public enabled: boolean;
    public extension: string;
    public sounds: Record<string, HTMLAudioElement[]>;
    public areas: Area[];
    public musicNames: string[];
    public soundNames: string[];
    public currentMusic: Music | null;

    private game: Game;

    constructor(game: Game) {
        this.enabled = true;
        this.extension = Detect.canPlayMP3() ? "mp3" : "ogg";
        this.sounds = {};
        this.game = game;
        this.currentMusic = null;
        this.areas = [];
        this.musicNames = ["village", "beach", "forest", "cave", "desert", "lavaland", "boss"];
        this.soundNames = ["loot", "hit1", "hit2", "hurt", "heal", "chat", "revive", "death", "firefox", "achievement", "kill1", "kill2", "noloot", "teleport", "chest", "npc", "npc-end"];

        if (!(Detect.isSafari() && Detect.isWindows())) {
            this.loadSoundFiles();
        } else {
            this.enabled = false;
        }
    }

    private loadSoundFiles(): void {
        let counter = this.soundNames.length;
        log.info("Loading sound files...");
        this.soundNames.forEach(name => {
            this.loadSound(name, () => {
                counter--;
                if (counter === 0) {
                    if (!Detect.isSafari()) {
                        this.loadMusicFiles();
                    }
                }
            });
        });
    }

    private loadMusicFiles(): void {
        if (!this.game.renderer.mobile) {
            log.info("Loading music files...");
            const villageMusicName = this.musicNames.shift();
            if (villageMusicName) {
                this.loadMusic(villageMusicName, () => {
                    this.musicNames.forEach(name => {
                        this.loadMusic(name);
                    });
                });
            }
        }
    }

    public toggle(): void {
        this.enabled = !this.enabled;

        if (!this.enabled && this.currentMusic) {
            this.resetMusic(this.currentMusic);
        } else if (this.enabled) {
            this.currentMusic = null;
            this.updateMusic();
        }
    }

    private load(basePath: string, name: string, loadedCallback?: () => void, channels: number = 1): void {
        const audioPath = `${basePath}${name}.${this.extension}`;
        const sound = new Audio();

        const onCanPlay = () => {
            log.debug(`${audioPath} is ready to play.`);
            sound.removeEventListener('canplaythrough', onCanPlay);
            loadedCallback?.();
        };

        const onError = () => {
            log.error(`Error: ${audioPath} could not be loaded.`);
            sound.removeEventListener('error', onError);
            this.sounds[name] = [];
        };

        sound.addEventListener('canplaythrough', onCanPlay, false);
        sound.addEventListener('error', onError, false);

        sound.preload = "auto";
        sound.src = audioPath;
        sound.load();

        this.sounds[name] = [sound];
        for (let i = 0; i < channels - 1; i++) {
            this.sounds[name].push(sound.cloneNode(true) as HTMLAudioElement);
        }
    }

    public loadSound(name: string, handleLoaded?: () => void): void {
        this.load("audio/sounds/", name, handleLoaded, 4);
    }

    public loadMusic(name: string, handleLoaded?: () => void): void {
        this.load("audio/music/", name, handleLoaded, 1);
        const music = this.sounds[name]?.[0];
        if (music) {
            music.loop = true;
            music.addEventListener('ended', () => { music.play(); }, false);
        }
    }

    private getSound(name: string): HTMLAudioElement | null {
        const soundArray = this.sounds[name];
        if (!soundArray) {
            return null;
        }

        let sound = soundArray.find(s => s.paused || s.ended);

        if (sound) {
            if (sound.ended) {
                sound.currentTime = 0;
            }
        } else {
            // Fallback to the first channel if all are in use
            sound = soundArray[0];
        }
        return sound;
    }

    public playSound(name: string): void {
        const sound = this.enabled && this.getSound(name);
        if (sound) {
            sound.play();
        }
    }

    public addArea(x: number, y: number, width: number, height: number, musicName: string): void {
        const area = new Area(x, y, width, height);
        area.musicName = musicName;
        this.areas.push(area);
    }

    private getSurroundingMusic(entity: Entity): Music | null {
        const area = this.areas.find(a => a.contains(entity));
        if (area) {
            const sound = this.getSound(area.musicName);
            if (sound) {
                return { sound, name: area.musicName };
            }
        }
        return null;
    }

    public updateMusic(): void {
        if (!this.enabled) {
            return;
        }

        const music = this.getSurroundingMusic(this.game.player);
        if (music) {
            if (!this.isCurrentMusic(music)) {
                if (this.currentMusic) {
                    this.fadeOutCurrentMusic();
                }
                this.playMusic(music);
            }
        } else {
            this.fadeOutCurrentMusic();
        }
    }

    private isCurrentMusic(music: Music): boolean {
        return !!this.currentMusic && music.name === this.currentMusic.name;
    }

    private playMusic(music: Music): void {
        if (this.enabled && music && music.sound) {
            // A temporary fix for the missing fading logic from the original
            music.sound.volume = 1;
            music.sound.play();
            this.currentMusic = music;
        }
    }

    private resetMusic(music: Music): void {
        if (music && music.sound && music.sound.readyState > 0) {
            music.sound.pause();
            music.sound.currentTime = 0;
        }
    }

    private fadeOutCurrentMusic(): void {
        if (this.currentMusic) {
            // For now, we'll just stop the music instantly.
            // The original's fading logic would be more complex to convert directly.
            this.resetMusic(this.currentMusic);
            this.currentMusic = null;
        }
    }
}