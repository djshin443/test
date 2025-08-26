let patterns = [];
let patternCounter = 0;
let examplesVisible = false;
let activeCalendar = null;
let currentCalendarDate = new Date();
let currentFontSize = 1.0; // 전체 폰트 크기 (옵션)
let selectedTextInfo = null;
let activeElement = null;
let panelSelectedTextInfo = null;

// 텍스트 선택 감지 및 패널 업데이트
document.addEventListener('mouseup', function(e) {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    let targetElement = null;
    let isValidTarget = false;
    
    if (selectedText && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const container = range.commonAncestorContainer;
        
        if (container.nodeType === Node.TEXT_NODE) {
            targetElement = container.parentElement;
        } else {
            targetElement = container;
        }
        
        let currentElement = targetElement;
        while (currentElement && currentElement !== document.body) {
            if (currentElement.classList && 
                (currentElement.classList.contains('pattern-display') || 
                 currentElement.classList.contains('examples-display'))) {
                targetElement = currentElement;
                isValidTarget = true;
                break;
            }
            currentElement = currentElement.parentElement;
        }
    }
    
    updateTextSelectionPanel(selectedText, selection, targetElement, isValidTarget);
});

function updateTextSelectionPanel(selectedText, selection, element, isValid) {
    const infoDiv = document.getElementById('selected-text-info');
    const previewDiv = document.getElementById('selected-text-preview');
    const boldBtn = document.getElementById('bold-btn');
    const clearBtn = document.getElementById('clear-btn');
    const colorBtns = document.querySelectorAll('.color-btn');
    
    if (selectedText && isValid && selection.rangeCount > 0) {
        panelSelectedTextInfo = {
            selection: selection,
            range: selection.getRangeAt(0).cloneRange(),
            element: element,
            text: selectedText
        };
        
        infoDiv.style.display = 'block';
        previewDiv.textContent = selectedText.length > 30 ? 
            selectedText.substring(0, 30) + '...' : selectedText;
        
        boldBtn.disabled = false;
        clearBtn.disabled = false;
        colorBtns.forEach(btn => {
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
            btn.style.pointerEvents = 'auto';
        });
    } else {
        panelSelectedTextInfo = null;
        infoDiv.style.display = 'none';
        previewDiv.textContent = 'No text selected';
        
        boldBtn.disabled = true;
        clearBtn.disabled = true;
        colorBtns.forEach(btn => {
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
            btn.style.pointerEvents = 'none';
        });
    }
}

// 패널에서 볼드 적용
function applyBoldFromPanel() {
    if (!panelSelectedTextInfo) {
        console.log('선택된 텍스트 정보가 없습니다.');
        return;
    }
    
    try {
        const range = panelSelectedTextInfo.range;
        const text = panelSelectedTextInfo.text;
        
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        
        const span = document.createElement('span');
        span.textContent = text;
        span.classList.add('text-bold');
        
        range.deleteContents();
        range.insertNode(span);
        
        updatePatternFromElement(panelSelectedTextInfo.element);
        selection.removeAllRanges();
        updateTextSelectionPanel('', null, null, false);
        
        console.log('볼드 포맷팅 적용 완료');
    } catch (error) {
        console.error('볼드 포맷팅 오류:', error);
    }
}

// 패널에서 색상 적용
function applyColorFromPanel(color) {
    if (!panelSelectedTextInfo) {
        console.log('선택된 텍스트 정보가 없습니다.');
        return;
    }
    
    try {
        const range = panelSelectedTextInfo.range;
        const text = panelSelectedTextInfo.text;
        
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        
        const span = document.createElement('span');
        span.textContent = text;
        span.style.color = color;
        
        range.deleteContents();
        range.insertNode(span);
        
        updatePatternFromElement(panelSelectedTextInfo.element);
        selection.removeAllRanges();
        updateTextSelectionPanel('', null, null, false);
        
        console.log('색상 포맷팅 적용 완료:', color);
    } catch (error) {
        console.error('색상 포맷팅 오류:', error);
    }
}

// 패널에서 서식 제거
function clearFormattingFromPanel() {
    if (!panelSelectedTextInfo) {
        console.log('선택된 텍스트 정보가 없습니다.');
        return;
    }
    
    try {
        const range = panelSelectedTextInfo.range;
        const text = panelSelectedTextInfo.text;
        
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        
        range.deleteContents();
        range.insertNode(document.createTextNode(text));
        
        updatePatternFromElement(panelSelectedTextInfo.element);
        selection.removeAllRanges();
        updateTextSelectionPanel('', null, null, false);
        
        console.log('서식 제거 완료');
    } catch (error) {
        console.error('서식 제거 오류:', error);
    }
}

// 전체 폰트 크기 조절 함수 (옵션)
function adjustFontSize(delta) {
    const newSize = Math.max(0.5, Math.min(3.0, currentFontSize + delta));
    setFontSize(newSize);
}

function setFontSize(size) {
    size = parseFloat(size);
    if (isNaN(size) || size < 0.5 || size > 3.0) return;

    currentFontSize = size;
    document.getElementById('font-size-input').value = size.toFixed(1);
    document.documentElement.style.setProperty('--current-font-size', size);

    patterns.forEach(pattern => adjustCardSize(pattern.id));
}

// 개별 패턴 글씨 크기 조절 함수
function adjustPatternFontSize(patternId, delta) {
    const pattern = patterns.find(p => p.id === patternId);
    if (!pattern) return;
    
    if (!pattern.fontSize) pattern.fontSize = 1.0;
    
    const newSize = Math.max(0.5, Math.min(2.0, pattern.fontSize + delta));
    setPatternFontSize(patternId, newSize);
}

function setPatternFontSize(patternId, size) {
    const pattern = patterns.find(p => p.id === patternId);
    const card = document.getElementById(`pattern-${patternId}`);
    if (!pattern || !card) return;
    
    size = parseFloat(size);
    if (isNaN(size) || size < 0.5 || size > 2.0) return;
    
    pattern.fontSize = size;
    
    // 기존 폰트 크기 클래스 제거
    const fontSizeClasses = [
        'pattern-font-size-0-5', 'pattern-font-size-0-6', 'pattern-font-size-0-7',
        'pattern-font-size-0-8', 'pattern-font-size-0-9', 'pattern-font-size-1-0',
        'pattern-font-size-1-1', 'pattern-font-size-1-2', 'pattern-font-size-1-3',
        'pattern-font-size-1-4', 'pattern-font-size-1-5', 'pattern-font-size-1-6',
        'pattern-font-size-1-7', 'pattern-font-size-1-8', 'pattern-font-size-1-9',
        'pattern-font-size-2-0'
    ];
    
    fontSizeClasses.forEach(cls => card.classList.remove(cls));
    
    // 새로운 폰트 크기 클래스 추가
    const sizeStr = size.toFixed(1).replace('.', '-');
    card.classList.add(`pattern-font-size-${sizeStr}`);
    
    // 표시 업데이트
    const display = document.getElementById(`pattern-font-display-${patternId}`);
    if (display) {
        display.textContent = size.toFixed(1);
    }
    
    adjustCardSize(patternId);
}

function updatePatternFromElement(element) {
    const isPattern = element.classList.contains('pattern-display');
    const isExamples = element.classList.contains('examples-display');

    if (!isPattern && !isExamples) return;

    const elementId = element.id;
    const matches = elementId.match(/(\d+)/);
    if (!matches) return;

    const patternId = parseInt(matches[1]);
    const pattern = patterns.find(p => p.id === patternId);
    if (!pattern) return;

    if (isPattern) {
        pattern.patternHTML = element.innerHTML;
    } else if (isExamples) {
        pattern.examplesHTML = element.innerHTML;
    }
}

// XSS 방지 함수들
function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function sanitizeInput(input) {
    if (typeof input !== 'string') return '';

    const dangerousPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
        /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
        /<link\b[^>]*>/gi,
        /<meta\b[^>]*>/gi,
        /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi
    ];

    let sanitized = input;
    dangerousPatterns.forEach(pattern => {
        sanitized = sanitized.replace(pattern, '');
    });

    return escapeHTML(sanitized).substring(0, 500);
}

// 날짜 관련 함수들
function formatDateToYYMMDD(date) {
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayOfWeek = dayNames[date.getDay()];
    return `${year}.${month}.${day} (${dayOfWeek})`;
}

function parseYYMMDDToDate(dateStr) {
    const dateOnly = dateStr.split(' ')[0];
    const parts = dateOnly.split('.');
    if (parts.length !== 3) return new Date();
    const year = 2000 + parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const day = parseInt(parts[2]);
    return new Date(year, month, day);
}

function validateDateFormat(dateStr) {
    const regexWithDay = /^\d{2}.\d{2}.\d{2} \([A-Za-z]{3}\)$/;
    const regexWithoutDay = /^\d{2}.\d{2}.\d{2}$/;
    if (!regexWithDay.test(dateStr) && !regexWithoutDay.test(dateStr)) {
        return false;
    }
    const date = parseYYMMDDToDate(dateStr);
    return !isNaN(date.getTime());
}

function updateDate() {
    const now = new Date();
    const options = { month: 'short', day: 'numeric' };
    const dateStr = now.toLocaleDateString('en-US', options);
    const year = now.getFullYear();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[now.getDay()];
    const formattedDate = `${dateStr}, ${year} - ${dayName}`;
    
    const updateBadge = () => {
        const badge = document.getElementById('date-badge');
        if (badge) {
            badge.textContent = formattedDate;
            console.log('날짜 배지 업데이트 성공:', formattedDate);
        } else {
            console.log('date-badge 요소를 찾을 수 없음');
            setTimeout(updateBadge, 1000);
        }
    };
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateBadge);
    } else {
        updateBadge();
    }
}

function processBlankBoxes(text, isTitle = false) {
    if (isTitle) {
        return escapeHTML(text);
    }

    const sanitizedText = sanitizeInput(text);

    return sanitizedText.replace(/\[(\s*)\]/g, function(match, spaces) {
        const spaceCount = spaces.length;
        let sizeClass = '';
        
        if (spaceCount === 0) {
            sizeClass = 'space-1';
        } else if (spaceCount === 1) {
            sizeClass = 'space-2';
        } else if (spaceCount === 2 || spaceCount === 3) {
            sizeClass = 'space-3';
        } else if (spaceCount === 4 || spaceCount === 5) {
            sizeClass = 'space-4';
        } else {
            sizeClass = 'space-5-plus';
        }
        
        return `<span class="blank-box ${sizeClass}"></span>`;
    });
}

function adjustCardSize(patternId) {
    const card = document.getElementById(`pattern-${patternId}`);
    const pattern = patterns.find(p => p.id === patternId);

    if (!card || !pattern) {
        return;
    }

    card.classList.remove('size-small', 'size-medium', 'size-large', 'size-xl');

    const totalLength = (pattern.pattern || '').length + (pattern.examples || '').length;
    let sizeClass = '';

    if (totalLength < 50) {
        sizeClass = 'size-small';
    } else if (totalLength < 100) {
        sizeClass = 'size-medium';
    } else if (totalLength < 200) {
        sizeClass = 'size-large';
    } else {
        sizeClass = 'size-xl';
    }

    card.classList.add(sizeClass);
}

function applyExamplesVisibility() {
    const examplesSections = document.querySelectorAll('.examples-section');
    const patternCards = document.querySelectorAll('.pattern-card');

    examplesSections.forEach(section => {
        if (examplesVisible) {
            section.classList.add('show');
        } else {
            section.classList.remove('show');
        }
    });

    patternCards.forEach(card => {
        if (examplesVisible) {
            card.classList.remove('examples-hidden');
        } else {
            card.classList.add('examples-hidden');
        }
    });
}

function renderPatterns() {
    const grid = document.getElementById('patterns-grid');
    grid.innerHTML = '';

    if (patterns.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.style.textAlign = 'center';
        emptyState.style.padding = '60px';
        emptyState.style.color = '#94A3B8';
        emptyState.innerHTML = `
            <div style="font-size: 3rem; margin-bottom: 16px;">📚</div>
            <div style="font-size: 1.125rem; font-weight: 500;">No patterns yet</div>
            <div style="font-size: 0.875rem; margin-top: 8px;">Click "Add New Pattern" to get started</div>
        `;
        grid.appendChild(emptyState);
        return;
    }

    patterns.forEach((pattern, index) => {
        const card = createPatternCard(pattern, index + 1);
        grid.appendChild(card);
        
        // 개별 폰트 크기 적용
        if (pattern.fontSize) {
            setPatternFontSize(pattern.id, pattern.fontSize);
        }
    });

    setTimeout(() => {
        applyExamplesVisibility();
    }, 100);
}

function createPatternCard(pattern, number) {
    const card = document.createElement('div');
    card.className = 'pattern-card';
    card.id = `pattern-${pattern.id}`;

    const processedPattern = pattern.patternHTML || (pattern.pattern ? processBlankBoxes(pattern.pattern) : '');
    const processedExamples = pattern.examplesHTML || (pattern.examples ? processBlankBoxes(pattern.examples) : '');

    card.innerHTML = `
        <button class="pattern-delete-btn" onclick="deletePattern(${pattern.id})" title="Delete pattern">Del</button>
        
        <!-- 개별 패턴 글씨 크기 컨트롤 -->
        <div class="pattern-font-controls">
            <button class="pattern-font-btn" onclick="adjustPatternFontSize(${pattern.id}, -0.1)">-</button>
            <div class="pattern-font-size-display" id="pattern-font-display-${pattern.id}">${(pattern.fontSize || 1.0).toFixed(1)}</div>
            <button class="pattern-font-btn" onclick="adjustPatternFontSize(${pattern.id}, 0.1)">+</button>
        </div>
        
        <!-- 날짜 입력 영역 -->
        <div class="pattern-date-section">
            <input type="text" 
                   class="pattern-date-input" 
                   id="pattern-date-${pattern.id}"
                   value="${pattern.date || ''}"
                   placeholder="YY.MM.DD (Day)"
                   onblur="saveDatePattern(${pattern.id})"
                   onkeydown="handleDateKeydown(event, ${pattern.id})">
            <button class="calendar-btn" onclick="toggleCalendar(${pattern.id})">
                <svg fill="currentColor" viewBox="0 0 16 16">
                    <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5 0zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/>
                </svg>
            </button>
        </div>
        
        <div class="pattern-input-group">
            <div class="pattern-label">Pattern ${number}</div>
            <input type="text" 
                   class="pattern-input" 
                   id="pattern-input-${pattern.id}"
                   placeholder="Enter pattern (e.g., I can [] / I love to [ ] / Have you ever [   ]?)"
                   value="${pattern.pattern || ''}"
                   onkeydown="handlePatternKeydown(event, ${pattern.id})"
                   onblur="savePattern(${pattern.id})">
            <div class="pattern-display ${!processedPattern ? 'empty' : ''}" 
                 id="pattern-display-${pattern.id}"
                 onclick="editPattern(${pattern.id})">
                ${processedPattern || 'Click to add pattern (use [], [ ], [   ] for different sizes)'}
            </div>
        </div>
        
        <div class="examples-section" id="examples-section-${pattern.id}">
            <div class="examples-label">Examples</div>
            <textarea class="examples-input"
                      id="examples-input-${pattern.id}"
                      placeholder="Enter example sentences (one per line, use [], [ ], [   ] for different sizes)"
                      onkeydown="handleExamplesKeydown(event, ${pattern.id})"
                      onblur="saveExamples(${pattern.id})">${pattern.examples || ''}</textarea>
            <div class="examples-display ${!processedExamples ? 'empty' : ''}"
                 id="examples-display-${pattern.id}"
                 onclick="editExamples(${pattern.id})">
                ${processedExamples || 'Click to add example sentences (use [], [ ], [   ] for different sizes)'}
            </div>
        </div>
    `;

    return card;
}

function editPattern(id) {
    const card = document.getElementById(`pattern-${id}`);
    const input = document.getElementById(`pattern-input-${id}`);
    card.classList.add('editing');
    input.focus();
    input.select();
}

function editExamples(id) {
    const card = document.getElementById(`pattern-${id}`);
    const textarea = document.getElementById(`examples-input-${id}`);
    card.classList.add('editing');
    textarea.focus();
}

function savePattern(id) {
    const card = document.getElementById(`pattern-${id}`);
    const input = document.getElementById(`pattern-input-${id}`);
    const pattern = patterns.find(p => p.id === id);

    if (pattern) {
        pattern.pattern = input.value.trim();
        adjustCardSize(pattern.id);
        renderPatterns();
    }
}

function saveExamples(id) {
    const card = document.getElementById(`pattern-${id}`);
    const textarea = document.getElementById(`examples-input-${id}`);
    const pattern = patterns.find(p => p.id === id);

    if (pattern) {
        pattern.examples = textarea.value.trim();
        adjustCardSize(pattern.id);
        renderPatterns();
    }
}

function handlePatternKeydown(event, id) {
    if (event.key === 'Enter') {
        event.preventDefault();
        savePattern(id);
    } else if (event.key === 'Escape') {
        event.preventDefault();
        const card = document.getElementById(`pattern-${id}`);
        const input = document.getElementById(`pattern-input-${id}`);
        const pattern = patterns.find(p => p.id === id);

        if (pattern) {
            input.value = pattern.pattern || '';
        }
        card.classList.remove('editing');
    }
}

function handleExamplesKeydown(event, id) {
    if (event.key === 'Escape') {
        event.preventDefault();
        const card = document.getElementById(`pattern-${id}`);
        const textarea = document.getElementById(`examples-input-${id}`);
        const pattern = patterns.find(p => p.id === id);

        if (pattern) {
            textarea.value = pattern.examples || '';
        }
        card.classList.remove('editing');
    }
}

function saveDatePattern(id) {
    const input = document.getElementById(`pattern-date-${id}`);
    const pattern = patterns.find(p => p.id === id);

    if (pattern) {
        const dateValue = input.value.trim();
        if (dateValue === '' || validateDateFormat(dateValue)) {
            pattern.date = dateValue;
        } else {
            input.value = pattern.date || '';
            alert('날짜 형식이 올바르지 않습니다. YY.MM.DD 형식으로 입력해주세요. (예: 25.08.25)');
        }
    }
}

function handleDateKeydown(e, id) {
    if (e.key === 'Enter') { e.preventDefault(); saveDatePattern(id); }
    if (e.key === 'Escape') { e.preventDefault(); e.target.blur(); }
}

// 캘린더 관련 함수들
function createCalendarDropdown(id) {
    const container = document.getElementById('calendar-container');
    const existingCalendar = document.getElementById(`calendar-${id}`);
    if (existingCalendar) {
        existingCalendar.remove();
    }

    const calendarDiv = document.createElement('div');
    calendarDiv.className = 'calendar-dropdown';
    calendarDiv.id = `calendar-${id}`;
    calendarDiv.innerHTML = `
        <div class="calendar-header">
            <button class="calendar-nav-btn" onclick="navigateCalendar(${id}, -1)">
                <svg fill="currentColor" viewBox="0 0 16 16">
                    <path fill-rule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/>
                </svg>
            </button>
            <div class="calendar-month-year" id="calendar-header-${id}"></div>
            <button class="calendar-nav-btn" onclick="navigateCalendar(${id}, 1)">
                <svg fill="currentColor" viewBox="0 0 16 16">
                    <path fill-rule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
                </svg>
            </button>
        </div>
        <div class="calendar-grid" id="calendar-grid-${id}"></div>
    `;

    container.appendChild(calendarDiv);
    return calendarDiv;
}

function toggleCalendar(id) {
    document.querySelectorAll('.calendar-dropdown').forEach(cal => cal.classList.remove('show'));
    const wasVisible = activeCalendar === id;

    if (!wasVisible) {
        activeCalendar = id;
        const pattern = patterns.find(p => p.id === id);
        const calendar = createCalendarDropdown(id);

        if (pattern?.date && validateDateFormat(pattern.date)) {
            currentCalendarDate = parseYYMMDDToDate(pattern.date);
        } else {
            currentCalendarDate = new Date();
        }
        renderCalendar(id);
        calendar.classList.add('show');
    } else {
        activeCalendar = null;
    }
}

function renderCalendar(id) {
    const headerElement = document.getElementById(`calendar-header-${id}`);
    const gridElement = document.getElementById(`calendar-grid-${id}`);

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    headerElement.textContent = `${monthNames[currentCalendarDate.getMonth()]} ${currentCalendarDate.getFullYear()}`;
    gridElement.innerHTML = '';

    dayNames.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-day-header';
        dayHeader.textContent = day;
        gridElement.appendChild(dayHeader);
    });

    const firstDay = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), 1);
    const lastDay = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const today = new Date();
    const pattern = patterns.find(p => p.id === id);
    let selectedDate = null;

    if (pattern.date && validateDateFormat(pattern.date)) {
        selectedDate = parseYYMMDDToDate(pattern.date);
    }

    for (let i = 0; i < 42; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = date.getDate();
        
        if (date.getMonth() !== currentCalendarDate.getMonth()) {
            dayElement.classList.add('other-month');
        }
        
        if (date.toDateString() === today.toDateString()) {
            dayElement.classList.add('today');
        }
        
        if (selectedDate && date.toDateString() === selectedDate.toDateString()) {
            dayElement.classList.add('selected');
        }
        
        dayElement.addEventListener('click', () => selectDate(id, date));
        gridElement.appendChild(dayElement);
    }
}

function navigateCalendar(id, direction) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + direction);
    renderCalendar(id);
}

function selectDate(id, date) {
    const pattern = patterns.find(p => p.id === id);
    const input = document.getElementById(`pattern-date-${id}`);

    if (pattern) {
        pattern.date = formatDateToYYMMDD(date);
        input.value = pattern.date;
    }

    toggleCalendar(id);
}

function toggleExamples() {
    examplesVisible = !examplesVisible;

    const btnText = document.getElementById('examples-btn-text');
    const btnIcon = document.getElementById('examples-icon');

    if (examplesVisible) {
        btnText.textContent = 'Hide Examples';
        btnIcon.innerHTML = '<path d="M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.061L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z"/>';
    } else {
        btnText.textContent = 'Show Examples';
        btnIcon.innerHTML = '<path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>';
    }

    applyExamplesVisibility();
}

function deletePattern(id) {
    if (patterns.length === 1) {
        alert('최소 1개의 패턴은 있어야 합니다!');
        return;
    }

    if (confirm('이 패턴을 삭제하시겠습니까?')) {
        patterns = patterns.filter(p => p.id !== id);
        renderPatterns();
    }
}

function addPattern() {
    if (patterns.length >= 3) {
        alert('최대 3개까지만 추가할 수 있습니다!');
        return;
    }

    patternCounter++;
    const today = new Date();
    const defaultDate = formatDateToYYMMDD(today);

    const newPattern = {
        id: patternCounter,
        pattern: '',
        examples: '',
        date: defaultDate,
        fontSize: 1.0
    };

    patterns.push(newPattern);
    renderPatterns();

    setTimeout(() => editPattern(patternCounter), 100);
}

function clearAll() {
    if (patterns.length === 0) {
        alert('지울 패턴이 없습니다!');
        return;
    }

    if (confirm('모든 패턴을 삭제하시겠습니까?')) {
        patterns = [];
        patternCounter = 0;
        renderPatterns();
    }
}

function showSaveOptions() {
    const modal = document.getElementById('save-modal-overlay');
    modal.style.display = 'flex';
}

function closeSaveModal() {
    const modal = document.getElementById('save-modal-overlay');
    modal.style.display = 'none';
}

async function saveAs(format) {
    closeSaveModal();

    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    const filename = `ZENITH_English_Weekly_Pattern_${dateStr}`;

    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingText = document.querySelector('.loading-text');

    if (format === 'pdf') {
        loadingText.textContent = 'Generating PDF...';
    } else {
        loadingText.textContent = 'Generating PNG...';
    }

    loadingOverlay.style.display = 'flex';

    try {
        const element = document.getElementById('poster-container');
        
        const calendarButtons = document.querySelectorAll('.calendar-btn');
        const dateBadge = document.getElementById('date-badge');
        const fontControls = document.querySelectorAll('.pattern-font-controls');
        
        calendarButtons.forEach(btn => btn.classList.add('hide-for-export'));
        fontControls.forEach(ctrl => ctrl.style.display = 'none');
        if (dateBadge) dateBadge.style.display = 'none'; 
        
        element.style.borderRadius = '0';
        
        const originalWidth = element.style.width;
        const originalHeight = element.style.height;
        
        const a4Width = 794;
        const a4Height = 1123;
        
        element.style.width = `${a4Width}px`;
        element.style.height = `${a4Height}px`;
        
        const canvas = await html2canvas(element, {
            scale: 3,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            width: a4Width,
            height: a4Height,
            windowWidth: a4Width,
            windowHeight: a4Height,
            scrollY: 0,
            scrollX: 0,
            letterRendering: true,
            allowTaint: false,
            foreignObjectRendering: false
        });
        
        element.style.width = originalWidth;
        element.style.height = originalHeight;
        
        calendarButtons.forEach(btn => btn.classList.remove('hide-for-export'));
        fontControls.forEach(ctrl => ctrl.style.display = 'flex');
        if (dateBadge) dateBadge.style.display = 'block';
        
        element.style.borderRadius = '24px';
        
        if (format === 'pdf') {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
                compress: true
            });
            
            const imgData = canvas.toDataURL('image/png', 1.0);
            const pdfWidth = 210;
            const pdfHeight = 297;
            
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`${filename}.pdf`);
            
            alert(`PDF가 ${filename}.pdf로 저장되었습니다!`);
        } else {
            const link = document.createElement('a');
            link.download = `${filename}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            alert(`PNG가 ${filename}.png로 저장되었습니다!`);
        }
    } catch (error) {
        console.error(`${format.toUpperCase()} 생성 오류:`, error);
        alert(`${format.toUpperCase()} 생성 중 오류가 발생했습니다.`);
    } finally {
        loadingOverlay.style.display = 'none';
    }
}

// 전역 이벤트 리스너
document.addEventListener('click', function(event) {
    if (activeCalendar !== null) {
        const calendarElement = document.getElementById(`calendar-${activeCalendar}`);
        const calendarBtn = event.target.closest('.calendar-btn');
        const isInsideCalendar = event.target.closest('.calendar-dropdown');

        if (!calendarBtn && !isInsideCalendar) {
            if (calendarElement) calendarElement.classList.remove('show');
            activeCalendar = null;
        }
    }
});

document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeSaveModal();
    }
});

document.getElementById('save-modal-overlay').addEventListener('click', function(event) {
    if (event.target === this) {
        closeSaveModal();
    }
});

function initializeApp() {
    console.log('앱 초기화 시작...');
    
    updateDate();
    setFontSize(1.0);
    renderPatterns();
    addPattern();
    
    console.log('앱 초기화 완료');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// 보안 관련 이벤트 리스너들
document.addEventListener('contextmenu', function(event) {
    event.preventDefault();
});

document.addEventListener('keydown', function(event) {
    if (event.key === 'F12') {
        event.preventDefault();
        return false;
    }

    if (event.ctrlKey && event.shiftKey && event.key === 'I') {
        event.preventDefault();
        return false;
    }

    if (event.ctrlKey && event.shiftKey && event.key === 'J') {
        event.preventDefault();
        return false;
    }

    if (event.ctrlKey && event.key === 'u') {
        event.preventDefault();
        return false;
    }

    if (event.ctrlKey && event.shiftKey && event.key === 'C') {
        event.preventDefault();
        return false;
    }
});

document.addEventListener('dragstart', function(event) {
    event.preventDefault();
});

document.addEventListener('selectstart', function(event) {
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return true;
    }
    
    const isPatternDisplay = event.target.closest('.pattern-display');
    const isExamplesDisplay = event.target.closest('.examples-display');
    
    if (isPatternDisplay || isExamplesDisplay) {
        return true;
    }
    
    event.preventDefault();
    return false;
});