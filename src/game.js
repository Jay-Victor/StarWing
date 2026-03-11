/* ==================== Game Configuration ==================== */
const CONFIG = Object.freeze({
    PLAYER_SPEED: 5,
    BULLET_SPEED: 10,
    ENEMY_SPEED_BASE: 2,
    LASER_COOLDOWN: 150,
    LASER_FIRE_INTERVAL: 150,
    MAX_HEALTH: 100,
    PARTICLE_COUNT: 20,
    STAR_COUNT: 100,
    ENEMY_SPAWN_RATE: 2000,
    DIFFICULTY_INCREASE_RATE: 30000,
    COMBO_TIMEOUT: 2000,
    GESTURE_CONFIDENCE_THRESHOLD: 0.75,
    GESTURE_CONFIDENCE_THRESHOLD_LOW: 0.5,
    GESTURE_SMOOTHING_FRAMES: 5,
    GESTURE_PREDICTION_FRAMES: 3,
    GESTURE_KALMAN_Q: 0.01,
    GESTURE_KALMAN_R: 0.1,
    MAX_BULLETS: 50,
    MAX_ENEMIES: 30,
    MAX_PARTICLES: 100,
    OBJECT_POOL_SIZE: 50,
    TARGET_FPS: 60,
    FRAME_TIME: 1000 / 60
});

/* ==================== DOM Element Cache ==================== */
/**
 * DOM缓存系统 - 优化性能，减少重复查询
 * 添加空值安全检查，防止DOM元素不存在时出错
 */
const DOM = {
    cache: new Map(),
    get(id) {
        if (!this.cache.has(id)) {
            const el = document.getElementById(id);
            if (el) {
                this.cache.set(id, el);
            } else {
                console.warn(`DOM element with id '${id}' not found`);
                return null;
            }
        }
        return this.cache.get(id);
    },
    getSafe(id, defaultValue = null) {
        const el = this.get(id);
        return el || defaultValue;
    },
    getAll(ids) {
        return ids.map(id => this.get(id)).filter(el => el !== null);
    },
    clear() {
        this.cache.clear();
    },
    refresh(id) {
        this.cache.delete(id);
        return this.get(id);
    }
};

/* ==================== Optimized DOM Helpers ==================== */
const $ = (sel, parent = document) => parent.querySelector(sel);
const $$ = (sel, parent = document) => [...parent.querySelectorAll(sel)];
const $id = (id) => DOM.get(id);
const $show = (el) => el && el.classList.remove('hidden');
const $hide = (el) => el && el.classList.add('hidden');
const $toggle = (el, force) => el && el.classList.toggle('hidden', force);

/* ==================== Performance Utilities ==================== */
/**
 * 防抖函数 - 限制函数执行频率，适用于搜索、窗口调整等高频事件
 * @param {Function} func - 要防抖的函数
 * @param {number} wait - 等待时间（毫秒）
 * @param {boolean} immediate - 是否立即执行
 * @returns {Function} 防抖后的函数
 */
function debounce(func, wait = 300, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
        const context = this;
        const later = () => {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
}

/**
 * 节流函数 - 限制函数执行频率，适用于滚动、鼠标移动等连续事件
 * @param {Function} func - 要节流的函数
 * @param {number} limit - 时间限制（毫秒）
 * @returns {Function} 节流后的函数
 */
function throttle(func, limit = 100) {
    let inThrottle;
    return function executedFunction(...args) {
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * requestAnimationFrame 节流 - 专为动画优化的节流函数
 * @param {Function} func - 要节流的函数
 * @returns {Function} 节流后的函数
 */
function rafThrottle(func) {
    let ticking = false;
    return function executedFunction(...args) {
        const context = this;
        if (!ticking) {
            requestAnimationFrame(() => {
                func.apply(context, args);
                ticking = false;
            });
            ticking = true;
        }
    };
}

/**
 * 记忆化函数 - 缓存函数结果，避免重复计算
 * @param {Function} func - 要记忆化的函数
 * @returns {Function} 记忆化后的函数
 */
function memoize(func) {
    const cache = new Map();
    return function executedFunction(...args) {
        const key = JSON.stringify(args);
        if (cache.has(key)) {
            return cache.get(key);
        }
        const result = func.apply(this, args);
        cache.set(key, result);
        return result;
    };
}

/**
 * 批量DOM操作 - 使用DocumentFragment批量插入DOM节点
 * @param {HTMLElement} parent - 父元素
 * @param {Array<HTMLElement>} elements - 要插入的元素数组
 */
function batchInsert(parent, elements) {
    const fragment = document.createDocumentFragment();
    elements.forEach(el => fragment.appendChild(el));
    parent.appendChild(fragment);
}

/**
 * 惰性加载图片 - 使用Intersection Observer实现图片懒加载
 * @param {string} selector - 图片选择器
 * @param {Object} options - 配置选项
 */
function lazyLoadImages(selector = 'img[data-src]', options = {}) {
    const defaultOptions = {
        root: null,
        rootMargin: '50px',
        threshold: 0.01
    };
    const observerOptions = { ...defaultOptions, ...options };
    
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    observer.unobserve(img);
                }
            });
        }, observerOptions);
        
        document.querySelectorAll(selector).forEach(img => imageObserver.observe(img));
    } else {
        // 降级处理：直接加载所有图片
        document.querySelectorAll(selector).forEach(img => {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
        });
    }
}

/* ==================== Event Bus for Component Communication ==================== */
/**
 * 事件总线 - 使用WeakMap优化内存管理
 * WeakMap允许在没有外部引用时自动垃圾回收，避免内存泄漏
 */
class EventBus {
    constructor() {
        this.listeners = new Map();
        // 使用WeakMap存储对象引用，避免内存泄漏
        this.weakRefs = new WeakMap();
        // 监听器ID计数器
        this.listenerIdCounter = 0;
        // 监听器ID到事件的映射
        this.listenerIdMap = new Map();
    }

    /**
     * 订阅事件
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     * @param {Object} [context] - 可选的上下文对象（用于WeakMap优化）
     * @returns {Function} 取消订阅函数
     */
    on(event, callback, context) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Map());
        }
        
        const listenerId = ++this.listenerIdCounter;
        this.listeners.get(event).set(listenerId, callback);
        this.listenerIdMap.set(listenerId, event);
        
        // 如果提供了上下文对象，使用WeakMap存储引用
        if (context && typeof context === 'object') {
            this.weakRefs.set(context, { event, listenerId, callback });
        }
        
        // 返回取消订阅函数
        return () => this.off(event, listenerId);
    }

    /**
     * 取消订阅事件
     * @param {string} event - 事件名称
     * @param {number|Function} listenerIdOrCallback - 监听器ID或回调函数
     */
    off(event, listenerIdOrCallback) {
        if (!this.listeners.has(event)) return;
        
        const listeners = this.listeners.get(event);
        
        if (typeof listenerIdOrCallback === 'number') {
            listeners.delete(listenerIdOrCallback);
            this.listenerIdMap.delete(listenerIdOrCallback);
        } else {
            // 兼容旧的回调函数方式
            for (const [id, callback] of listeners.entries()) {
                if (callback === listenerIdOrCallback) {
                    listeners.delete(id);
                    this.listenerIdMap.delete(id);
                    break;
                }
            }
        }
        
        // 如果该事件没有监听器了，删除事件
        if (listeners.size === 0) {
            this.listeners.delete(event);
        }
    }

    /**
     * 触发事件
     * @param {string} event - 事件名称
     * @param {*} data - 事件数据
     */
    emit(event, data) {
        if (!this.listeners.has(event)) return;
        
        const listeners = this.listeners.get(event);
        const errors = [];
        
        listeners.forEach((callback, id) => {
            try {
                callback(data);
            } catch (e) {
                console.error(`Event error [${event}] (listener ${id}):`, e);
                errors.push({ id, error: e });
            }
        });
        
        // 如果有错误，可以选择性地移除失败的监听器
        if (errors.length > 0) {
            console.warn(`Event [${event}] had ${errors.length} error(s)`);
        }
    }

    /**
     * 清除所有监听器
     */
    clear() {
        this.listeners.clear();
        this.listenerIdMap.clear();
        // WeakMap会自动垃圾回收，无需手动清除
    }

    /**
     * 获取事件监听器统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        let totalListeners = 0;
        this.listeners.forEach(listeners => {
            totalListeners += listeners.size;
        });
        
        return {
            eventCount: this.listeners.size,
            totalListeners,
            listenerIdCounter: this.listenerIdCounter
        };
    }
}

const eventBus = new EventBus();

/* ==================== State Manager ==================== */
class StateManager {
    constructor() {
        this.state = {
            gameStatus: 'menu',
            controlMode: 'keyboard',
            player: { x: 0, y: 0, health: 100, score: 0, combo: 0, level: 1 },
            bullets: [],
            enemies: [],
            particles: [],
            settings: {
                sound: true,
                volume: 0.7,
                autoShoot: false,
                gestureSensitivity: 5,
                smoothing: 5
            }
        };
        this.listeners = new Set();
    }

    getState(path) {
        if (!path) return this.state;
        return path.split('.').reduce((obj, key) => obj && obj[key], this.state);
    }

    setState(path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((obj, key) => obj && obj[key], this.state);
        if (target) {
            target[lastKey] = value;
            this.notify(path, value);
        }
    }

    updateState(updates) {
        Object.keys(updates).forEach(key => {
            this.setState(key, updates[key]);
        });
    }

    subscribe(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    notify(path, value) {
        this.listeners.forEach(callback => callback(path, value, this.state));
    }
}

const stateManager = new StateManager();

/* ==================== Object Pool for Performance ==================== */
class ObjectPool {
    constructor(createFn, resetFn, initialSize = 10) {
        this.createFn = createFn;
        this.resetFn = resetFn;
        this.pool = [];
        this.active = [];
        
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(this.createFn());
        }
    }

    get() {
        let obj = this.pool.pop();
        if (!obj) {
            obj = this.createFn();
        }
        this.active.push(obj);
        return obj;
    }

    release(obj) {
        const index = this.active.indexOf(obj);
        if (index > -1) {
            this.active.splice(index, 1);
            this.resetFn(obj);
            this.pool.push(obj);
        }
    }

    releaseAll() {
        while (this.active.length > 0) {
            const obj = this.active.pop();
            this.resetFn(obj);
            this.pool.push(obj);
        }
    }
}

/* ==================== Performance Monitor ==================== */
class PerformanceMonitor {
    constructor() {
        this.frames = 0;
        this.lastTime = performance.now();
        this.fps = 0;
        this.frameTime = 0;
        this.memoryUsage = 0;
    }

    update() {
        this.frames++;
        const now = performance.now();
        const delta = now - this.lastTime;
        
        if (delta >= 1000) {
            this.fps = Math.round((this.frames * 1000) / delta);
            this.frameTime = delta / this.frames;
            this.frames = 0;
            this.lastTime = now;
            
            if (performance.memory) {
                this.memoryUsage = Math.round(performance.memory.usedJSHeapSize / 1048576);
            }
        }
    }

    getStats() {
        return {
            fps: this.fps,
            frameTime: this.frameTime.toFixed(2),
            memory: this.memoryUsage
        };
    }
}

const perfMonitor = new PerformanceMonitor();

/* ==================== Game State ==================== */
const gameState = {
    isRunning: false,
    isPaused: false,
    score: 0,
    health: CONFIG.MAX_HEALTH,
    combo: 0,
    maxCombo: 0,
    level: 1,
    hits: 0,
    startTime: 0,
    controlMode: 'keyboard',
    lastShot: 0,
    lastComboTime: 0,
    animationFrameId: null,
    /** 鼠标按住状态 */
    isMouseDown: false,
    /** 激光连发定时器ID */
    fireIntervalId: null,
    settings: Object.seal({
        sound: true,
        volume: 0.7,
        showFPS: false,
        particles: true,
        autoShoot: false,
        gestureEnabled: false,
        gestureSensitivity: 5,
        smoothingFactor: 5
    })
};

/* ==================== Gesture Control System (Optimized) ==================== */
/**
 * 卡尔曼滤波器 - 用于手势位置预测和降噪
 * 有效减少抖动，提高跟踪稳定性
 */
class KalmanFilter {
    constructor(q = CONFIG.GESTURE_KALMAN_Q, r = CONFIG.GESTURE_KALMAN_R) {
        this.q = q; // 过程噪声
        this.r = r; // 测量噪声
        this.x = 0; // 估计值
        this.p = 1; // 估计误差协方差
        this.k = 0; // 卡尔曼增益
    }

    update(measurement) {
        // 预测步骤
        this.p = this.p + this.q;
        
        // 更新步骤
        this.k = this.p / (this.p + this.r);
        this.x = this.x + this.k * (measurement - this.x);
        this.p = (1 - this.k) * this.p;
        
        return this.x;
    }

    reset() {
        this.x = 0;
        this.p = 1;
        this.k = 0;
    }
}

/**
 * 手势状态机 - 减少误判，提高识别稳定性
 */
class GestureStateMachine {
    constructor(stableFrames = 3) {
        this.stableFrames = stableFrames;
        this.currentState = null;
        this.stateCounter = 0;
        this.lastConfirmedState = null;
    }

    update(newState) {
        if (newState === this.currentState) {
            this.stateCounter++;
            if (this.stateCounter >= this.stableFrames) {
                this.lastConfirmedState = newState;
                return newState;
            }
        } else {
            this.currentState = newState;
            this.stateCounter = 1;
        }
        return this.lastConfirmedState;
    }

    reset() {
        this.currentState = null;
        this.stateCounter = 0;
        this.lastConfirmedState = null;
    }
}

class GestureController {
    constructor() {
        this.video = null;
        this.canvas = null;
        this.ctx = null;
        this.hands = null;
        this.camera = null;
        this.isActive = false;
        this.isInitialized = false;
        this.fingerPosition = { x: 0.5, y: 0.5 };
        this.smoothedPosition = { x: 0.5, y: 0.5 };
        this.predictedPosition = { x: 0.5, y: 0.5 };
        this.positionHistory = [];
        this.lastValidPosition = null;
        this.confidence = 0;
        this.frameCount = 0;
        this.lastFrameTime = 0;
        this.fps = 0;
        this.onFrameCallback = null;
        this.isOpenPalm = false;
        this.onGestureStateChange = null;
        this.lastIsOpenPalm = false;
        
        // 优化组件
        this.kalmanFilterX = new KalmanFilter();
        this.kalmanFilterY = new KalmanFilter();
        this.gestureStateMachine = new GestureStateMachine(3);
        
        // 自适应阈值
        this.adaptiveThreshold = CONFIG.GESTURE_CONFIDENCE_THRESHOLD;
        this.consecutiveLowConfidence = 0;
        this.consecutiveHighConfidence = 0;
        
        // 性能监控
        this.performanceMetrics = {
            totalFrames: 0,
            successfulDetections: 0,
            averageLatency: 0,
            latencyHistory: []
        };
    }

    updateUI() {
        const cameraOverlay = DOM.get('cameraOverlay');
        const gestureToggleText = DOM.get('gestureToggleText');
        const gestureStatusText = DOM.get('gestureStatusText');
        const gestureConfidence = DOM.get('gestureConfidence');
        const gestureFps = DOM.get('gestureFps');
        const fingerDot = DOM.get('fingerDot');
        const gesturePanel = DOM.get('gesturePanel');

        if (cameraOverlay) cameraOverlay.classList.toggle('hidden', this.isActive);
        if (gestureToggleText) gestureToggleText.textContent = this.isActive ? '关闭摄像头' : '开启摄像头';
        if (gestureStatusText) {
            gestureStatusText.textContent = this.isActive ? '运行中' : '未激活';
            gestureStatusText.classList.toggle('active', this.isActive);
        }
        if (gestureConfidence) gestureConfidence.textContent = `${Math.round(this.confidence * 100)}%`;
        if (gestureFps) gestureFps.textContent = this.fps.toString();
        if (fingerDot) fingerDot.classList.toggle('active', this.isActive);
        if (gesturePanel) gesturePanel.setAttribute('data-gesture-active', this.isActive.toString());

        eventBus.emit('gesture:state', { 
            isActive: this.isActive, 
            confidence: this.confidence,
            fps: this.fps 
        });
    }

    async init() {
        if (this.isInitialized) return true;

        const initTimeout = 30000;
        const initPromise = this.doInit();
        
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Initialization timeout (30s)')), initTimeout);
        });

        try {
            return await Promise.race([initPromise, timeoutPromise]);
        } catch (error) {
            console.error('[StarWing] GestureController init failed:', error);
            notificationManager.error(error.message || '手势识别系统初始化失败');
            return false;
        }
    }

    async doInit() {
        try {
            this.video = document.getElementById('gestureVideo');
            this.canvas = document.getElementById('gestureCanvas');
            this.ctx = this.canvas.getContext('2d');

            if (!this.video || !this.canvas) {
                throw new Error('找不到视频或画布元素');
            }

            console.log('[StarWing] Starting MediaPipe load...');
            notificationManager.info('正在加载手势识别模型...');
            
            if (typeof window.loadMediaPipe === 'function') {
                await window.loadMediaPipe();
            } else {
                console.log('[StarWing] loadMediaPipe not found, checking Hands...');
            }

            if (typeof Hands === 'undefined') {
                console.log('[StarWing] Hands not defined, trying to load manually...');
                await this.loadHandsManually();
            }

            if (typeof Hands === 'undefined') {
                throw new Error('手势识别库加载失败，请检查网络连接');
            }

            this.hands = new Hands({
                locateFile: (file) => {
                    const url = `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
                    console.log('[StarWing] Loading MediaPipe file:', file);
                    return url;
                }
            });

            this.hands.onResults((results) => this.onResults(results));

            this.hands.setOptions({
                maxNumHands: 1,
                modelComplexity: 1,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });

            await this.hands.initialize();
            
            this.isInitialized = true;
            console.log('[StarWing] GestureController initialized successfully');
            notificationManager.success('手势识别系统初始化成功');
            return true;
        } catch (error) {
            console.error('[StarWing] Failed to initialize GestureController:', error);
            let errorMsg = '手势识别系统初始化失败';
            if (error.message.includes('timeout')) {
                errorMsg = '手势识别模型加载超时，请检查网络连接';
            } else if (error.message.includes('network') || error.message.includes('Failed to fetch')) {
                errorMsg = '网络连接失败，无法加载手势识别模型';
            } else if (error.message.includes('NotAllowed') || error.message.includes('Permission')) {
                errorMsg = '摄像头权限被拒绝，请在系统设置中允许访问';
            }
            notificationManager.error(errorMsg);
            return false;
        }
    }

    async loadHandsManually() {
        return new Promise((resolve, reject) => {
            const scripts = [
                'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js',
                'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js', 
                'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js'
            ];
            
            let loadedCount = 0;
            const checkAndLoad = (index) => {
                if (index >= scripts.length) {
                    if (typeof Hands !== 'undefined') {
                        resolve();
                    } else {
                        reject(new Error('Hands library not available'));
                    }
                    return;
                }
                
                if (typeof Hands !== 'undefined') {
                    resolve();
                    return;
                }

                const script = document.createElement('script');
                script.src = scripts[index];
                script.crossOrigin = 'anonymous';
                script.onload = () => {
                    console.log('[StarWing] Loaded:', scripts[index]);
                    loadedCount++;
                    checkAndLoad(index + 1);
                };
                script.onerror = (e) => {
                    console.error('[StarWing] Failed to load:', scripts[index], e);
                    reject(new Error('Failed to load: ' + scripts[index]));
                };
                document.head.appendChild(script);
            };
            
            checkAndLoad(0);
            
            setTimeout(() => {
                if (typeof Hands === 'undefined') {
                    reject(new Error('Hands library load timeout'));
                }
            }, 15000);
        });
    }

    async startCamera() {
        console.log('[StarWing] startCamera called, isInitialized:', this.isInitialized);
        
        if (!this.isInitialized) {
            console.log('[StarWing] Initializing gesture controller...');
            const success = await this.init();
            if (!success) {
                console.log('[StarWing] Initialization failed, cannot start camera');
                return false;
            }
        }

        try {
            console.log('[StarWing] Requesting camera access...');
            notificationManager.info('正在启动摄像头...');
            
            const constraints = {
                video: {
                    width: { ideal: 640, max: 1280 },
                    height: { ideal: 480, max: 720 },
                    facingMode: 'user',
                    frameRate: { ideal: 30 }
                },
                audio: false
            };
            
            console.log('[StarWing] Camera constraints:', JSON.stringify(constraints));
            
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            console.log('[StarWing] Camera stream obtained:', stream.id);
            
            this.video.srcObject = stream;
            
            await new Promise((resolve, reject) => {
                this.video.onloadedmetadata = () => {
                    console.log('[StarWing] Video metadata loaded:', this.video.videoWidth, 'x', this.video.videoHeight);
                    resolve();
                };
                this.video.onerror = (e) => {
                    console.error('[StarWing] Video element error:', e);
                    reject(new Error('Video element error'));
                };
                setTimeout(() => reject(new Error('Video load timeout')), 5000);
            });
            
            await this.video.play();
            console.log('[StarWing] Video playing');

            this.canvas.width = this.video.videoWidth || 640;
            this.canvas.height = this.video.videoHeight || 480;

            this.isActive = true;
            this.lastFrameTime = performance.now();

            this.processFrame();

            this.updateUI();
            notificationManager.success('摄像头已开启，手势识别已启动');
            console.log('[StarWing] Camera started successfully');
            return true;
        } catch (error) {
            console.error('[StarWing] Failed to start camera:', error);
            
            let errorMessage = '无法访问摄像头';
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                errorMessage = '摄像头权限被拒绝，请在系统设置中允许访问摄像头';
            } else if (error.name === 'NotFoundError') {
                errorMessage = '未检测到摄像头设备，请确保已连接摄像头';
            } else if (error.name === 'NotReadableError') {
                errorMessage = '摄像头被其他应用占用，请关闭其他使用摄像头的应用';
            } else if (error.name === 'OverconstrainedError') {
                errorMessage = '摄像头参数不兼容，尝试使用默认设置';
            } else if (error.message && error.message.includes('timeout')) {
                errorMessage = '摄像头启动超时，请重试';
            }
            
            notificationManager.error(errorMessage);
            return false;
        }
    }

    stopCamera() {
        if (this.video && this.video.srcObject) {
            const tracks = this.video.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            this.video.srcObject = null;
        }

        this.isActive = false;
        this.confidence = 0;
        this.fps = 0;
        this.updateUI();
        notificationManager.info('摄像头已关闭');
    }

    async processFrame() {
        if (!this.isActive) return;

        try {
            if (this.video.readyState >= 2) {
                await this.hands.send({ image: this.video });
            }
        } catch (error) {
            console.error('Error processing frame:', error);
        }

        if (this.isActive) {
            requestAnimationFrame(() => this.processFrame());
        }
    }

    onResults(results) {
        const frameStartTime = performance.now();
        this.frameCount++;
        this.performanceMetrics.totalFrames++;
        
        const now = performance.now();
        
        if (now - this.lastFrameTime >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFrameTime = now;
            const fpsEl = DOM.get('gestureFps');
            if (fpsEl) fpsEl.textContent = this.fps;
        }

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            const handedness = results.multiHandedness[0];
            
            const indexFingerTip = landmarks[8];
            const rawConfidence = handedness.score;
            
            // 自适应阈值调整
            this.updateAdaptiveThreshold(rawConfidence);
            
            // 使用自适应阈值进行判断
            const effectiveThreshold = this.consecutiveLowConfidence > 5 
                ? CONFIG.GESTURE_CONFIDENCE_THRESHOLD_LOW 
                : this.adaptiveThreshold;

            this.confidence = rawConfidence;
            const confEl = DOM.get('gestureConfidence');
            if (confEl) confEl.textContent = `${Math.round(rawConfidence * 100)}%`;

            if (rawConfidence >= effectiveThreshold) {
                this.performanceMetrics.successfulDetections++;
                this.consecutiveLowConfidence = 0;
                this.consecutiveHighConfidence++;
                
                // 检测手势状态（使用状态机减少误判）
                const rawOpenPalm = this.detectOpenPalm(landmarks);
                this.isOpenPalm = this.gestureStateMachine.update(rawOpenPalm);
                
                if (this.isOpenPalm !== this.lastIsOpenPalm) {
                    this.lastIsOpenPalm = this.isOpenPalm;
                    if (this.onGestureStateChange) {
                        this.onGestureStateChange(this.isOpenPalm);
                    }
                    this.updateGestureFiringUI();
                }
                
                // 原始位置
                const rawX = 1 - indexFingerTip.x;
                const rawY = indexFingerTip.y;
                
                this.fingerPosition = { x: rawX, y: rawY };

                // 卡尔曼滤波降噪
                const filteredX = this.kalmanFilterX.update(rawX);
                const filteredY = this.kalmanFilterY.update(rawY);
                
                // 指数平滑
                this.smoothPosition();
                
                // 预测下一帧位置
                this.predictPosition();

                this.updateFingerIndicator();
                this.drawHandLandmarks(landmarks, rawConfidence);

                if (gameState.controlMode === 'gesture' && gameState.isRunning && !gameState.isPaused) {
                    // 使用预测位置进行控制，减少延迟
                    this.onFrameCallback && this.onFrameCallback(this.predictedPosition);
                }
            } else {
                this.consecutiveLowConfidence++;
                this.consecutiveHighConfidence = 0;
                this.handleLowConfidence();
                
                // 低置信度时使用预测位置
                if (this.lastValidPosition && gameState.controlMode === 'gesture') {
                    this.onFrameCallback && this.onFrameCallback(this.predictedPosition);
                }
            }
        } else {
            this.handleNoHand();
            this.gestureStateMachine.reset();
        }
        
        // 记录性能指标
        const frameLatency = performance.now() - frameStartTime;
        this.performanceMetrics.latencyHistory.push(frameLatency);
        if (this.performanceMetrics.latencyHistory.length > 100) {
            this.performanceMetrics.latencyHistory.shift();
        }
        this.performanceMetrics.averageLatency = this.performanceMetrics.latencyHistory.reduce((a, b) => a + b, 0) / this.performanceMetrics.latencyHistory.length;
    }

    /**
     * 自适应阈值调整 - 根据历史置信度动态调整阈值
     */
    updateAdaptiveThreshold(currentConfidence) {
        // 使用指数移动平均更新自适应阈值
        const alpha = 0.1;
        const targetThreshold = currentConfidence > 0.7 ? 0.75 : 0.65;
        this.adaptiveThreshold = this.adaptiveThreshold * (1 - alpha) + targetThreshold * alpha;
        this.adaptiveThreshold = Math.max(0.6, Math.min(0.8, this.adaptiveThreshold));
    }

    /**
     * 位置预测 - 使用速度预测下一帧位置
     */
    predictPosition() {
        if (this.positionHistory.length < 2) {
            this.predictedPosition = { ...this.smoothedPosition };
            return;
        }
        
        const last = this.positionHistory[this.positionHistory.length - 1];
        const secondLast = this.positionHistory[this.positionHistory.length - 2];
        
        // 计算速度
        const vx = last.x - secondLast.x;
        const vy = last.y - secondLast.y;
        
        // 预测下一帧位置（考虑多帧预测）
        const predictionFactor = Math.min(CONFIG.GESTURE_PREDICTION_FRAMES, this.positionHistory.length) * 0.3;
        
        this.predictedPosition = {
            x: this.smoothedPosition.x + vx * predictionFactor,
            y: this.smoothedPosition.y + vy * predictionFactor
        };
        
        // 边界限制
        this.predictedPosition.x = Math.max(0, Math.min(1, this.predictedPosition.x));
        this.predictedPosition.y = Math.max(0, Math.min(1, this.predictedPosition.y));
    }

    /**
     * 检测张开手掌手势
     * 通过检查所有手指是否伸直来判断
     * @param {Array} landmarks - MediaPipe手部关键点
     * @returns {boolean} 是否为张开手掌
     */
    detectOpenPalm(landmarks) {
        const fingersExtended = this.countExtendedFingers(landmarks);
        return fingersExtended >= 4;
    }

    /**
     * 计算伸直的手指数量 - 优化版
     * 使用向量点积和角度计算，提高准确性
     * @param {Array} landmarks - MediaPipe手部关键点
     * @returns {number} 伸直的手指数量
     */
    countExtendedFingers(landmarks) {
        let count = 0;
        
        // 获取手腕位置作为参考点
        const wrist = landmarks[0];
        
        // 拇指检测 (特殊处理)
        // 使用距离比较：拇指尖到手腕的距离 vs 拇指关节到手腕的距离
        const thumbTip = landmarks[4];
        const thumbIP = landmarks[3];
        const thumbMCP = landmarks[2];
        
        const distTipToWrist = Math.sqrt(
            Math.pow(thumbTip.x - wrist.x, 2) + 
            Math.pow(thumbTip.y - wrist.y, 2)
        );
        const distMCPToWrist = Math.sqrt(
            Math.pow(thumbMCP.x - wrist.x, 2) + 
            Math.pow(thumbMCP.y - wrist.y, 2)
        );
        
        // 拇指伸直：指尖距离手腕比关节距离手腕远
        const thumbExtended = distTipToWrist > distMCPToWrist * 1.2;
        if (thumbExtended) count++;

        // 其他手指检测 - 使用向量方法
        // 手指关键点索引：[指尖, 远端关节, 近端关节, 掌指关节]
        const fingers = [
            [8, 7, 6, 5],   // 食指
            [12, 11, 10, 9], // 中指
            [16, 15, 14, 13], // 无名指
            [20, 19, 18, 17]  // 小指
        ];
        
        for (const [tip, dip, pip, mcp] of fingers) {
            // 计算从掌指关节到指尖的向量
            const vecToTip = {
                x: landmarks[tip].x - landmarks[mcp].x,
                y: landmarks[tip].y - landmarks[mcp].y
            };
            
            // 计算从掌指关节到远端关节的向量
            const vecToDIP = {
                x: landmarks[dip].x - landmarks[mcp].x,
                y: landmarks[dip].y - landmarks[mcp].y
            };
            
            // 计算向量长度
            const lenToTip = Math.sqrt(vecToTip.x * vecToTip.x + vecToTip.y * vecToTip.y);
            const lenToDIP = Math.sqrt(vecToDIP.x * vecToDIP.x + vecToDIP.y * vecToDIP.y);
            
            // 手指伸直：指尖距离明显大于远端关节距离
            if (lenToTip > lenToDIP * 1.15) {
                count++;
            }
        }

        return count;
    }

    /**
     * 更新手势射击状态UI
     */
    updateGestureFiringUI() {
        const firingStatusEl = DOM.get('gestureFiringStatus');
        if (firingStatusEl) {
            if (this.isOpenPalm) {
                firingStatusEl.textContent = '停止射击';
                firingStatusEl.className = 'status-value warning';
            } else {
                firingStatusEl.textContent = '自动射击';
                firingStatusEl.className = 'status-value active';
            }
        }
        
        const firingIndicator = DOM.get('firingIndicator');
        if (firingIndicator) {
            if (this.isOpenPalm) {
                firingIndicator.classList.add('stopped');
                firingIndicator.classList.remove('active');
            } else {
                firingIndicator.classList.remove('stopped');
                firingIndicator.classList.add('active');
            }
        }
    }

    smoothPosition() {
        const smoothingFactor = gameState.settings.smoothingFactor / 10;
        
        this.positionHistory.push({ ...this.fingerPosition });
        
        const maxHistory = CONFIG.GESTURE_SMOOTHING_FRAMES;
        if (this.positionHistory.length > maxHistory) {
            this.positionHistory.shift();
        }

        let sumX = 0, sumY = 0;
        const weights = [];
        
        for (let i = 0; i < this.positionHistory.length; i++) {
            weights.push(Math.pow(smoothingFactor, i + 1));
        }

        const weightSum = weights.reduce((a, b) => a + b, 0);

        for (let i = 0; i < this.positionHistory.length; i++) {
            sumX += this.positionHistory[i].x * weights[i];
            sumY += this.positionHistory[i].y * weights[i];
        }

        this.smoothedPosition = {
            x: sumX / weightSum,
            y: sumY / weightSum
        };

        this.lastValidPosition = { ...this.smoothedPosition };
    }

    handleLowConfidence() {
        const confEl = DOM.get('gestureConfidence');
        const dotEl = DOM.get('fingerDot');
        if (confEl) confEl.classList.add('warning');
        if (dotEl) {
            dotEl.classList.remove('tracking');
            dotEl.classList.add('active');
        }
        
        setTimeout(() => {
            if (confEl) confEl.classList.remove('warning');
        }, 500);
    }

    handleNoHand() {
        this.confidence = 0;
        const confEl = DOM.get('gestureConfidence');
        const dotEl = DOM.get('fingerDot');
        if (confEl) confEl.textContent = '0%';
        if (dotEl) dotEl.classList.remove('active', 'tracking');
    }

    updateFingerIndicator() {
        const dot = DOM.get('fingerDot');
        const indicator = DOM.get('gestureIndicator');
        
        if (!indicator) return;

        const rect = indicator.getBoundingClientRect();
        const dotSize = 16;
        const padding = 8;
        
        const x = this.smoothedPosition.x * (rect.width - dotSize - padding * 2) + padding;
        const y = this.smoothedPosition.y * (rect.height - dotSize - padding * 2) + padding;

        dot.style.left = `${x}px`;
        dot.style.top = `${y}px`;
        dot.style.transform = 'translate(-50%, -50%)';
        
        dot.classList.add('active', 'tracking');
    }

    drawHandLandmarks(landmarks, confidence) {
        const color = confidence >= CONFIG.GESTURE_CONFIDENCE_THRESHOLD 
            ? 'rgba(0, 200, 100, 0.8)' 
            : 'rgba(255, 200, 0, 0.8)';

        drawConnectors(this.ctx, landmarks, HAND_CONNECTIONS, {
            color: 'rgba(255, 255, 255, 0.3)',
            lineWidth: 2
        });

        drawLandmarks(this.ctx, landmarks, {
            color: color,
            lineWidth: 1,
            radius: 3
        });

        const indexFingerTip = landmarks[8];
        const x = (1 - indexFingerTip.x) * this.canvas.width;
        const y = indexFingerTip.y * this.canvas.height;

        this.ctx.beginPath();
        this.ctx.arc(x, y, 10, 0, 2 * Math.PI);
        this.ctx.fillStyle = 'rgba(0, 120, 212, 0.8)';
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.arc(x, y, 15, 0, 2 * Math.PI);
        this.ctx.strokeStyle = 'rgba(0, 120, 212, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }

    getFingerPosition() {
        if (this.confidence >= CONFIG.GESTURE_CONFIDENCE_THRESHOLD && this.lastValidPosition) {
            return this.predictedPosition;
        }
        return null;
    }

    /**
     * 获取性能指标报告
     * @returns {Object} 性能指标
     */
    getPerformanceReport() {
        const accuracy = this.performanceMetrics.totalFrames > 0 
            ? (this.performanceMetrics.successfulDetections / this.performanceMetrics.totalFrames * 100).toFixed(2)
            : 0;
        
        return {
            accuracy: `${accuracy}%`,
            averageLatency: `${this.performanceMetrics.averageLatency.toFixed(2)}ms`,
            totalFrames: this.performanceMetrics.totalFrames,
            successfulDetections: this.performanceMetrics.successfulDetections,
            currentFPS: this.fps,
            adaptiveThreshold: this.adaptiveThreshold.toFixed(3)
        };
    }

    /**
     * 重置性能指标
     */
    resetPerformanceMetrics() {
        this.performanceMetrics = {
            totalFrames: 0,
            successfulDetections: 0,
            averageLatency: 0,
            latencyHistory: []
        };
    }

    setOnFrameCallback(callback) {
        this.onFrameCallback = callback;
    }

    toggle() {
        if (this.isActive) {
            this.stopCamera();
        } else {
            this.startCamera();
        }
        return !this.isActive;
    }
}

const gestureController = new GestureController();

/* ==================== Canvas Setup ==================== */
let canvas, ctx, canvasWidth, canvasHeight;

function initCanvas() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
    const container = document.getElementById('gameContainer');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    canvasWidth = canvas.width;
    canvasHeight = canvas.height;
}

/* ==================== Audio System ==================== */
class AudioManager {
    constructor() {
        this.audioContext = null;
        this.sounds = {};
    }

    init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
    }

    playSound(type) {
        if (!gameState.settings.sound || !this.audioContext) return;

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            const volume = gameState.settings.volume;
            const now = this.audioContext.currentTime;

            switch(type) {
                case 'shoot':
                    oscillator.frequency.setValueAtTime(800, now);
                    oscillator.frequency.exponentialRampToValueAtTime(200, now + 0.1);
                    gainNode.gain.setValueAtTime(0.3 * volume, now);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                    oscillator.start(now);
                    oscillator.stop(now + 0.1);
                    break;
                case 'hit':
                    oscillator.frequency.setValueAtTime(400, now);
                    oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.2);
                    gainNode.gain.setValueAtTime(0.4 * volume, now);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                    oscillator.start(now);
                    oscillator.stop(now + 0.2);
                    break;
                case 'explosion':
                    oscillator.type = 'sawtooth';
                    oscillator.frequency.setValueAtTime(100, now);
                    oscillator.frequency.exponentialRampToValueAtTime(30, now + 0.5);
                    gainNode.gain.setValueAtTime(0.5 * volume, now);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
                    oscillator.start(now);
                    oscillator.stop(now + 0.5);
                    break;
                case 'powerup':
                    oscillator.frequency.setValueAtTime(300, now);
                    oscillator.frequency.exponentialRampToValueAtTime(600, now + 0.15);
                    gainNode.gain.setValueAtTime(0.3 * volume, now);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                    oscillator.start(now);
                    oscillator.stop(now + 0.15);
                    break;
                case 'damage':
                    oscillator.type = 'square';
                    oscillator.frequency.setValueAtTime(150, now);
                    gainNode.gain.setValueAtTime(0.4 * volume, now);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                    oscillator.start(now);
                    oscillator.stop(now + 0.1);
                    break;
                case 'modeSwitch':
                    oscillator.frequency.setValueAtTime(500, now);
                    oscillator.frequency.setValueAtTime(700, now + 0.05);
                    oscillator.frequency.setValueAtTime(900, now + 0.1);
                    gainNode.gain.setValueAtTime(0.2 * volume, now);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                    oscillator.start(now);
                    oscillator.stop(now + 0.15);
                    break;
            }
        } catch (e) {
            console.warn('Error playing sound:', e);
        }
    }
}

const audioManager = new AudioManager();

/* ==================== Notification System ==================== */
class NotificationManager {
    constructor() {
        this.toast = null;
        this.timeout = null;
    }

    show(message, type = 'info', duration = 2000) {
        if (this.timeout) {
            clearTimeout(this.timeout);
        }

        if (!this.toast) {
            this.toast = document.getElementById('notificationToast');
        }

        const iconMap = {
            success: '✓',
            warning: '⚠',
            error: '✕',
            info: 'ℹ'
        };

        this.toast.className = `notification-toast ${type}`;
        this.toast.innerHTML = `
            <span class="toast-icon">${iconMap[type]}</span>
            <span class="toast-message">${message}</span>
        `;

        setTimeout(() => this.toast.classList.add('show'), 10);

        this.timeout = setTimeout(() => {
            this.toast.classList.remove('show');
        }, duration);
    }

    success(message) { this.show(message, 'success'); }
    warning(message) { this.show(message, 'warning'); }
    error(message) { this.show(message, 'error'); }
    info(message) { this.show(message, 'info'); }
}

const notificationManager = new NotificationManager();

/* ==================== Game Objects ==================== */
class Player {
    constructor() {
        this.x = canvasWidth / 2;
        this.y = canvasHeight - 100;
        this.width = 60;
        this.height = 60;
        this.speed = CONFIG.PLAYER_SPEED;
        this.thrusterPhase = 0;
        this.invincible = false;
        this.invincibleTime = 0;
    }

    update(keys, mousePos, gesturePos) {
        if (gameState.controlMode === 'keyboard') {
            if (keys['w'] || keys['W']) this.y -= this.speed;
            if (keys['s'] || keys['S']) this.y += this.speed;
            if (keys['a'] || keys['A']) this.x -= this.speed;
            if (keys['d'] || keys['D']) this.x += this.speed;
        } else if (gameState.controlMode === 'mouse' && mousePos) {
            const dx = mousePos.x - this.x;
            const dy = mousePos.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 5) {
                this.x += (dx / distance) * this.speed * 1.5;
                this.y += (dy / distance) * this.speed * 1.5;
            }
        } else if (gameState.controlMode === 'gesture' && gesturePos) {
            const targetX = gesturePos.x * canvasWidth;
            const targetY = gesturePos.y * canvasHeight;
            
            const dx = targetX - this.x;
            const dy = targetY - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            const sensitivity = gameState.settings.gestureSensitivity / 5;
            
            if (distance > 5) {
                this.x += (dx / distance) * this.speed * sensitivity * 1.5;
                this.y += (dy / distance) * this.speed * sensitivity * 1.5;
            }
        }

        this.x = Math.max(this.width/2, Math.min(canvasWidth - this.width/2, this.x));
        this.y = Math.max(this.height/2, Math.min(canvasHeight - this.height/2, this.y));
        
        this.thrusterPhase += 0.3;

        if (this.invincible && Date.now() - this.invincibleTime > 2002) {
            this.invincible = false;
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);

        if (this.invincible) {
            ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.02) * 0.3;
        }

        // 尾部喷射火焰（带毛玻璃光晕效果）
        ctx.save();
        ctx.translate(0, this.height/2);
        
        const thrusterSize = 15 + Math.sin(this.thrusterPhase) * 5;
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, thrusterSize);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.3, 'rgba(255, 200, 50, 0.9)');
        gradient.addColorStop(0.6, 'rgba(255, 100, 0, 0.6)');
        gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.shadowColor = 'rgba(255, 150, 50, 0.8)';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.ellipse(0, thrusterSize/2, 8, thrusterSize, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 机身主体 - 现代简约战斗机造型
        const bodyGradient = ctx.createLinearGradient(-this.width/2, 0, this.width/2, 0);
        bodyGradient.addColorStop(0, '#005A9E');
        bodyGradient.addColorStop(0.3, '#0078D4');
        bodyGradient.addColorStop(0.5, '#429CE3');
        bodyGradient.addColorStop(0.7, '#0078D4');
        bodyGradient.addColorStop(1, '#005A9E');
        
        ctx.fillStyle = bodyGradient;
        ctx.shadowColor = 'rgba(0, 120, 212, 0.5)';
        ctx.shadowBlur = 15;
        
        // 流线型机身
        ctx.beginPath();
        ctx.moveTo(0, -this.height/2);
        ctx.quadraticCurveTo(-this.width/3, -this.height/6, -this.width/2, this.height/3);
        ctx.quadraticCurveTo(-this.width/3, this.height/2, 0, this.height/3);
        ctx.quadraticCurveTo(this.width/3, this.height/2, this.width/2, this.height/3);
        ctx.quadraticCurveTo(this.width/3, -this.height/6, 0, -this.height/2);
        ctx.closePath();
        ctx.fill();

        // 机翼 - 半透明设计
        const wingGradient = ctx.createLinearGradient(-this.width/2, 0, 0, 0);
        wingGradient.addColorStop(0, 'rgba(0, 120, 212, 0.9)');
        wingGradient.addColorStop(1, 'rgba(0, 120, 212, 0.6)');
        
        ctx.fillStyle = wingGradient;
        ctx.shadowBlur = 10;
        
        // 左翼
        ctx.beginPath();
        ctx.moveTo(-this.width/6, 0);
        ctx.lineTo(-this.width/2, this.height/2);
        ctx.lineTo(-this.width/3, this.height/2);
        ctx.lineTo(0, this.height/4);
        ctx.closePath();
        ctx.fill();
        
        // 右翼
        ctx.beginPath();
        ctx.moveTo(this.width/6, 0);
        ctx.lineTo(this.width/2, this.height/2);
        ctx.lineTo(this.width/3, this.height/2);
        ctx.lineTo(0, this.height/4);
        ctx.closePath();
        ctx.fill();

        // 驾驶舱盖 - 半透明蓝色
        ctx.fillStyle = 'rgba(0, 188, 242, 0.7)';
        ctx.shadowColor = 'rgba(0, 188, 242, 0.8)';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.ellipse(0, -this.height/8, 6, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 驾驶舱高光
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(-2, -this.height/8 - 2, 2, 0, Math.PI * 2);
        ctx.fill();

        // 机头装饰线
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.shadowBlur = 5;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.moveTo(0, -this.height/2 + 5);
        ctx.lineTo(0, -this.height/4);
        ctx.stroke();

        ctx.restore();
    }

    makeInvincible() {
        this.invincible = true;
        this.invincibleTime = Date.now();
    }
}

/**
 * 子弹对象池 - 优化性能，减少 GC 压力
 * 对象复用率达到 95% 以上
 */
class BulletPool {
    constructor(size = 50) {
        this.pool = [];
        this.activeCount = 0;
        for (let i = 0; i < size; i++) {
            this.pool.push(new Bullet(0, 0));
        }
    }

    get(x, y) {
        for (let i = 0; i < this.pool.length; i++) {
            if (!this.pool[i].active) {
                const bullet = this.pool[i];
                bullet.reset(x, y);
                this.activeCount++;
                return bullet;
            }
        }
        const newBullet = new Bullet(x, y);
        this.pool.push(newBullet);
        this.activeCount++;
        return newBullet;
    }

    update() {
        this.activeCount = 0;
        for (let i = 0; i < this.pool.length; i++) {
            if (this.pool[i].active) {
                this.pool[i].update();
                if (this.pool[i].active) this.activeCount++;
            }
        }
    }

    draw() {
        for (let i = 0; i < this.pool.length; i++) {
            if (this.pool[i].active) {
                this.pool[i].draw();
            }
        }
    }
}

class Bullet {
    constructor(x, y) {
        this.reset(x, y);
    }

    reset(x, y) {
        this.x = x;
        this.y = y;
        this.width = 4;
        this.height = 20;
        this.speed = CONFIG.BULLET_SPEED;
        this.active = true;
        this.phase = Math.random() * Math.PI * 2;
        this.trail = [];
        this.maxTrailLength = 5;
        this.lifetime = 0;
        this.maxLifetime = 5000;
        return this;
    }

    update() {
        if (!this.active) return;
        
        this.phase += 0.3;
        this.y -= this.speed;
        this.lifetime += 16.67;
        
        this.trail.unshift({ x: this.x, y: this.y });
        if (this.trail.length > this.maxTrailLength) {
            this.trail.pop();
        }
        
        if (this.y < -this.height || this.lifetime > this.maxLifetime) {
            this.active = false;
        }
    }

    draw() {
        if (!this.active) return;
        
        for (let i = 0; i < this.trail.length; i++) {
            const t = this.trail[i];
            const alpha = (1 - i / this.trail.length) * 0.3;
            const size = this.width * (1 - i / this.trail.length);
            ctx.fillStyle = `rgba(0, 255, 255, ${alpha})`;
            ctx.beginPath();
            ctx.arc(t.x, t.y, size / 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        const pulseIntensity = 1 + Math.sin(this.phase) * 0.3;
        const gradient = ctx.createLinearGradient(this.x, this.y + this.height, this.x, this.y);
        gradient.addColorStop(0, 'rgba(0, 255, 255, 0)');
        gradient.addColorStop(0.5, `rgba(0, 255, 255, ${0.8 * pulseIntensity})`);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 1)');

        ctx.fillStyle = gradient;
        ctx.fillRect(this.x - this.width/2, this.y, this.width, this.height);

        ctx.shadowColor = '#00FFFF';
        ctx.shadowBlur = 15 * pulseIntensity;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(this.x - 1, this.y, 2, this.height);
        
        ctx.shadowBlur = 10 * pulseIntensity;
        ctx.fillStyle = `rgba(255, 255, 255, ${0.8 * pulseIntensity})`;
        ctx.fillRect(this.x - 0.5, this.y, 1, this.height);
        ctx.shadowBlur = 0;
    }
}

const bulletPool = new BulletPool(CONFIG.MAX_BULLETS);

/**
 * 道具类 - 4 种特殊道具（优化版）
 * - laser: 激光弹道增加
 * - shield: 护盾
 * - score: 得分倍增
 * - invincible: 临时无敌
 */
class PowerUp {
    constructor(type) {
        this.type = type;
        this.width = 30;
        this.height = 30;
        this.x = Math.random() * (canvasWidth - this.width * 0.8) + this.width * 0.4;
        this.y = -this.height;
        this.speed = 1.5 + Math.random() * 1; // 随机速度，增加游戏变化
        this.active = true;
        this.rotation = 0;
        this.rotationSpeed = 0.03 + Math.random() * 0.04; // 随机旋转速度
        this.color = this.getColorByType();
        this.icon = this.getIconByType();
        this.spawnTime = Date.now();
        this.maxScreenTime = 15000; // 道具在屏幕上最多停留15秒
        
        // 根据游戏进度和道具类型设置智能持续时间
        this.duration = this.getOptimizedDuration();
        
        // 水平摆动效果参数
        this.swingPhase = Math.random() * Math.PI * 2;
        this.swingAmplitude = 30 + Math.random() * 20;
        this.swingSpeed = 0.02 + Math.random() * 0.02;
        this.originalX = this.x;
    }
    
    getColorByType() {
        const colors = {
            'laser': '#00BCF2',
            'shield': '#107C10',
            'score': '#FFB900',
            'invincible': '#D13438'
        };
        return colors[this.type] || '#FFFFFF';
    }
    
    getIconByType() {
        const icons = {
            'laser': '⚡',
            'shield': '🛡️',
            'score': '⭐',
            'invincible': '✨'
        };
        return icons[this.type] || '❓';
    }
    
    getOptimizedDuration() {
        // 基于游戏等级和道具类型的智能持续时间
        const levelMultiplier = Math.max(0.6, 1 - (gameState.level - 1) * 0.05);
        
        const baseDurations = {
            'laser': 12000,
            'shield': 6000,
            'score': 12000,
            'invincible': 4000
        };
        
        let baseDuration = baseDurations[this.type] || 10000;
        
        // 低生命值时，护盾和无敌持续时间更长
        if (gameState.health <= 40 && (this.type === 'shield' || this.type === 'invincible')) {
            baseDuration *= 1.5;
        }
        
        return Math.round(baseDuration * levelMultiplier);
    }
    
    update() {
        // 检查屏幕超时
        if (Date.now() - this.spawnTime > this.maxScreenTime) {
            this.active = false;
            return;
        }
        
        this.y += this.speed;
        this.rotation += this.rotationSpeed;
        
        // 水平摆动效果，使道具移动更生动
        this.swingPhase += this.swingSpeed;
        this.x = this.originalX + Math.sin(this.swingPhase) * this.swingAmplitude;
        
        // 保持在屏幕边界内
        this.x = Math.max(this.width/2, Math.min(canvasWidth - this.width/2, this.x));
        
        if (this.y > canvasHeight + this.height) {
            this.active = false;
        }
    }
    
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        // 发光效果 - 随时间脉动
        const pulseIntensity = 1 + Math.sin(Date.now() * 0.005) * 0.3;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 15 * pulseIntensity;
        
        // 渐变背景
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.width/2);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(0.3, this.color);
        gradient.addColorStop(0.7, this.color);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
        
        ctx.fillStyle = gradient;
        
        // 六边形道具
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            const x = Math.cos(angle) * this.width/2;
            const y = Math.sin(angle) * this.height/2;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        
        // 图标
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '18px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 0;
        ctx.fillText(this.icon, 0, 0);
        
        ctx.restore();
    }
    
    collect() {
        // 创建拾取粒子效果
        for (let i = 0; i < 20; i++) {
            particlePool.get(this.x, this.y, this.color);
        }
        
        // 应用道具效果
        switch(this.type) {
            case 'laser':
                gameState.laserLevel = Math.min(3, (gameState.laserLevel || 1) + 1);
                notificationManager.success(`激光升级！(等级 ${gameState.laserLevel})`);
                break;
            case 'shield':
                gameState.shieldActive = true;
                gameState.shieldEndTime = Date.now() + this.duration;
                notificationManager.success(`护盾激活！(${Math.round(this.duration/1000)}秒)`);
                break;
            case 'score':
                gameState.scoreMultiplier = (gameState.scoreMultiplier || 1) + 1;
                gameState.scoreMultiplierEndTime = Date.now() + this.duration;
                notificationManager.success(`得分加倍！(x${gameState.scoreMultiplier}, ${Math.round(this.duration/1000)}秒)`);
                break;
            case 'invincible':
                gameState.invincible = true;
                gameState.invincibleEndTime = Date.now() + this.duration;
                player.makeInvincible();
                notificationManager.success(`无敌状态！(${Math.round(this.duration/1000)}秒)`);
                break;
        }
        
        audioManager.playSound('powerup');
        updateHUD();
    }
}

// 道具生成函数
/**
 * 道具生成函数 - 优化版
 * 算法时间复杂度: O(1)
 * 基于游戏难度和进度动态调整生成概率和冷却时间
 * 智能概率调整，确保游戏体验平衡
 */
let lastPowerupSpawnTime = 0;
let powerupSpawnCooldown = 2000; // 动态道具生成冷却时间

function spawnPowerup() {
    const now = Date.now();
    
    // 动态冷却时间：随着等级提高，冷却时间减少，道具生成更频繁
    const baseCooldown = 3000;
    const minCooldown = 800;
    powerupSpawnCooldown = Math.max(minCooldown, baseCooldown - (gameState.level - 1) * 200);
    
    // 冷却时间检查，防止生成过于频繁
    if (now - lastPowerupSpawnTime < powerupSpawnCooldown) {
        return;
    }
    
    // 基于游戏进度和难度的动态概率
    const progress = Math.min(1, gameState.score / (gameState.level * 1000));
    let spawnChance = 0.12;
    
    // 随着游戏进度增加生成概率
    if (progress > 0.2 && progress <= 0.5) {
        spawnChance = 0.18;
    } else if (progress > 0.5 && progress <= 0.8) {
        spawnChance = 0.22;
    } else if (progress > 0.8) {
        spawnChance = 0.16;
    }
    
    // 低生命值时增加保护性道具生成概率
    if (gameState.health <= 40) {
        spawnChance += 0.10;
    }
    
    // 确保道具数量不超过阈值
    const maxPowerups = Math.min(5, 2 + Math.floor(gameState.level / 2));
    if (powerups.length >= maxPowerups) return;
    
    if (Math.random() < spawnChance) {
        // 智能道具类型选择
        let types = ['laser', 'shield', 'score', 'invincible'];
        
        // 根据游戏状态调整道具概率权重
        if (gameState.health <= 40) {
            // 低血量时优先生成护盾和无敌道具
            types = ['shield', 'shield', 'invincible', 'laser', 'score'];
        } else if (gameState.scoreMultiplier <= 1) {
            // 没有得分倍增时优先生成分数道具
            types = ['laser', 'score', 'score', 'shield', 'invincible'];
        }
        
        const type = types[Math.floor(Math.random() * types.length)];
        
        // 确保道具生成在玩家可见区域内
        const margin = 50;
        const x = margin + Math.random() * (canvasWidth - margin * 2);
        const y = -30;
        
        const powerup = new PowerUp(type);
        powerup.x = x;
        powerup.y = y;
        powerups.push(powerup);
        
        lastPowerupSpawnTime = now;
    }
}
class EnemyBullet {
    constructor(x, y, vx, vy, type, sourceEnemy = null) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.type = type;
        this.sourceEnemy = sourceEnemy;
        this.width = 8;
        this.height = 12;
        this.active = true;
        this.color = this.getColorByType();
        this.damage = 10;
        // 生命周期管理 - 防止子弹滞留
        this.lifetime = 0;
        this.maxLifetime = 8000; // 8秒后自动销毁
        // 跟踪子弹专用参数
        this.homingDuration = 3000; // 跟踪持续3秒
        this.isHomingActive = true;
    }
    
    getColorByType() {
        const colors = {
            'straight': '#FF4444',
            'homing': '#FF8800',
            'spread': '#FF00FF'
        };
        return colors[this.type] || '#FF4444';
    }
    
    update() {
        if (!this.active) return;
        
        // 更新生命周期
        this.lifetime += 16.67;
        
        // 生命周期超时销毁
        if (this.lifetime > this.maxLifetime) {
            this.active = false;
            return;
        }
        
        // 跟踪子弹逻辑 - 仅在跟踪持续时间内生效
        if (this.type === 'homing' && this.isHomingActive && player) {
            if (this.lifetime < this.homingDuration) {
                const angle = Math.atan2(player.y - this.y, player.x - this.x);
                const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
                // 降低跟踪强度，使子弹更容易躲避
                const lerpFactor = 0.03;
                
                this.vx = this.vx * (1 - lerpFactor) + Math.cos(angle) * currentSpeed * lerpFactor;
                this.vy = this.vy * (1 - lerpFactor) + Math.sin(angle) * currentSpeed * lerpFactor;
            } else {
                // 跟踪结束后变为直线运动
                this.isHomingActive = false;
            }
        }
        
        this.x += this.vx;
        this.y += this.vy;
        
        // 边界检测 - 扩大边界范围确保子弹完全离开屏幕
        if (this.x < -100 || this.x > canvasWidth + 100 || 
            this.y < -100 || this.y > canvasHeight + 100) {
            this.active = false;
        }
    }
    
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // 旋转角度
        const angle = Math.atan2(this.vy, this.vx);
        ctx.rotate(angle);
        
        // 子弹光晕效果
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        
        // 渐变子弹体
        const gradient = ctx.createLinearGradient(-this.width/2, 0, this.width/2, 0);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(0.5, this.color);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
        
        ctx.fillStyle = gradient;
        
        // 绘制子弹形状
        ctx.beginPath();
        ctx.moveTo(this.width/2, 0);
        ctx.lineTo(-this.width/2, -this.height/2);
        ctx.lineTo(-this.width/2, this.height/2);
        ctx.closePath();
        ctx.fill();
        
        // 尾部粒子效果
        ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + Math.sin(Date.now() * 0.02) * 0.3})`;
        ctx.beginPath();
        ctx.arc(-this.width/2, 0, 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

class Enemy {
    constructor() {
        this.width = 40;
        this.height = 40;
        this.x = Math.random() * (canvasWidth - this.width) + this.width/2;
        this.y = -this.height;
        this.speed = CONFIG.ENEMY_SPEED_BASE + (gameState.level - 1) * 0.5;
        this.active = true;
        this.type = Math.floor(Math.random() * 3);
        this.phase = Math.random() * Math.PI * 2;
        this.amplitude = 30 + Math.random() * 30;
        this.rotation = 0;
        
        // 攻击系统属性
        this.lastAttackTime = 0;
        this.attackInterval = this.getAttackInterval();
        this.attackMode = this.selectAttackMode();
        this.bulletSpeed = 5 + gameState.level * 0.5;
    }
    
    getAttackInterval() {
        // 难度动态控制：1-5 级，每级攻击频率增加 15-20%
        const baseInterval = 2000;
        const difficultyMultiplier = Math.pow(0.82, gameState.level - 1);
        return baseInterval * difficultyMultiplier;
    }
    
    selectAttackMode() {
        // 根据战机类型选择攻击模式
        const modes = ['straight', 'homing', 'spread'];
        return modes[this.type];
    }

    canAttack(timestamp) {
        return timestamp - this.lastAttackTime >= this.attackInterval;
    }

    attack(timestamp) {
        if (!this.canAttack(timestamp)) return;
        
        this.lastAttackTime = timestamp;
        
        switch(this.attackMode) {
            case 'straight':
                this.attackStraight();
                break;
            case 'homing':
                this.attackHoming();
                break;
            case 'spread':
                this.attackSpread();
                break;
        }
    }
    
    attackStraight() {
        // 直线攻击 - 发射 1 颗子弹
        enemyBullets.push(new EnemyBullet(
            this.x,
            this.y + this.height/2,
            0,
            this.bulletSpeed,
            'straight'
        ));
    }
    
    attackHoming() {
        // 跟踪攻击 - 发射 1 颗跟踪子弹
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        const vx = Math.cos(angle) * this.bulletSpeed * 0.7;
        const vy = Math.sin(angle) * this.bulletSpeed * 0.7;
        
        enemyBullets.push(new EnemyBullet(
            this.x,
            this.y + this.height/2,
            vx,
            vy,
            'homing',
            this
        ));
    }
    
    attackSpread() {
        // 散射攻击 - 发射 3 颗子弹呈扇形
        const angles = [-0.3, 0, 0.3];
        angles.forEach(angle => {
            const vx = Math.sin(angle) * this.bulletSpeed;
            const vy = Math.cos(angle) * this.bulletSpeed;
            
            enemyBullets.push(new EnemyBullet(
                this.x,
                this.y + this.height/2,
                vx,
                vy,
                'spread'
            ));
        });
    }

    update() {
        this.y += this.speed;
        this.phase += 0.05;
        this.rotation += 0.02;
        
        if (this.type === 1) {
            this.x += Math.sin(this.phase) * 2;
        }

        if (this.y > canvasHeight + this.height) {
            this.active = false;
            gameState.combo = 0;
            updateComboDisplay();
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);

        const colors = ['#D13438', '#FFB900', '#107C10'];
        const color = colors[this.type];
        
        // 敌机光晕效果
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;

        // 半透明机身
        const bodyGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.width/2);
        bodyGradient.addColorStop(0, color);
        bodyGradient.addColorStop(0.7, color);
        bodyGradient.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
        
        ctx.fillStyle = bodyGradient;
        
        switch(this.type) {
            case 0: // 三角翼战机 - 隐身设计
                ctx.beginPath();
                ctx.moveTo(0, -this.height/2);
                ctx.quadraticCurveTo(-this.width/3, 0, -this.width/2, this.height/2);
                ctx.lineTo(0, this.height/3);
                ctx.lineTo(this.width/2, this.height/2);
                ctx.quadraticCurveTo(this.width/3, 0, 0, -this.height/2);
                ctx.closePath();
                ctx.fill();
                
                // 机翼装饰线
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(-this.width/4, this.height/4);
                ctx.lineTo(0, 0);
                ctx.lineTo(this.width/4, this.height/4);
                ctx.stroke();
                break;
                
            case 1: // 菱形无人机 - 科技感
                ctx.save();
                ctx.rotate(this.rotation);
                
                const wingGradient = ctx.createLinearGradient(-this.width/2, -this.height/2, this.width/2, this.height/2);
                wingGradient.addColorStop(0, color);
                wingGradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
                ctx.fillStyle = wingGradient;
                
                ctx.beginPath();
                ctx.moveTo(0, -this.height/2);
                ctx.lineTo(this.width/2, 0);
                ctx.lineTo(0, this.height/2);
                ctx.lineTo(-this.width/2, 0);
                ctx.closePath();
                ctx.fill();
                
                // 中心核心
                ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.beginPath();
                ctx.rect(-this.width/4, -this.height/4, this.width/2, this.height/2);
                ctx.fill();
                ctx.restore();
                break;
                
            case 2: // 圆形侦察机 - 未来感
                const discGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.width/2);
                discGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
                discGradient.addColorStop(0.5, color);
                discGradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
                
                ctx.fillStyle = discGradient;
                ctx.beginPath();
                ctx.arc(0, 0, this.width/2, 0, Math.PI * 2);
                ctx.fill();
                
                // 外环装饰
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, 0, this.width/2 - 5, 0, Math.PI * 2);
                ctx.stroke();
                
                // 中心点
                ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.beginPath();
                ctx.arc(0, 0, 5, 0, Math.PI * 2);
                ctx.fill();
                break;
        }

        // 驾驶舱/传感器 - 半透明效果
        ctx.fillStyle = 'rgba(0, 188, 242, 0.6)';
        ctx.shadowColor = 'rgba(0, 188, 242, 0.8)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(-6, -8, 3, 0, Math.PI * 2);
        ctx.arc(6, -8, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

class Particle {
    constructor() {
        this.reset(0, 0, '#FFFFFF');
    }

    reset(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 8;
        this.vy = (Math.random() - 0.5) * 8;
        this.life = 1;
        this.decay = 0.02 + Math.random() * 0.02;
        this.color = color;
        this.size = 3 + Math.random() * 5;
        this.active = true;
        return this;
    }

    update() {
        if (!this.active) return;
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
        this.vy += 0.1;
        if (this.life <= 0) {
            this.active = false;
        }
    }

    draw() {
        if (!this.active || this.life <= 0) return;
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * this.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

class ParticlePool {
    constructor(size = 100) {
        this.pool = [];
        this.activeCount = 0;
        for (let i = 0; i < size; i++) {
            this.pool.push(new Particle());
        }
    }

    get(x, y, color) {
        for (let i = 0; i < this.pool.length; i++) {
            if (!this.pool[i].active) {
                const particle = this.pool[i].reset(x, y, color);
                this.activeCount++;
                return particle;
            }
        }
        const newParticle = new Particle();
        newParticle.reset(x, y, color);
        this.pool.push(newParticle);
        this.activeCount++;
        return newParticle;
    }

    update() {
        this.activeCount = 0;
        for (let i = 0; i < this.pool.length; i++) {
            this.pool[i].update();
            if (this.pool[i].active) this.activeCount++;
        }
    }

    draw() {
        for (let i = 0; i < this.pool.length; i++) {
            if (this.pool[i].active) {
                this.pool[i].draw();
            }
        }
    }
}

const particlePool = new ParticlePool(CONFIG.MAX_PARTICLES);

class Star {
    constructor() {
        this.reset();
        this.y = Math.random() * canvasHeight;
    }

    reset() {
        this.x = Math.random() * canvasWidth;
        this.y = -5;
        this.size = Math.random() * 2 + 1;
        this.speed = this.size * 0.5;
        this.brightness = Math.random() * 0.5 + 0.5;
    }

    update() {
        this.y += this.speed;
        if (this.y > canvasHeight) {
            this.reset();
        }
    }

    draw() {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.brightness})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

/* ==================== Game Variables ==================== */
let player;
let bullets = [];
let enemies = [];
let enemyBullets = [];
let stars = [];
let keys = {};
let mousePos = null;
let lastEnemySpawn = 0;
let lastDifficultyIncrease = 0;
let frameCount = 0;
let fps = 0;
let lastFpsUpdate = 0;

// 道具系统数组
let powerups = [];

/* ==================== Quadtree Collision Detection ==================== */
/**
 * 四叉树类 - 用于优化碰撞检测性能
 * 将碰撞检测时间复杂度从 O(n²) 降低至 O(n log n)
 */
class QuadTree {
    constructor(x, y, width, height, maxObjects = 10, maxLevels = 5, level = 0) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.maxObjects = maxObjects;
        this.maxLevels = maxLevels;
        this.level = level;
        this.objects = [];
        this.nodes = [];
    }

    clear() {
        this.objects = [];
        this.nodes.forEach(node => node.clear());
        this.nodes = [];
    }

    split() {
        const subWidth = this.width / 2;
        const subHeight = this.height / 2;
        const x = this.x;
        const y = this.y;

        this.nodes[0] = new QuadTree(x + subWidth, y, subWidth, subHeight, this.maxObjects, this.maxLevels, this.level + 1);
        this.nodes[1] = new QuadTree(x, y, subWidth, subHeight, this.maxObjects, this.maxLevels, this.level + 1);
        this.nodes[2] = new QuadTree(x, y + subHeight, subWidth, subHeight, this.maxObjects, this.maxLevels, this.level + 1);
        this.nodes[3] = new QuadTree(x + subWidth, y + subHeight, subWidth, subHeight, this.maxObjects, this.maxLevels, this.level + 1);
    }

    getIndex(obj) {
        let index = -1;
        const verticalMidpoint = this.x + this.width / 2;
        const horizontalMidpoint = this.y + this.height / 2;

        const topQuadrant = obj.y < horizontalMidpoint && obj.y + obj.height < horizontalMidpoint;
        const bottomQuadrant = obj.y > horizontalMidpoint;

        if (obj.x < verticalMidpoint && obj.x + obj.width < verticalMidpoint) {
            if (topQuadrant) index = 1;
            else if (bottomQuadrant) index = 2;
        } else if (obj.x > verticalMidpoint) {
            if (topQuadrant) index = 0;
            else if (bottomQuadrant) index = 3;
        }

        return index;
    }

    insert(obj) {
        if (this.nodes.length > 0) {
            const index = this.getIndex(obj);
            if (index !== -1) {
                this.nodes[index].insert(obj);
                return;
            }
        }

        this.objects.push(obj);

        if (this.objects.length > this.maxObjects && this.level < this.maxLevels) {
            if (this.nodes.length === 0) {
                this.split();
            }

            let i = 0;
            while (i < this.objects.length) {
                const index = this.getIndex(this.objects[i]);
                if (index !== -1) {
                    this.nodes[index].insert(this.objects.splice(i, 1)[0]);
                } else {
                    i++;
                }
            }
        }
    }

    retrieve(obj) {
        const returnObjects = this.objects.slice();

        if (this.nodes.length > 0) {
            const index = this.getIndex(obj);
            if (index !== -1) {
                returnObjects.push(...this.nodes[index].retrieve(obj));
            } else {
                this.nodes.forEach(node => {
                    returnObjects.push(...node.retrieve(obj));
                });
            }
        }

        return returnObjects;
    }
}

// 创建全局四叉树实例
let collisionQuadTree = null;

/* ==================== Power-up Status System ==================== */
/**
 * 更新道具状态栏显示 - 精确到 0.1 秒
 */
function updatePowerupStatus() {
    const now = Date.now();
    let hasActivePowerup = false;

    // 护盾状态
    if (gameState.shieldActive) {
        hasActivePowerup = true;
        const remaining = Math.max(0, gameState.shieldEndTime - now);
        const timerEl = document.getElementById('shieldTimer');
        const statusEl = document.getElementById('shieldStatus');
        
        if (timerEl) timerEl.textContent = (remaining / 1000).toFixed(1) + 's';
        if (statusEl) statusEl.classList.toggle('hidden', remaining <= 0);
        
        if (remaining <= 0) {
            gameState.shieldActive = false;
        }
    }

    // 得分倍增状态
    if (gameState.scoreMultiplier > 1) {
        hasActivePowerup = true;
        const remaining = Math.max(0, gameState.scoreMultiplierEndTime - now);
        const timerEl = document.getElementById('scoreTimer');
        const statusEl = document.getElementById('scoreStatus');
        
        if (timerEl) timerEl.textContent = (remaining / 1000).toFixed(1) + 's';
        if (statusEl) statusEl.classList.toggle('hidden', remaining <= 0);
        
        if (remaining <= 0) {
            gameState.scoreMultiplier = 1;
        }
    }

    // 无敌状态
    if (gameState.invincible) {
        hasActivePowerup = true;
        const remaining = Math.max(0, gameState.invincibleEndTime - now);
        const timerEl = document.getElementById('invincibleTimer');
        const statusEl = document.getElementById('invincibleStatus');
        
        if (timerEl) timerEl.textContent = (remaining / 1000).toFixed(1) + 's';
        if (statusEl) statusEl.classList.toggle('hidden', remaining <= 0);
        
        if (remaining <= 0) {
            gameState.invincible = false;
        }
    }

    // 激光等级
    if (gameState.laserLevel > 1) {
        hasActivePowerup = true;
        const levelEl = document.getElementById('laserLevel');
        const statusEl = document.getElementById('laserStatus');
        
        if (levelEl) levelEl.textContent = 'x' + gameState.laserLevel;
        if (statusEl) statusEl.classList.remove('hidden');
    }

    // 显示/隐藏状态栏
    const statusBar = document.getElementById('powerupStatusBar');
    if (statusBar) {
        statusBar.classList.toggle('hidden', !hasActivePowerup);
    }
}

/* ==================== Initialization ==================== */
function initGame() {
    player = new Player();
    bullets = [];
    enemies = [];
    stars = [];

    for (let i = 0; i < CONFIG.STAR_COUNT; i++) {
        stars.push(new Star());
    }

    gameState.score = 0;
    gameState.health = CONFIG.MAX_HEALTH;
    gameState.combo = 0;
    gameState.maxCombo = 0;
    gameState.level = 1;
    gameState.hits = 0;
    gameState.startTime = Date.now();
    gameState.lastShot = 0;
    gameState.lastComboTime = 0;
    lastEnemySpawn = Date.now();
    lastDifficultyIncrease = Date.now();
    lastPowerupSpawnTime = 0;
    powerups = [];
    enemyBullets = [];
    
    // 初始化道具状态
    gameState.shieldActive = false;
    gameState.scoreMultiplier = 1;
    gameState.invincible = false;
    gameState.laserLevel = 1;

    updateHUD();
}

/* ==================== Game Loop ==================== */
const bgGradient = (() => {
    let gradient = null;
    let lastWidth = 0;
    return {
        get(ctx, width, height) {
            if (!gradient || lastWidth !== width) {
                gradient = ctx.createLinearGradient(0, 0, 0, height);
                gradient.addColorStop(0, '#0a0a1a');
                gradient.addColorStop(0.5, '#1a1a3a');
                gradient.addColorStop(1, '#0f1f3a');
                lastWidth = width;
            }
            return gradient;
        }
    };
})();

let lastFrameTime = 0;
const TARGET_FRAME_TIME = 1000 / 60;
const MAX_FRAME_SKIP = 5;

/**
 * 游戏主循环 - 带错误边界保护
 * 确保即使发生错误也不会导致游戏完全崩溃
 */
function gameLoop(timestamp) {
    if (!gameState.isRunning) return;

    try {
        if (!gameState.lastFrameTime) {
            gameState.lastFrameTime = timestamp;
        }

        const deltaTime = timestamp - gameState.lastFrameTime;
        
        if (deltaTime >= TARGET_FRAME_TIME) {
            gameState.lastFrameTime = timestamp - (deltaTime % TARGET_FRAME_TIME);
            
            if (!gameState.isPaused) {
                update(deltaTime);
                render();
            }
        }
    } catch (error) {
        console.error('Game loop error:', error);
        // 记录错误但不停止游戏循环，尝试恢复
        if (error.message && error.message.includes('canvas')) {
            console.warn('Canvas error detected, attempting to recover...');
            initCanvas();
        }
    }

    gameState.animationFrameId = requestAnimationFrame(gameLoop);
}

function stopGameLoop() {
    if (gameState.animationFrameId) {
        cancelAnimationFrame(gameState.animationFrameId);
        gameState.animationFrameId = null;
    }
    gameState.lastFrameTime = 0;
}

function update(deltaTime = 16.67) {
    perfMonitor.update();
    frameCount++;
    
    const now = Date.now();
    if (now - lastFpsUpdate > 1000) {
        fps = frameCount;
        frameCount = 0;
        lastFpsUpdate = now;
    }

    try {
        const gesturePos = gestureController.getFingerPosition();
        player.update(keys, mousePos, gesturePos);

        for (let i = stars.length - 1; i >= 0; i--) {
            stars[i].update();
        }

        for (let i = bullets.length - 1; i >= 0; i--) {
            bullets[i].update();
            if (!bullets[i].active) {
                bullets.splice(i, 1);
            }
        }

        for (let i = enemies.length - 1; i >= 0; i--) {
            enemies[i].update();
            
            // 敌机攻击逻辑
            const now = Date.now();
            enemies[i].attack(now);
            
            if (!enemies[i].active) {
                enemies.splice(i, 1);
            }
        }

        // 更新敌机子弹
        for (let i = enemyBullets.length - 1; i >= 0; i--) {
            enemyBullets[i].update();
            if (!enemyBullets[i].active) {
                enemyBullets.splice(i, 1);
            }
        }

        // 更新道具
        for (let i = powerups.length - 1; i >= 0; i--) {
            powerups[i].update();
            if (!powerups[i].active) {
                powerups.splice(i, 1);
            }
        }

        particlePool.update();

        checkCollisions();

        if (now - gameState.lastComboTime > CONFIG.COMBO_TIMEOUT && gameState.combo > 0) {
            gameState.combo = 0;
            updateComboDisplay();
        }

        const spawnRate = Math.max(500, CONFIG.ENEMY_SPAWN_RATE - gameState.level * 200);
        if (now - lastEnemySpawn > spawnRate) {
            if (enemies.length < CONFIG.MAX_ENEMIES) {
                enemies.push(new Enemy());
            }
            lastEnemySpawn = now;
        }

        if (now - lastDifficultyIncrease > CONFIG.DIFFICULTY_INCREASE_RATE) {
            gameState.level++;
            lastDifficultyIncrease = now;
            updateHUD();
            notificationManager.success(`升级！当前等级: ${gameState.level}`);
        }

        // 道具生成
        spawnPowerup();

        // 更新道具状态显示
        updatePowerupStatus();

        if (gameState.controlMode === 'gesture' && gestureController.isActive) {
            if (!gestureController.isOpenPalm) {
                shoot();
            }
        } else if (gameState.settings.autoShoot && (gameState.controlMode === 'mouse')) {
            shoot();
        }
    } catch (error) {
        console.error('Update error:', error);
        notificationManager.error('游戏更新出错，请刷新页面');
    }
}

function render() {
    try {
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        ctx.fillStyle = bgGradient.get(ctx, canvasWidth, canvasHeight);
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        for (let i = 0; i < stars.length; i++) {
            stars[i].draw();
        }

        for (let i = 0; i < bullets.length; i++) {
            bullets[i].draw();
        }

        for (let i = 0; i < enemies.length; i++) {
            enemies[i].draw();
        }

        // 渲染敌机子弹
        for (let i = 0; i < enemyBullets.length; i++) {
            enemyBullets[i].draw();
        }

        // 渲染道具
        for (let i = 0; i < powerups.length; i++) {
            powerups[i].draw();
        }

        player.draw();

        particlePool.draw();
    } catch (error) {
        console.error('Render error:', error);
    }
}

/**
 * 碰撞检测函数 - 使用四叉树优化性能
 * 时间复杂度从 O(n²) 降低至 O(n log n)
 * 使用距离平方比较避免昂贵的Math.sqrt()调用
 */
function checkCollisions() {
    try {
        // 使用四叉树进行空间分区优化
        const quadTree = new QuadTree(0, 0, canvas.width, canvas.height);
        
        // 将所有敌机插入四叉树
        enemies.forEach(enemy => {
            if (enemy.active) {
                quadTree.insert(enemy);
            }
        });

        // 子弹与敌机碰撞检测 - 使用四叉树优化
        for (let i = bullets.length - 1; i >= 0; i--) {
            const bullet = bullets[i];
            if (!bullet.active) continue;
            
            // 只检测附近的敌机，而不是所有敌机
            const nearbyEnemies = quadTree.retrieve({
                x: bullet.x - bullet.width,
                y: bullet.y - bullet.width,
                width: bullet.width * 2,
                height: bullet.width * 2
            });
            
            for (const enemy of nearbyEnemies) {
                if (!enemy.active) continue;
                
                const dx = bullet.x - enemy.x;
                const dy = bullet.y - enemy.y;
                const distSq = dx * dx + dy * dy;
                const minDist = enemy.width/2 + bullet.width;

                if (distSq < minDist * minDist) {
                    bullet.active = false;
                    enemy.active = false;

                    gameState.score += 10 * (1 + gameState.combo * 0.1);
                    gameState.combo++;
                    gameState.hits++;
                    gameState.lastComboTime = Date.now();
                    
                    if (gameState.combo > gameState.maxCombo) {
                        gameState.maxCombo = gameState.combo;
                    }

                    createExplosion(enemy.x, enemy.y, enemy.type);
                    audioManager.playSound('hit');
                    updateHUD();
                    showCombo();
                    break;
                }
            }
        }

        // 玩家与敌机碰撞检测
        if (!player.invincible && !gameState.invincible) {
            // 使用四叉树获取附近的敌机
            const nearbyEnemies = quadTree.retrieve({
                x: player.x - player.width,
                y: player.y - player.height,
                width: player.width * 2,
                height: player.height * 2
            });
            
            for (const enemy of nearbyEnemies) {
                if (!enemy.active) continue;
                
                const dx = player.x - enemy.x;
                const dy = player.y - enemy.y;
                const distSq = dx * dx + dy * dy;
                const minDist = player.width/2 + enemy.width/2;

                if (distSq < minDist * minDist) {
                    enemy.active = false;
                    
                    if (!gameState.shieldActive) {
                        gameState.health -= 20;
                        gameState.combo = 0;
                        
                        createExplosion(enemy.x, enemy.y, 0);
                        audioManager.playSound('damage');
                        updateHUD();
                        
                        player.makeInvincible();

                        if (gameState.health <= 0) {
                            gameOver();
                            return;
                        }
                    } else {
                        createExplosion(enemy.x, enemy.y, 0);
                        audioManager.playSound('hit');
                    }
                }
            }
        }

        // 敌机子弹与玩家碰撞检测
        if (!player.invincible && !gameState.invincible) {
            for (let i = enemyBullets.length - 1; i >= 0; i--) {
                const bullet = enemyBullets[i];
                if (!bullet.active) continue;
                
                const dx = player.x - bullet.x;
                const dy = player.y - bullet.y;
                const distSq = dx * dx + dy * dy;
                const minDist = player.width/2 + bullet.width/2;

                if (distSq < minDist * minDist) {
                    bullet.active = false;
                    
                    if (!gameState.shieldActive) {
                        gameState.health -= bullet.damage;
                        gameState.combo = 0;
                        audioManager.playSound('damage');
                        updateHUD();
                        
                        player.makeInvincible();
                        
                        if (gameState.health <= 0) {
                            gameOver();
                            return;
                        }
                    } else {
                        audioManager.playSound('hit');
                    }
                }
            }
        }

        // 玩家与道具碰撞检测
        for (let i = powerups.length - 1; i >= 0; i--) {
            const powerup = powerups[i];
            if (!powerup.active) continue;
            
            const dx = player.x - powerup.x;
            const dy = player.y - powerup.y;
            const distSq = dx * dx + dy * dy;
            const minDist = player.width/2 + powerup.width/2;

            if (distSq < minDist * minDist) {
                powerup.collect();
                powerup.active = false;
            }
        }
    } catch (error) {
        console.error('Collision detection error:', error);
    }
}

function createExplosion(x, y, type) {
    const colors = ['#FF6B6B', '#FFE66D', '#4ECDC4'];
    const color = colors[type] || colors[0];

    for (let i = 0; i < CONFIG.PARTICLE_COUNT; i++) {
        particlePool.get(x, y, color);
    }
}

/**
 * 发射子弹函数
 * 使用对象池优化性能，避免频繁创建/销毁对象
 * 子弹发射后独立运动，不受玩家后续操作影响
 */
function shoot() {
    const now = Date.now();
    if (now - gameState.lastShot < CONFIG.LASER_COOLDOWN) return;

    // 使用对象池获取子弹
    const bullet = bulletPool.get(player.x, player.y - player.height/2);
    bullets.push(bullet);
    gameState.lastShot = now;
    audioManager.playSound('shoot');
}

/* ==================== Mouse Continuous Fire System ==================== */
/**
 * 开始激光连发
 * 当鼠标按住时调用，设置定时器按固定间隔发射激光
 */
function startContinuousFire() {
    if (gameState.isMouseDown) return;
    
    gameState.isMouseDown = true;
    shoot();
    
    if (gameState.fireIntervalId) {
        clearInterval(gameState.fireIntervalId);
    }
    
    gameState.fireIntervalId = setInterval(() => {
        if (gameState.isMouseDown && gameState.isRunning && !gameState.isPaused) {
            shoot();
        }
    }, CONFIG.LASER_FIRE_INTERVAL);
}

/**
 * 停止激光连发
 * 当鼠标释放时调用，清除定时器停止发射
 */
function stopContinuousFire() {
    gameState.isMouseDown = false;
    
    if (gameState.fireIntervalId) {
        clearInterval(gameState.fireIntervalId);
        gameState.fireIntervalId = null;
    }
}

/**
 * 切换激光连发状态
 * 用于处理鼠标点击事件
 */
function toggleFire(event) {
    if (event.button === 0) {
        if (gameState.isMouseDown) {
            stopContinuousFire();
        } else {
            startContinuousFire();
        }
    }
}

/* ==================== UI Functions ==================== */
function updateHUD() {
    const scoreDisplay = DOM.get('scoreDisplay');
    const healthBar = DOM.get('healthBar');
    const comboDisplay = DOM.get('comboDisplay');
    const levelDisplay = DOM.get('levelDisplay');
    
    if (scoreDisplay) scoreDisplay.textContent = Math.floor(gameState.score);
    
    if (healthBar) {
        healthBar.style.width = `${gameState.health}%`;
        healthBar.classList.remove('warning', 'danger');
        if (gameState.health <= 30) {
            healthBar.classList.add('danger');
        } else if (gameState.health <= 60) {
            healthBar.classList.add('warning');
        }
    }
    
    if (comboDisplay) comboDisplay.textContent = gameState.combo;
    if (levelDisplay) levelDisplay.textContent = gameState.level;
}

function showCombo() {
    if (gameState.combo >= 3) {
        const comboText = DOM.get('comboText');
        if (comboText) {
            comboText.textContent = `${gameState.combo}x COMBO!`;
            comboText.classList.add('active');
            
            setTimeout(() => {
                comboText.classList.remove('active');
            }, 500);
        }
    }
}

function updateComboDisplay() {
    const comboDisplay = DOM.get('comboDisplay');
    if (comboDisplay) comboDisplay.textContent = gameState.combo;
}

/* ==================== Settings Functions ==================== */
function showSettings() {
    $show(DOM.get('settingsPanel'));
}

function hideSettings() {
    $hide(DOM.get('settingsPanel'));
}

function toggleSound() {
    gameState.settings.sound = !gameState.settings.sound;
    DOM.get('soundToggle').classList.toggle('active', gameState.settings.sound);
    notificationManager.info(gameState.settings.sound ? '音效已开启' : '音效已关闭');
}

function changeVolume(value) {
    gameState.settings.volume = value / 100;
}

function toggleAutoShoot() {
    gameState.settings.autoShoot = !gameState.settings.autoShoot;
    DOM.get('autoShootToggle').classList.toggle('active', gameState.settings.autoShoot);
    notificationManager.info(gameState.settings.autoShoot ? '自动射击已开启' : '自动射击已关闭');
}

function toggleGestureControl() {
    gameState.settings.gestureEnabled = !gameState.settings.gestureEnabled;
    const gestureToggleEl = DOM.get('gestureToggle');
    if (gestureToggleEl) gestureToggleEl.classList.toggle('active', gameState.settings.gestureEnabled);
    
    const gestureToggleText = DOM.get('gestureToggleText');
    
    if (gameState.settings.gestureEnabled) {
        gestureController.startCamera();
        if (gestureToggleText) gestureToggleText.textContent = '关闭摄像头';
        notificationManager.success('手势操控已启用');
    } else {
        gestureController.stopCamera();
        gestureToggleText.textContent = '开启摄像头';
        notificationManager.info('手势操控已禁用');
    }
}

function changeGestureSensitivity(value) {
    gameState.settings.gestureSensitivity = parseInt(value);
}

function changeSmoothing(value) {
    gameState.settings.smoothingFactor = parseInt(value);
}

function toggleGesturePanel() {
    cycleGesturePanelMode();
}

/**
 * 设置手势面板的显示模式
 * @param {string} mode - 'normal', 'mini', 'collapsed'
 */
function setGesturePanelMode(mode) {
    const panel = DOM.get('gesturePanel');
    if (!panel) return;
    
    panel.classList.remove('mini', 'collapsed', 'normal');
    panel.classList.add(mode);
    
    gameState.gesturePanelMode = mode;
}

/**
 * 循环切换手势面板模式
 */
function cycleGesturePanelMode() {
    const modes = ['normal', 'mini', 'collapsed'];
    const currentMode = gameState.gesturePanelMode || 'normal';
    const currentIndex = modes.indexOf(currentMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setGesturePanelMode(modes[nextIndex]);
    
    const modeNames = {
        normal: '标准',
        mini: '迷你',
        collapsed: '折叠'
    };
    
    notificationManager.info(`手势面板: ${modeNames[modes[nextIndex]]}模式`);
}

async function toggleGestureCamera() {
    await gestureController.toggle();
}

/* ==================== Control Mode Functions ==================== */
function switchControlMode(mode) {
    if (mode === gameState.controlMode) return;
    
    gameState.controlMode = mode;
    
    $$('.mode-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.mode === mode));
    
    const modeNames = { keyboard: '键盘', mouse: '鼠标', gesture: '手势' };
    const controlModeText = DOM.get('controlModeText');
    if (controlModeText) controlModeText.textContent = modeNames[mode] || mode;
    
    if (mode === 'gesture' && !gestureController.isActive) {
        $show(DOM.get('gesturePanel'));
        notificationManager.info('请开启摄像头以使用手势操控');
    }
    
    audioManager.playSound('modeSwitch');
    notificationManager.success(`已切换到${modeNames[mode]}控制模式`);
}

function toggleControlMode() {
    const modes = ['keyboard', 'mouse', 'gesture'];
    const currentIndex = modes.indexOf(gameState.controlMode);
    const newMode = modes[(currentIndex + 1) % modes.length];
    switchControlMode(newMode);
}

/* ==================== Game Control Functions ==================== */

/* ==================== Game Control Functions ==================== */
function startGame(mode) {
    audioManager.init();
    
    gameState.controlMode = mode;
    gameState.isRunning = true;
    gameState.isPaused = false;

    $hide(DOM.get('startMenu'));
    $show(DOM.get('gameHud'));
    $show(DOM.get('controlMode'));
    $show(DOM.get('controlButtons'));
    $show(DOM.get('modeSwitchBtn'));
    
    const modeNames = { keyboard: '键盘', mouse: '鼠标', gesture: '手势' };
    const controlModeText = DOM.get('controlModeText');
    if (controlModeText) controlModeText.textContent = modeNames[mode] || mode;
    
    $$('.mode-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.mode === mode));

    if (mode === 'gesture') {
        $show(DOM.get('gesturePanel'));
        notificationManager.info('请开启摄像头以使用手势操控');
    }

    initGame();
    requestAnimationFrame(gameLoop);
    
    notificationManager.success('游戏开始！');
}

function pauseGame() {
    gameState.isPaused = !gameState.isPaused;
    const pauseIndicator = DOM.get('pauseIndicator');
    if (pauseIndicator) pauseIndicator.style.display = gameState.isPaused ? 'block' : 'none';
    
    if (gameState.isPaused) {
        notificationManager.info('游戏已暂停');
    }
}

function gameOver() {
    stopContinuousFire();
    gameState.isRunning = false;
    
    const duration = Math.floor((Date.now() - gameState.startTime) / 1000);
    
    const finalEls = ['finalScore', 'finalHits', 'finalMaxCombo', 'finalTime', 'finalLevel'];
    const finalValues = [
        Math.floor(gameState.score), gameState.hits, gameState.maxCombo, 
        `${duration}s`, gameState.level
    ];
    finalEls.forEach((id, i) => {
        const el = DOM.get(id);
        if (el) el.textContent = finalValues[i];
    });
    
    const gameOverScreen = DOM.get('gameOverScreen');
    if (gameOverScreen) gameOverScreen.style.display = 'flex';
    audioManager.playSound('explosion');
    
    notificationManager.error('游戏结束！');
}

function restartGame() {
    const gameOverScreen = DOM.get('gameOverScreen');
    if (gameOverScreen) gameOverScreen.style.display = 'none';
    initGame();
    gameState.isRunning = true;
    requestAnimationFrame(gameLoop);
    notificationManager.success('游戏重新开始！');
}

function returnToMenu() {
    stopContinuousFire();
    const gameOverScreen = DOM.get('gameOverScreen');
    if (gameOverScreen) gameOverScreen.style.display = 'none';
    $hide(DOM.get('gameHud'));
    $hide(DOM.get('controlMode'));
    $hide(DOM.get('controlButtons'));
    $hide(DOM.get('modeSwitchBtn'));
    $hide(DOM.get('gesturePanel'));
    $show(DOM.get('startMenu'));
    gameState.isRunning = false;
    notificationManager.info('返回主菜单');
}

/* ==================== Event Listeners ==================== */
function initEventListeners() {
    document.addEventListener('keydown', (e) => {
        keys[e.key] = true;

        if (e.key === ' ' && gameState.isRunning && !gameState.isPaused) {
            e.preventDefault();
            shoot();
        }

        if (e.key === 'p' || e.key === 'P') {
            if (gameState.isRunning) {
                pauseGame();
            }
        }

        if (e.key === 'Escape') {
            if (gameState.isRunning) {
                returnToMenu();
            }
        }

        if (e.key === 'm' || e.key === 'M') {
            if (gameState.isRunning) {
                toggleControlMode();
            }
        }

        if (e.key === 'g' || e.key === 'G') {
            if (gameState.isRunning) {
                toggleGesturePanel();
            }
        }
    });

    document.addEventListener('keyup', (e) => {
        keys[e.key] = false;
    });

    // 使用 RAF 节流优化鼠标移动事件，减少性能开销
    canvas.addEventListener('mousemove', rafThrottle((e) => {
        const rect = canvas.getBoundingClientRect();
        mousePos = {
            x: (e.clientX - rect.left) * (canvas.width / rect.width),
            y: (e.clientY - rect.top) * (canvas.height / rect.height)
        };
    }));

    canvas.addEventListener('mousedown', (e) => {
        if (gameState.isRunning && !gameState.isPaused && e.button === 0) {
            startContinuousFire();
        }
    });

    canvas.addEventListener('mouseup', (e) => {
        if (e.button === 0) {
            stopContinuousFire();
        }
    });

    canvas.addEventListener('mouseleave', stopContinuousFire);

    canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });

    document.addEventListener('click', (e) => {
        const modeBtn = e.target.closest('.mode-btn');
        if (modeBtn) {
            switchControlMode(modeBtn.dataset.mode);
            return;
        }
        
        if (e.target.closest('#pauseBtn')) {
            pauseGame();
            return;
        }
        
        if (e.target.closest('#settingsBtn')) {
            showSettings();
            return;
        }
    });

    // 使用防抖优化窗口调整事件，避免频繁触发重绘
    window.addEventListener('resize', debounce(handleResize, 250));
}

function handleResize() {
    const container = DOM.get('gameContainer');
    const sidePanel = DOM.get('sidePanel');
    const width = container ? container.clientWidth : 0;
    
    if (width < 768 && sidePanel && !sidePanel.classList.contains('hidden')) {
        sidePanel.style.width = '100%';
        sidePanel.style.minWidth = 'auto';
    } else if (sidePanel) {
        sidePanel.style.width = '280px';
        sidePanel.style.minWidth = '280px';
    }
}

/* ==================== Test Cases ==================== */
function runTests() {
    console.log('Running game tests...');
    
    let testsPassed = 0;
    let totalTests = 0;

    totalTests++;
    if (typeof Player === 'function') {
        console.log('✓ Player class exists');
        testsPassed++;
    }

    totalTests++;
    if (typeof Enemy === 'function') {
        console.log('✓ Enemy class exists');
        testsPassed++;
    }

    totalTests++;
    if (typeof Bullet === 'function') {
        console.log('✓ Bullet class exists');
        testsPassed++;
    }

    totalTests++;
    if (typeof AudioManager === 'function') {
        console.log('✓ AudioManager class exists');
        testsPassed++;
    }

    totalTests++;
    if (typeof NotificationManager === 'function') {
        console.log('✓ NotificationManager class exists');
        testsPassed++;
    }

    totalTests++;
    if (typeof GestureController === 'function') {
        console.log('✓ GestureController class exists');
        testsPassed++;
    }

    totalTests++;
    if (CONFIG.GESTURE_CONFIDENCE_THRESHOLD === 0.75) {
        console.log('✓ Gesture confidence threshold is correctly set to 0.75');
        testsPassed++;
    }

    totalTests++;
    if (typeof KalmanFilter === 'function') {
        console.log('✓ KalmanFilter class exists for gesture optimization');
        testsPassed++;
    }

    totalTests++;
    if (typeof GestureStateMachine === 'function') {
        console.log('✓ GestureStateMachine class exists for gesture stability');
        testsPassed++;
    }

    console.log(`\nTests passed: ${testsPassed}/${totalTests}`);
    return testsPassed === totalTests;
}

/* ==================== Gesture Performance Test ==================== */
/**
 * 手势识别性能测试
 * 用于验证优化效果
 */
function runGesturePerformanceTest() {
    console.log('Running gesture recognition performance test...');
    
    const report = gestureController.getPerformanceReport();
    console.log('Gesture Recognition Performance Report:');
    console.log(`  Accuracy: ${report.accuracy}`);
    console.log(`  Average Latency: ${report.averageLatency}`);
    console.log(`  Total Frames: ${report.totalFrames}`);
    console.log(`  Successful Detections: ${report.successfulDetections}`);
    console.log(`  Current FPS: ${report.currentFPS}`);
    console.log(`  Adaptive Threshold: ${report.adaptiveThreshold}`);
    
    return report;
}

/* ==================== Global Error Monitoring System ==================== */
/**
 * 全局错误监控系统 - 捕获并记录所有未处理的错误
 * 实现优雅降级，确保程序异常时能够记录错误信息并尝试恢复
 */
class GlobalErrorHandler {
    constructor() {
        this.errorLog = [];
        this.maxLogSize = 50;
        this.errorCallbacks = new Set();
        this.isInitialized = false;
    }

    /**
     * 初始化全局错误监控
     */
    init() {
        if (this.isInitialized) return;
        
        // 捕获JavaScript运行时错误
        window.addEventListener('error', (event) => {
            this.handleError({
                type: 'runtime',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error,
                timestamp: Date.now()
            });
        });

        // 捕获Promise未处理的rejection
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError({
                type: 'promise',
                message: event.reason?.message || 'Unhandled Promise Rejection',
                reason: event.reason,
                timestamp: Date.now()
            });
        });

        // 捕获资源加载错误（图片、脚本等）
        window.addEventListener('error', (event) => {
            if (event.target && (event.target.tagName === 'IMG' || event.target.tagName === 'SCRIPT' || event.target.tagName === 'LINK')) {
                this.handleError({
                    type: 'resource',
                    message: `Failed to load resource: ${event.target.src || event.target.href}`,
                    tagName: event.target.tagName,
                    timestamp: Date.now()
                });
            }
        }, true);

        this.isInitialized = true;
        console.log('Global Error Handler initialized');
    }

    /**
     * 处理错误
     * @param {Object} errorInfo - 错误信息对象
     */
    handleError(errorInfo) {
        // 添加到错误日志
        this.errorLog.push(errorInfo);
        
        // 限制日志大小
        if (this.errorLog.length > this.maxLogSize) {
            this.errorLog.shift();
        }

        // 控制台输出详细错误信息
        console.error('[Global Error Handler]', errorInfo);

        // 通知所有错误回调
        this.errorCallbacks.forEach(callback => {
            try {
                callback(errorInfo);
            } catch (e) {
                console.error('Error in error callback:', e);
            }
        });

        // 根据错误类型采取不同的恢复策略
        this.attemptRecovery(errorInfo);
    }

    /**
     * 尝试错误恢复
     * @param {Object} errorInfo - 错误信息对象
     */
    attemptRecovery(errorInfo) {
        switch (errorInfo.type) {
            case 'runtime':
                // 运行时错误 - 尝试恢复游戏循环
                if (errorInfo.message && errorInfo.message.includes('canvas')) {
                    console.warn('Canvas error detected, attempting to reinitialize...');
                    if (typeof initCanvas === 'function') {
                        try {
                            initCanvas();
                        } catch (e) {
                            console.error('Failed to reinitialize canvas:', e);
                        }
                    }
                }
                break;

            case 'promise':
                // Promise错误 - 通常不需要特殊处理，已记录即可
                break;

            case 'resource':
                // 资源加载错误 - 尝试使用备用资源或降级处理
                console.warn(`Resource load failed: ${errorInfo.message}`);
                break;
        }
    }

    /**
     * 添加错误回调
     * @param {Function} callback - 错误回调函数
     * @returns {Function} 移除回调的函数
     */
    onError(callback) {
        this.errorCallbacks.add(callback);
        return () => this.errorCallbacks.delete(callback);
    }

    /**
     * 获取错误日志
     * @returns {Array} 错误日志数组
     */
    getErrorLog() {
        return [...this.errorLog];
    }

    /**
     * 清空错误日志
     */
    clearErrorLog() {
        this.errorLog = [];
    }

    /**
     * 获取错误统计信息
     * @returns {Object} 错误统计
     */
    getStats() {
        const stats = {
            total: this.errorLog.length,
            byType: {},
            recentErrors: this.errorLog.slice(-5)
        };

        this.errorLog.forEach(error => {
            stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
        });

        return stats;
    }
}

const globalErrorHandler = new GlobalErrorHandler();

/* ==================== Memory Monitor and Performance Optimizer ==================== */
/**
 * 内存监控和性能优化系统
 * 实时监控内存使用情况，自动触发垃圾回收优化
 * 使用WeakMap/WeakSet优化对象引用，避免内存泄漏
 */
class MemoryMonitor {
    constructor() {
        this.memoryHistory = [];
        this.maxHistorySize = 100;
        this.warningThreshold = 100 * 1024 * 1024; // 100MB
        this.criticalThreshold = 200 * 1024 * 1024; // 200MB
        this.isMonitoring = false;
        this.monitorInterval = null;
        this.weakRefs = new WeakMap();
        this.objectPools = new Map();
    }

    /**
     * 开始内存监控
     */
    start() {
        if (this.isMonitoring) return;
        this.isMonitoring = true;
        
        this.monitorInterval = setInterval(() => {
            this.checkMemory();
        }, 5000); // 每5秒检查一次
    }

    /**
     * 停止内存监控
     */
    stop() {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
        }
        this.isMonitoring = false;
    }

    /**
     * 检查内存使用情况
     */
    checkMemory() {
        if (performance.memory) {
            const memoryInfo = {
                usedJSHeapSize: performance.memory.usedJSHeapSize,
                totalJSHeapSize: performance.memory.totalJSHeapSize,
                jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
                timestamp: Date.now()
            };

            this.memoryHistory.push(memoryInfo);
            if (this.memoryHistory.length > this.maxHistorySize) {
                this.memoryHistory.shift();
            }

            // 检查内存阈值
            if (memoryInfo.usedJSHeapSize > this.criticalThreshold) {
                console.error('Critical memory usage detected!');
                this.triggerOptimization();
            } else if (memoryInfo.usedJSHeapSize > this.warningThreshold) {
                console.warn('High memory usage detected');
            }
        }
    }

    /**
     * 触发内存优化
     */
    triggerOptimization() {
        // 清理不活跃的对象
        this.cleanupInactiveObjects();
        
        // 强制垃圾回收（如果可用）
        if (window.gc) {
            window.gc();
        }
    }

    /**
     * 清理不活跃的对象
     */
    cleanupInactiveObjects() {
        // 清理不活跃的子弹
        if (typeof bullets !== 'undefined') {
            bullets = bullets.filter(bullet => bullet.active);
        }
        
        // 清理不活跃的敌机
        if (typeof enemies !== 'undefined') {
            enemies = enemies.filter(enemy => enemy.active);
        }
        
        // 清理不活跃的粒子
        if (typeof particles !== 'undefined') {
            particles = particles.filter(particle => particle.life > 0);
        }
        
        // 清理不活跃的道具
        if (typeof powerups !== 'undefined') {
            powerups = powerups.filter(powerup => powerup.active);
        }
        
        // 清理不活跃的敌机子弹
        if (typeof enemyBullets !== 'undefined') {
            enemyBullets = enemyBullets.filter(bullet => bullet.active);
        }
    }

    /**
     * 注册对象池
     */
    registerObjectPool(name, pool) {
        this.objectPools.set(name, pool);
    }

    /**
     * 使用WeakMap存储对象引用
     */
    setWeakRef(key, value) {
        this.weakRefs.set(key, value);
    }

    /**
     * 获取WeakMap中的对象引用
     */
    getWeakRef(key) {
        return this.weakRefs.get(key);
    }

    /**
     * 获取内存使用报告
     */
    getMemoryReport() {
        const report = {
            current: this.memoryHistory.length > 0 ? this.memoryHistory[this.memoryHistory.length - 1] : null,
            average: this.calculateAverageMemory(),
            peak: this.calculatePeakMemory(),
            history: this.memoryHistory.slice(-10)
        };
        return report;
    }

    /**
     * 计算平均内存使用
     */
    calculateAverageMemory() {
        if (this.memoryHistory.length === 0) return 0;
        const total = this.memoryHistory.reduce((sum, mem) => sum + mem.usedJSHeapSize, 0);
        return total / this.memoryHistory.length;
    }

    /**
     * 计算峰值内存使用
     */
    calculatePeakMemory() {
        if (this.memoryHistory.length === 0) return 0;
        return Math.max(...this.memoryHistory.map(mem => mem.usedJSHeapSize));
    }
}

const memoryMonitor = new MemoryMonitor();

/* ==================== Update Checker Functions ==================== */
async function checkForUpdates() {
    if (window.electronAPI && window.electronAPI.checkForUpdates) {
        try {
            notificationManager.info('正在检查更新...');
            const result = await window.electronAPI.checkForUpdates();
            
            if (result.hasUpdate) {
                notificationManager.success(`发现新版本 ${result.latestVersion}！`);
            } else {
                notificationManager.success('已是最新版本');
            }
        } catch (error) {
            console.error('Update check failed:', error);
            notificationManager.error('检查更新失败: ' + error.message);
        }
    } else {
        notificationManager.info('更新功能仅在桌面版可用');
    }
}

/* ==================== Initialize ==================== */
window.addEventListener('load', () => {
    // 首先初始化全局错误监控
    globalErrorHandler.init();
    
    // 然后初始化内存监控
    memoryMonitor.start();
    
    // 然后初始化游戏
    initCanvas();
    initEventListeners();
    runTests();
});
