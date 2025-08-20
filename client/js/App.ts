import { Storage } from './storage';

// Placeholders for external types
declare const log: any;
declare const TRANSITIONEND: string;
declare const localStorage: any;
declare class Game {
    public started: boolean;
    public player: any;
    public storage: Storage;
    public map: any;
    public renderer: {
        mobile: boolean;
        tablet: boolean;
        getScaleFactor(): number;
        getWidth(): number;
        getHeight(): number;
        rescale(scale: number): void;
    };
    public mouse: {
        x: number;
        y: number;
    };
    public onPlayerHealthChange: (callback: (hp: number, maxHp: number) => void) => void;
    public onPlayerHurt: (callback: () => void) => void;
    public getAchievementById: (id: number) => any;
    public loadMap(): void;
    public setServerOptions(host: string, port: number, username: string): void;
    public run(callback: () => void): void;
    public updateBars(): void;
    public resize(): void;
}

interface Achievement {
    id: number;
    name: string;
    desc: string;
    hidden: boolean;
}

export class App {
    private currentPage: number;
    private blinkInterval: number | null = null;
    private previousState: string | null = null;
    private isParchmentReady: boolean;
    private ready: boolean;
    private storage: Storage;
    private watchNameInputInterval: number;
    private playButton: HTMLElement | null;
    private playDiv: HTMLElement | null;
    private game?: Game;
    private isMobile: boolean = false;
    private isTablet: boolean = false;
    private isDesktop: boolean = false;
    private supportsWorkers: boolean = false;
    private messageTimer: number | null = null;

    constructor() {
        this.currentPage = 1;
        this.isParchmentReady = true;
        this.ready = false;
        this.storage = new Storage();

        this.toggleButton = this.toggleButton.bind(this);
        this.watchNameInputInterval = window.setInterval(this.toggleButton, 100);

        this.playButton = document.querySelector('.play');
        this.playDiv = document.querySelector('.play div');
    }

    public setGame(game: Game): void {
        this.game = game;
        this.isMobile = this.game.renderer.mobile;
        this.isTablet = this.game.renderer.tablet;
        this.isDesktop = !(this.isMobile || this.isTablet);
        this.supportsWorkers = !!window.Worker;
        this.ready = true;
    }

    public center(): void {
        window.scrollTo(0, 1);
    }

    public canStartGame(): boolean {
        if (this.isDesktop) {
            return !!(this.game && this.game.map && this.game.map.isLoaded);
        } else {
            return !!this.game;
        }
    }

    public tryStartingGame(username: string, startingCallback: () => void): void {
        if (username !== '') {
            if (!this.ready || !this.canStartGame()) {
                if (!this.isMobile && this.playButton) {
                    this.playButton.classList.add('loading');
                }
                
                this.playDiv?.removeEventListener('click', this.startGame);
                
                const watchCanStart = window.setInterval(() => {
                    log.debug("waiting...");
                    if (this.canStartGame()) {
                        window.setTimeout(() => {
                            if (!this.isMobile && this.playButton) {
                                this.playButton.classList.remove('loading');
                            }
                        }, 1500);
                        window.clearInterval(watchCanStart);
                        this.startGame(username, startingCallback);
                    }
                }, 100);
            } else {
                this.playDiv?.removeEventListener('click', this.startGame);
                this.startGame(username, startingCallback);
            }
        }
    }

    public startGame(username: string, startingCallback: () => void): void {
        if (startingCallback) {
            startingCallback();
        }
        this.hideIntro(() => {
            if (!this.isDesktop && this.game) {
                this.game.loadMap();
            }
            this.start(username);
        });
    }

    public start(username: string): void {
        const firstTimePlaying = !this.storage.hasAlreadyPlayed();

        if (username && this.game && !this.game.started) {
            // Placeholder for dev/prod host logic
            // Assuming this.config is available
            const config: any = {}; // You need to provide this
            
            // This is a simplified version of the dev/prod host logic
            const host = config.local?.host || config.dev?.host || config.build?.host;
            const port = config.local?.port || config.dev?.port || config.build?.port;

            if (host && port) {
                log.debug("Starting game with determined config.");
                this.game.setServerOptions(host, port, username);
            } else {
                log.error("Failed to determine server options.");
                return;
            }

            this.center();
            this.game.run(() => {
                document.body.classList.add('started');
                if (firstTimePlaying) {
                    this.toggleInstructions();
                }
            });
        }
    }

    public setMouseCoordinates(event: MouseEvent): void {
        const container = document.getElementById('container');
        if (!this.game || !container) {
            return;
        }
        
        const gamePos = container.getBoundingClientRect();
        const scale = this.game.renderer.getScaleFactor();
        const width = this.game.renderer.getWidth();
        const height = this.game.renderer.getHeight();
        const mouse = this.game.mouse;

        mouse.x = event.pageX - gamePos.left - (this.isMobile ? 0 : 5 * scale);
        mouse.y = event.pageY - gamePos.top - (this.isMobile ? 0 : 7 * scale);

        mouse.x = Utils.clamp(0, width - 1, mouse.x);
        mouse.y = Utils.clamp(0, height - 1, mouse.y);
    }

    public initHealthBar(): void {
        if (!this.game) return;
        
        const scale = this.game.renderer.getScaleFactor();
        const healthbar = document.getElementById("healthbar");
        const hitpoints = document.getElementById("hitpoints");
        if (!healthbar || !hitpoints) return;

        const healthMaxWidth = healthbar.offsetWidth - (12 * scale);

        this.game.onPlayerHealthChange((hp, maxHp) => {
            const barWidth = Math.round((healthMaxWidth / maxHp) * (hp > 0 ? hp : 0));
            hitpoints.style.width = barWidth + "px";
        });

        this.game.onPlayerHurt(this.blinkHealthBar.bind(this));
    }

    public blinkHealthBar(): void {
        const hitpoints = document.getElementById('hitpoints');
        if (!hitpoints) return;

        hitpoints.classList.add('white');
        window.setTimeout(() => {
            hitpoints.classList.remove('white');
        }, 500);
    }

    public toggleButton(): void {
        const nameInput = document.querySelector<HTMLInputElement>('#parchment input');
        const playButton = document.querySelector('#createcharacter .play');
        const characterButton = document.getElementById('character');

        if (!nameInput || !playButton || !characterButton) return;

        const name = nameInput.value;
        const isDisabled = name === '' || name.length === 0;
        
        playButton.classList.toggle('disabled', isDisabled);
        characterButton.classList.toggle('disabled', isDisabled);
    }

    public hideIntro(hiddenCallback: () => void): void {
        window.clearInterval(this.watchNameInputInterval);
        document.body.classList.remove('intro');
        window.setTimeout(() => {
            document.body.classList.add('game');
            hiddenCallback();
        }, 1000);
    }

    public showChat(): void {
        if (!this.game?.started) return;
        const chatbox = document.getElementById('chatbox');
        const chatinput = document.getElementById('chatinput');
        const chatbutton = document.getElementById('chatbutton');
        if (!chatbox || !chatinput || !chatbutton) return;
        
        chatbox.classList.add('active');
        (chatinput as HTMLInputElement).focus();
        chatbutton.classList.add('active');
    }

    public hideChat(): void {
        if (!this.game?.started) return;
        const chatbox = document.getElementById('chatbox');
        const chatinput = document.getElementById('chatinput');
        const chatbutton = document.getElementById('chatbutton');
        if (!chatbox || !chatinput || !chatbutton) return;

        chatbox.classList.remove('active');
        (chatinput as HTMLInputElement).blur();
        chatbutton.classList.remove('active');
    }

    public toggleInstructions(): void {
        const achievements = document.getElementById('achievements');
        const achievementsButton = document.getElementById('achievementsbutton');
        const instructions = document.getElementById('instructions');
        if (!achievements || !achievementsButton || !instructions) return;

        if (achievements.classList.contains('active')) {
            this.toggleAchievements();
            achievementsButton.classList.remove('active');
        }
        instructions.classList.toggle('active');
    }

    public toggleAchievements(): void {
        const instructions = document.getElementById('instructions');
        const helpButton = document.getElementById('helpbutton');
        const achievements = document.getElementById('achievements');
        if (!instructions || !helpButton || !achievements) return;

        if (instructions.classList.contains('active')) {
            this.toggleInstructions();
            helpButton.classList.remove('active');
        }
        this.resetPage();
        achievements.classList.toggle('active');
    }

    public resetPage(): void {
        const achievements = document.getElementById('achievements');
        if (!achievements) return;

        if (achievements.classList.contains('active')) {
            const onTransitionEnd = () => {
                achievements.classList.remove('page' + this.currentPage);
                achievements.classList.add('page1');
                this.currentPage = 1;
                achievements.removeEventListener(TRANSITIONEND, onTransitionEnd);
            };
            achievements.addEventListener(TRANSITIONEND, onTransitionEnd);
        }
    }

    public initEquipmentIcons(): void {
        if (!this.game) return;

        const scale = this.game.renderer.getScaleFactor();
        const getIconPath = (spriteName: string): string => {
            return `img/${scale}/item-${spriteName}.png`;
        };
        const weapon = this.game.player.getWeaponName();
        const armor = this.game.player.getSpriteName();
        const weaponPath = getIconPath(weapon);
        const armorPath = getIconPath(armor);

        const weaponElement = document.getElementById('weapon');
        const armorElement = document.getElementById('armor');
        if (weaponElement) {
            weaponElement.style.backgroundImage = `url("${weaponPath}")`;
        }
        if (armorElement && armor !== 'firefox') {
            armorElement.style.backgroundImage = `url("${armorPath}")`;
        }
    }

    public hideWindows(): void {
        const achievements = document.getElementById('achievements');
        const achievementsButton = document.getElementById('achievementsbutton');
        const instructions = document.getElementById('instructions');
        const helpButton = document.getElementById('helpbutton');
        if (!achievements || !achievementsButton || !instructions || !helpButton) return;
        
        if (achievements.classList.contains('active')) {
            this.toggleAchievements();
            achievementsButton.classList.remove('active');
        }
        if (instructions.classList.contains('active')) {
            this.toggleInstructions();
            helpButton.classList.remove('active');
        }
        if (document.body.classList.contains('credits')) {
            this.closeInGameCredits();
        }
        if (document.body.classList.contains('about')) {
            this.closeInGameAbout();
        }
    }

    public showAchievementNotification(id: number, name: string): void {
        const notification = document.getElementById('achievement-notification');
        const nameElement = notification?.querySelector('.name');
        const button = document.getElementById('achievementsbutton');
        if (!notification || !nameElement || !button) return;

        notification.className = `active achievement${id}`;
        nameElement.textContent = name;
        
        if (this.game && this.game.storage.getAchievementCount() === 1) {
            this.blinkInterval = window.setInterval(() => {
                button.classList.toggle('blink');
            }, 500);
        }
        window.setTimeout(() => {
            notification.classList.remove('active');
            button.classList.remove('blink');
        }, 5000);
    }

    public displayUnlockedAchievement(id: number): void {
        const achievementElement = document.querySelector(`#achievements li.achievement${id}`);
        if (!achievementElement) return;

        const achievement = this.game?.getAchievementById(id);
        if (achievement && achievement.hidden) {
            this.setAchievementData(achievementElement as HTMLElement, achievement.name, achievement.desc);
        }
        achievementElement.classList.add('unlocked');
    }

    public unlockAchievement(id: number, name: string): void {
        this.showAchievementNotification(id, name);
        this.displayUnlockedAchievement(id);

        const countElement = document.getElementById('unlocked-achievements');
        if (!countElement) return;

        const nb = parseInt(countElement.textContent || '0', 10);
        countElement.textContent = (nb + 1).toString();
    }

    public initAchievementList(achievements: Achievement[]): void {
        const lists = document.getElementById('lists');
        const pageTemplate = document.getElementById('page-tmpl');
        const achievementTemplate = document.getElementById('achievement-tmpl');
        if (!lists || !pageTemplate || !achievementTemplate) return;

        let pageNumber = 0;
        let count = 0;
        let currentPage: HTMLElement | null = null;

        achievements.forEach(achievement => {
            count++;

            const achievementElement = achievementTemplate.cloneNode(true) as HTMLElement;
            achievementElement.removeAttribute('id');
            achievementElement.classList.add('achievement' + count);
            
            if (!achievement.hidden) {
                this.setAchievementData(achievementElement, achievement.name, achievement.desc);
            }

            const twitterLink = achievementElement.querySelector('.twitter');
            if (twitterLink) {
                twitterLink.setAttribute('href', `http://twitter.com/share?url=http%3A%2F%2Fbrowserquest.mozilla.org&text=I%20unlocked%20the%20%27${achievement.name}%27%20achievement%20on%20Mozilla%27s%20%23BrowserQuest%21&related=glecollinet:Creators%20of%20BrowserQuest%2Cwhatthefranck`);
                twitterLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    const url = twitterLink.getAttribute('href');
                    if (url) this.openPopup('twitter', url);
                });
            }

            achievementElement.style.display = 'list-item';

            if ((count - 1) % 4 === 0) {
                pageNumber++;
                currentPage = pageTemplate.cloneNode(true) as HTMLElement;
                currentPage.id = 'page' + pageNumber;
                currentPage.style.display = 'block';
                lists.appendChild(currentPage);
            }
            if (currentPage) {
                currentPage.appendChild(achievementElement);
            }
        });

        const totalAchievements = document.getElementById('total-achievements');
        if (totalAchievements) {
            const allAchievements = document.querySelectorAll('#achievements li');
            totalAchievements.textContent = (allAchievements.length).toString();
        }
    }

    public initUnlockedAchievements(ids: number[]): void {
        ids.forEach(id => {
            this.displayUnlockedAchievement(id);
        });
        const countElement = document.getElementById('unlocked-achievements');
        if (countElement) {
            countElement.textContent = ids.length.toString();
        }
    }

    public setAchievementData(el: HTMLElement, name: string, desc: string): void {
        const nameElement = el.querySelector('.achievement-name');
        const descElement = el.querySelector('.achievement-description');
        if (nameElement) nameElement.innerHTML = name;
        if (descElement) descElement.innerHTML = desc;
    }

    public toggleCredits(): void {
        const parchment = document.getElementById('parchment');
        if (!parchment) return;

        const currentState = parchment.getAttribute('class') || '';
        const isGameStarted = this.game?.started;

        if (isGameStarted) {
            parchment.className = 'credits';
            document.body.classList.toggle('credits');

            if (!this.game.player) {
                document.body.classList.toggle('death');
            }
            if (document.body.classList.contains('about')) {
                this.closeInGameAbout();
            }
        } else {
            if (currentState !== 'animate' && this.isParchmentReady) {
                if (currentState === 'credits') {
                    this.animateParchment(currentState, this.previousState);
                } else {
                    this.animateParchment(currentState, 'credits');
                    this.previousState = currentState;
                }
            }
        }
    }

    public toggleAbout(): void {
        const parchment = document.getElementById('parchment');
        if (!parchment) return;
        
        const currentState = parchment.getAttribute('class') || '';
        const isGameStarted = this.game?.started;

        if (isGameStarted) {
            parchment.className = 'about';
            document.body.classList.toggle('about');
            if (!this.game.player) {
                document.body.classList.toggle('death');
            }
            if (document.body.classList.contains('credits')) {
                this.closeInGameCredits();
            }
        } else {
            if (currentState !== 'animate' && this.isParchmentReady) {
                if (currentState === 'about') {
                    if (localStorage && localStorage.data) {
                        this.animateParchment(currentState, 'loadcharacter');
                    } else {
                        this.animateParchment(currentState, 'createcharacter');
                    }
                } else {
                    this.animateParchment(currentState, 'about');
                    this.previousState = currentState;
                }
            }
        }
    }

    public closeInGameCredits(): void {
        document.body.classList.remove('credits');
        const parchment = document.getElementById('parchment');
        if (parchment) {
            parchment.classList.remove('credits');
        }
        if (this.game && !this.game.player) {
            document.body.classList.add('death');
        }
    }
    
    public closeInGameAbout(): void {
        document.body.classList.remove('about');
        const parchment = document.getElementById('parchment');
        const helpButton = document.getElementById('helpbutton');
        if (parchment) parchment.classList.remove('about');
        if (this.game && !this.game.player) {
            document.body.classList.add('death');