// theme-system.js - Enhanced Theme System with Dynamic Backgrounds

// 테마 데이터 정의 (배경 스타일 포함)
const themes = {
    'default': {
        name: 'Default Purple',
        category: 'Default',
        description: 'Classic purple theme',
        colors: {
            primary: '#6366F1',
            surface: '#F8FAFC',
            accent: '#F59E0B'
        },
        backgroundStyle: 'elegant'
    },
    
    // Spring Themes
    'spring-blossom': {
        name: 'Spring Blossom',
        category: 'Spring',
        description: 'Cherry blossom pink with fresh green',
        colors: {
            primary: '#FFB6C1',
            surface: '#FFE4E6',
            accent: '#98FB98'
        },
        backgroundStyle: 'floral'
    },
    'spring-garden': {
        name: 'Spring Garden',
        category: 'Spring',
        description: 'Fresh garden greens',
        colors: {
            primary: '#90EE90',
            surface: '#F0FFF0',
            accent: '#FFE4B5'
        },
        backgroundStyle: 'nature'
    },
    'spring-sky': {
        name: 'Spring Sky',
        category: 'Spring',
        description: 'Clear blue sky with soft yellow',
        colors: {
            primary: '#87CEEB',
            surface: '#F0F8FF',
            accent: '#FFFFE0'
        },
        backgroundStyle: 'sky'
    },
    
    // Summer Themes
    'summer-ocean': {
        name: 'Summer Ocean',
        category: 'Summer',
        description: 'Turquoise ocean waves',
        colors: {
            primary: '#40E0D0',
            surface: '#E0FFFF',
            accent: '#FFF8DC'
        },
        backgroundStyle: 'ocean'
    },
    'summer-sunset': {
        name: 'Summer Sunset',
        category: 'Summer',
        description: 'Warm coral sunset',
        colors: {
            primary: '#FFA07A',
            surface: '#FFF5EE',
            accent: '#F0E68C'
        },
        backgroundStyle: 'sunset'
    },
    'summer-tropical': {
        name: 'Summer Tropical',
        category: 'Summer',
        description: 'Tropical paradise vibes',
        colors: {
            primary: '#20B2AA',
            surface: '#F0FFFF',
            accent: '#FFEFD5'
        },
        backgroundStyle: 'tropical'
    },
    
    // Autumn Themes
    'autumn-leaves': {
        name: 'Autumn Leaves',
        category: 'Autumn',
        description: 'Golden autumn leaves',
        colors: {
            primary: '#DEB887',
            surface: '#FDF5E6',
            accent: '#F4A460'
        },
        backgroundStyle: 'leaves'
    },
    'autumn-harvest': {
        name: 'Autumn Harvest',
        category: 'Autumn',
        description: 'Rich harvest colors',
        colors: {
            primary: '#CD853F',
            surface: '#FFF8DC',
            accent: '#FFE4B5'
        },
        backgroundStyle: 'harvest'
    },
    'autumn-golden': {
        name: 'Autumn Golden',
        category: 'Autumn',
        description: 'Golden hour warmth',
        colors: {
            primary: '#DAA520',
            surface: '#FFFAF0',
            accent: '#F5DEB3'
        },
        backgroundStyle: 'golden'
    },
    
    // Winter Themes
    'winter-snow': {
        name: 'Winter Snow',
        category: 'Winter',
        description: 'Soft winter snow',
        colors: {
            primary: '#B0E0E6',
            surface: '#F8F8FF',
            accent: '#E6E6FA'
        },
        backgroundStyle: 'snow'
    },
    'winter-frost': {
        name: 'Winter Frost',
        category: 'Winter',
        description: 'Crystalline frost',
        colors: {
            primary: '#AFEEEE',
            surface: '#F0FFFF',
            accent: '#F5F5DC'
        },
        backgroundStyle: 'frost'
    },
    'winter-crystal': {
        name: 'Winter Crystal',
        category: 'Winter',
        description: 'Ice crystal blue',
        colors: {
            primary: '#ADD8E6',
            surface: '#F0F8FF',
            accent: '#E6E6FA'
        },
        backgroundStyle: 'crystal'
    },
    
    // Special Themes
    'rainbow-pastel': {
        name: 'Rainbow Pastel',
        category: 'Special',
        description: 'Soft rainbow colors',
        colors: {
            primary: '#FFB3BA',
            surface: '#FFDFBA',
            accent: '#FFFFBA'
        },
        backgroundStyle: 'rainbow'
    },
    'lavender-dreams': {
        name: 'Lavender Dreams',
        category: 'Special',
        description: 'Dreamy lavender fields',
        colors: {
            primary: '#E6E6FA',
            surface: '#F8F8FF',
            accent: '#DDA0DD'
        },
        backgroundStyle: 'lavender'
    },
    'mint-fresh': {
        name: 'Mint Fresh',
        category: 'Special',
        description: 'Cool mint freshness',
        colors: {
            primary: '#98FB98',
            surface: '#F0FFF0',
            accent: '#AFEEEE'
        },
        backgroundStyle: 'mint'
    },
    'peach-cream': {
        name: 'Peach Cream',
        category: 'Special',
        description: 'Creamy peach delight',
        colors: {
            primary: '#FFEAA7',
            surface: '#FFF5EE',
            accent: '#FFE4E1'
        },
        backgroundStyle: 'peach'
    },
    'berry-blush': {
        name: 'Berry Blush',
        category: 'Special',
        description: 'Sweet berry blush',
        colors: {
            primary: '#FFB6C1',
            surface: '#FFF0F5',
            accent: '#F0E68C'
        },
        backgroundStyle: 'berry'
    }
};

// 현재 활성 테마
let currentTheme = 'default';

// 테마 시스템 초기화
function initThemeSystem() {
    createThemeSelector();
    updateThemePreview();
    addBackgroundAnimations();
}

// 테마 셀렉터 생성
function createThemeSelector() {
    const selector = document.getElementById('theme-selector');
    if (!selector) return;
    
    // 기본 옵션 추가
    selector.innerHTML = '<option value="">Choose a theme...</option>';
    
    // 카테고리별 그룹화
    const categories = {};
    Object.entries(themes).forEach(([key, theme]) => {
        if (!categories[theme.category]) {
            categories[theme.category] = [];
        }
        categories[theme.category].push({ key, theme });
    });
    
    // 옵션 그룹별로 추가
    Object.entries(categories).forEach(([category, themeList]) => {
        const optgroup = document.createElement('optgroup');
        optgroup.label = category;
        
        themeList.forEach(({ key, theme }) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = theme.name;
            optgroup.appendChild(option);
        });
        
        selector.appendChild(optgroup);
    });
    
    // 이벤트 리스너 추가
    selector.addEventListener('change', function() {
        if (this.value) {
            applyTheme(this.value);
        }
    });
}

// 테마 적용 함수 (강화된 배경 효과 포함)
function applyTheme(themeKey) {
    if (!themes[themeKey]) return;
    
    currentTheme = themeKey;
    const theme = themes[themeKey];
    const body = document.body;
    const bgPattern = document.querySelector('.bg-pattern');
    
    // 기존 테마 클래스 제거
    body.classList.forEach(cls => {
        if (cls.startsWith('theme-')) {
            body.classList.remove(cls);
        }
    });
    
    // 새 테마 클래스 추가 (default 테마는 클래스 없음)
    if (themeKey !== 'default') {
        body.classList.add(`theme-${themeKey}`);
    }
    
    // 강제로 body 배경색 설정 (CSS 변수가 제대로 로드되지 않을 경우 대비)
    const themeData = themes[themeKey];
    if (themeData && themeData.colors) {
        // 테마별 배경색 직접 설정
        const bodyBgColors = {
            'spring-blossom': '#FDF2F8',
            'spring-garden': '#F0FDF4',
            'spring-sky': '#F0F9FF',
            'summer-ocean': '#ECFEFF',
            'summer-sunset': '#FFF7ED',
            'summer-tropical': '#F0FDFA',
            'autumn-leaves': '#FFFBEB',
            'autumn-harvest': '#FEF3C7',
            'autumn-golden': '#FFFBEB',
            'winter-snow': '#F8FAFC',
            'winter-frost': '#ECFEFF',
            'winter-crystal': '#F0F9FF',
            'rainbow-pastel': '#FEF7FF',
            'lavender-dreams': '#FAF5FF',
            'mint-fresh': '#ECFDF5',
            'peach-cream': '#FFFBEB',
            'berry-blush': '#FDF2F8'
        };
        
        const containerBgColors = {
            'spring-blossom': '#FEFCFF',
            'spring-garden': '#FDFFFE',
            'spring-sky': '#FEFEFF',
            'summer-ocean': '#F8FFFF',
            'summer-sunset': '#FFFEFB',
            'summer-tropical': '#FAFFFF',
            'autumn-leaves': '#FFFEF8',
            'autumn-harvest': '#FFFCF0',
            'autumn-golden': '#FFFEF5',
            'winter-snow': '#FDFDFF',
            'winter-frost': '#F8FFFF',
            'winter-crystal': '#FAFEFF',
            'rainbow-pastel': '#FFFEFF',
            'lavender-dreams': '#FEFAFF',
            'mint-fresh': '#F8FFFC',
            'peach-cream': '#FFFEF6',
            'berry-blush': '#FEFAFC'
        };
        
        const bgColor = bodyBgColors[themeKey] || '#F1F5F9';
        const containerBg = containerBgColors[themeKey] || 'white';
        
        body.style.backgroundColor = bgColor;
        
        // 포스터 컨테이너 배경색도 강제 설정
        const container = document.querySelector('.container');
        if (container) {
            container.style.setProperty('background-color', containerBg, 'important');
        }
    } else {
        body.style.backgroundColor = '#F1F5F9';
        const container = document.querySelector('.container');
        if (container) {
            container.style.setProperty('background-color', 'white', 'important');
        }
    }
    
    // 배경 애니메이션 효과 추가
    if (bgPattern) {
        // 배경 전환 애니메이션
        bgPattern.style.opacity = '0';
        bgPattern.style.transform = 'scale(1.05)';
        
        setTimeout(() => {
            bgPattern.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
            bgPattern.style.opacity = '0.06';
            bgPattern.style.transform = 'scale(1)';
            
            // 특별한 테마별 효과
            applySpecialThemeEffects(themeKey, bgPattern);
        }, 100);
    }
    
    // 테마 프리뷰 업데이트
    updateThemePreview();
    
    console.log(`테마 적용됨: ${theme.name} (${theme.backgroundStyle} style)`);
}

// 특별한 테마별 효과 적용
function applySpecialThemeEffects(themeKey, bgPattern) {
    // 모든 특수 효과 클래스 제거
    bgPattern.classList.remove('rainbow-animated', 'seasonal-breeze', 'sparkle-effect');
    
    switch(themeKey) {
        case 'rainbow-pastel':
            bgPattern.classList.add('rainbow-animated');
            break;
        case 'spring-blossom':
        case 'spring-garden':
        case 'spring-sky':
            bgPattern.classList.add('seasonal-breeze');
            break;
        case 'winter-snow':
        case 'winter-frost':
        case 'winter-crystal':
            bgPattern.classList.add('sparkle-effect');
            break;
    }
}

// 배경 애니메이션 효과 추가
function addBackgroundAnimations() {
    // 동적 스타일 추가
    if (!document.getElementById('theme-animations')) {
        const style = document.createElement('style');
        style.id = 'theme-animations';
        style.textContent = `
            .rainbow-animated {
                animation: rainbow-float 8s ease-in-out infinite alternate !important;
            }
            
            .seasonal-breeze {
                animation: gentle-breeze 6s ease-in-out infinite alternate;
            }
            
            .sparkle-effect {
                animation: sparkle-shimmer 4s ease-in-out infinite alternate;
            }
            
            @keyframes gentle-breeze {
                0% { transform: translateX(0) translateY(0) rotate(0deg); }
                25% { transform: translateX(3px) translateY(-2px) rotate(0.5deg); }
                50% { transform: translateX(0) translateY(-3px) rotate(0deg); }
                75% { transform: translateX(-2px) translateY(-1px) rotate(-0.5deg); }
                100% { transform: translateX(0) translateY(0) rotate(0deg); }
            }
            
            @keyframes sparkle-shimmer {
                0% { opacity: 0.06; transform: scale(1); }
                50% { opacity: 0.1; transform: scale(1.02); }
                100% { opacity: 0.06; transform: scale(1); }
            }
        `;
        document.head.appendChild(style);
    }
}

// 랜덤 테마 적용 (개선된 애니메이션 포함)
function applyRandomTheme() {
    const themeKeys = Object.keys(themes);
    // 현재 테마 제외
    const availableThemes = themeKeys.filter(key => key !== currentTheme);
    const randomKey = availableThemes[Math.floor(Math.random() * availableThemes.length)];
    
    // 셀렉터 값 업데이트
    const selector = document.getElementById('theme-selector');
    if (selector) {
        selector.value = randomKey;
    }
    
    // 랜덤 테마 적용 전 특별한 효과
    const container = document.querySelector('.container');
    if (container) {
        container.style.transform = 'scale(0.98) rotate(1deg)';
        container.style.transition = 'all 0.3s ease';
        
        setTimeout(() => {
            applyTheme(randomKey);
            container.style.transform = 'scale(1) rotate(0deg)';
        }, 150);
    } else {
        applyTheme(randomKey);
    }
    
    // 랜덤 테마 적용 알림
    const theme = themes[randomKey];
    showThemeNotification(`🎨 ${theme.name} 테마가 적용되었습니다!`);
}

// 계절별 랜덤 테마 (강화된 계절감)
function applySeasonalTheme() {
    const currentMonth = new Date().getMonth() + 1; // 1-12
    let seasonalThemes = [];
    let seasonName = '';
    
    if (currentMonth >= 3 && currentMonth <= 5) {
        // 봄 (3-5월)
        seasonalThemes = Object.keys(themes).filter(key => 
            themes[key].category === 'Spring'
        );
        seasonName = '봄';
    } else if (currentMonth >= 6 && currentMonth <= 8) {
        // 여름 (6-8월)
        seasonalThemes = Object.keys(themes).filter(key => 
            themes[key].category === 'Summer'
        );
        seasonName = '여름';
    } else if (currentMonth >= 9 && currentMonth <= 11) {
        // 가을 (9-11월)
        seasonalThemes = Object.keys(themes).filter(key => 
            themes[key].category === 'Autumn'
        );
        seasonName = '가을';
    } else {
        // 겨울 (12, 1, 2월)
        seasonalThemes = Object.keys(themes).filter(key => 
            themes[key].category === 'Winter'
        );
        seasonName = '겨울';
    }
    
    // 계절 테마가 없으면 모든 테마에서 선택
    if (seasonalThemes.length === 0) {
        seasonalThemes = Object.keys(themes);
        seasonName = '특별한';
    }
    
    // 현재 테마 제외하고 랜덤 선택
    const availableThemes = seasonalThemes.filter(key => key !== currentTheme);
    if (availableThemes.length === 0) {
        availableThemes.push(...seasonalThemes);
    }
    
    const randomKey = availableThemes[Math.floor(Math.random() * availableThemes.length)];
    
    // 셀렉터 값 업데이트
    const selector = document.getElementById('theme-selector');
    if (selector) {
        selector.value = randomKey;
    }
    
    // 계절별 테마 적용 전 특별한 효과
    const bgPattern = document.querySelector('.bg-pattern');
    if (bgPattern) {
        bgPattern.style.filter = 'blur(2px)';
        bgPattern.style.transition = 'all 0.4s ease';
        
        setTimeout(() => {
            applyTheme(randomKey);
            bgPattern.style.filter = 'blur(0)';
        }, 200);
    } else {
        applyTheme(randomKey);
    }
    
    const theme = themes[randomKey];
    showThemeNotification(`${getSeasonEmoji(seasonName)} ${seasonName} 테마: ${theme.name}이 적용되었습니다!`);
}

// 계절별 이모지 반환
function getSeasonEmoji(season) {
    const emojis = {
        '봄': '🌸',
        '여름': '🌞',
        '가을': '🍂',
        '겨울': '❄️',
        '특별한': '✨'
    };
    return emojis[season] || '🎨';
}

// 테마 프리뷰 업데이트 (강화됨)
function updateThemePreview() {
    const preview = document.getElementById('theme-preview');
    if (!preview || currentTheme === '') return;
    
    const theme = themes[currentTheme];
    if (!theme) return;
    
    // 컬러 도트 생성
    const colorDots = preview.querySelector('.theme-color-dots');
    if (colorDots) {
        colorDots.innerHTML = '';
        
        Object.values(theme.colors).forEach((color, index) => {
            const dot = document.createElement('div');
            dot.className = 'theme-color-dot';
            dot.style.backgroundColor = color;
            dot.style.animationDelay = `${index * 0.1}s`;
            dot.style.animation = 'colorPulse 2s ease-in-out infinite alternate';
            colorDots.appendChild(dot);
        });
    }
    
    // 설명 업데이트
    const description = preview.querySelector('.theme-description');
    if (description) {
        description.textContent = `${theme.description} (${theme.backgroundStyle} style)`;
    }
    
    // 프리뷰 표시
    preview.classList.add('show');
    
    // 컬러 도트 애니메이션 추가
    if (!document.getElementById('color-dot-animation')) {
        const style = document.createElement('style');
        style.id = 'color-dot-animation';
        style.textContent = `
            @keyframes colorPulse {
                0% { transform: scale(1); box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); }
                100% { transform: scale(1.1); box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2); }
            }
        `;
        document.head.appendChild(style);
    }
}

// 테마 알림 표시 (개선된 디자인)
function showThemeNotification(message) {
    // 기존 알림 제거
    const existingNotification = document.querySelector('.theme-notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // 새 알림 생성
    const notification = document.createElement('div');
    notification.className = 'theme-notification';
    notification.style.cssText = `
        position: fixed;
        top: 30px;
        right: 30px;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(15px);
        border: 2px solid var(--primary);
        border-radius: 16px;
        padding: 20px 24px;
        box-shadow: 
            0 10px 25px rgba(0, 0, 0, 0.1),
            0 0 0 1px rgba(255, 255, 255, 0.8);
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--text);
        z-index: 10000;
        animation: slideInRight 0.4s cubic-bezier(0.2, 0, 0.2, 1);
        max-width: 320px;
        transform-origin: right center;
    `;
    
    notification.textContent = message;
    
    // 애니메이션 스타일 추가
    if (!document.getElementById('theme-notification-style')) {
        const style = document.createElement('style');
        style.id = 'theme-notification-style';
        style.textContent = `
            @keyframes slideInRight {
                from {
                    opacity: 0;
                    transform: translateX(100px) scale(0.8);
                }
                to {
                    opacity: 1;
                    transform: translateX(0) scale(1);
                }
            }
            @keyframes slideOutRight {
                from {
                    opacity: 1;
                    transform: translateX(0) scale(1);
                }
                to {
                    opacity: 0;
                    transform: translateX(100px) scale(0.8);
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // 4초 후 자동 제거
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.4s cubic-bezier(0.4, 0, 1, 1)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 400);
        }
    }, 4000);
}

// 테마 데이터 확장을 위한 함수 (나중에 사용)
function addCustomTheme(key, themeData) {
    themes[key] = themeData;
    createThemeSelector(); // 셀렉터 재생성
    console.log(`새 테마 추가됨: ${themeData.name} (${themeData.backgroundStyle} style)`);
}

// 현재 테마 정보 반환
function getCurrentTheme() {
    return {
        key: currentTheme,
        data: themes[currentTheme]
    };
}

// 테마 목록 반환 (카테고리별)
function getThemesByCategory(category) {
    return Object.entries(themes)
        .filter(([key, theme]) => theme.category === category)
        .reduce((acc, [key, theme]) => {
            acc[key] = theme;
            return acc;
        }, {});
}

// 초기화 함수 - DOM이 로드된 후 호출
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        initThemeSystem();
        console.log('Enhanced Theme System with Dynamic Backgrounds initialized! 🎨');
    }, 100);
});