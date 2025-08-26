let patterns = [];
let patternCounter = 0;
let examplesVisible = false;
let activeCalendar = null;
let currentCalendarDate = new Date();
let currentFontSize = 1.0; // 기본 폰트 크기
let selectedTextInfo = null; // 선택된 텍스트 정보
let activeElement = null; // 현재 활성화된 요소
let panelSelectedTextInfo = null; // 패널용 선택된 텍스트 정보

// 텍스트 선택 감지 및 패널 업데이트
document.addEventListener('mouseup', function(e) {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    // 패턴이나 예제 영역에서 선택했는지 확인
    let targetElement = null;
    let isValidTarget = false;
    
    if (selectedText && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const container = range.commonAncestorContainer;
        
        // 텍스트 노드의 부모를 찾거나 직접 요소를 찾기
        if (container.nodeType === Node.TEXT_NODE) {
            targetElement = container.parentElement;
        } else {
            targetElement = container;
        }
        
        // 부모 요소들을 탐색하여 pattern-display나 examples-display 찾기
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
        // 선택된 텍스트가 있을 때
        panelSelectedTextInfo = {
            selection: selection,
            range: selection.getRangeAt(0),
            element: element,
            text: selectedText
        };
        
        infoDiv.style.display = 'block';
        previewDiv.textContent = selectedText.length > 30 ? 
            selectedText.substring(0, 30) + '...' : selectedText;
        
        // 버튼들 활성화
        boldBtn.disabled = false;
        clearBtn.disabled = false;
        colorBtns.forEach(btn => {
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        });
    } else {
        // 선택된 텍스트가 없을 때
        panelSelectedTextInfo = null;
        infoDiv.style.display = 'none';
        previewDiv.textContent = 'No text selected';
        
        // 버튼들 비활성화
        boldBtn.disabled = true;
        clearBtn.disabled = true;
        colorBtns.forEach(btn => {
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
        });
    }
}

// 패널에서 볼드 적용
function applyBoldFromPanel() {
    if (!panelSelectedTextInfo) return;
    
    const range = panelSelectedTextInfo.range;
    const text = panelSelectedTextInfo.text;
    
    const span = document.createElement('span');
    span.textContent = text;
    span.classList.add('text-bold');
    
    range.deleteContents();
    range.insertNode(span);
    
    updatePatternFromElement(panelSelectedTextInfo.element);
    window.getSelection().removeAllRanges(); // 선택 해제
    updateTextSelectionPanel('', null, null, false);
}

// 패널에서 색상 적용
function applyColorFromPanel(color) {
    if (!panelSelectedTextInfo) return;
    
    const range = panelSelectedTextInfo.range;
    const text = panelSelectedTextInfo.text;
    
    const span = document.createElement('span');
    span.textContent = text;
    span.style.color = color;
    
    range.deleteContents();
    range.insertNode(span);
    
    updatePatternFromElement(panelSelectedTextInfo.element);
    window.getSelection().removeAllRanges(); // 선택 해제
    updateTextSelectionPanel('', null, null, false);
}

// 패널에서 서식 제거
function clearFormattingFromPanel() {
    if (!panelSelectedTextInfo) return;
    
    const range = panelSelectedTextInfo.range;
    const text = panelSelectedTextInfo.text;
    
    range.deleteContents();
    range.insertNode(document.createTextNode(text));
    
    updatePatternFromElement(panelSelectedTextInfo.element);
    window.getSelection().removeAllRanges(); // 선택 해제
    updateTextSelectionPanel('', null, null, false);
}

// 폰트 크기 조절 함수
function adjustFontSize(delta) {
    const newSize = Math.max(0.5, Math.min(3.0, currentFontSize + delta));
    setFontSize(newSize);
}

function setFontSize(size) {
    size = parseFloat(size);
    if (isNaN(size) || size < 0.5 || size > 3.0) return;

    currentFontSize = size;
    document.getElementById('font-size-input').value = size.toFixed(1);

    // CSS 변수 업데이트
    document.documentElement.style.setProperty('--current-font-size', size);

    // 모든 패턴 카드 크기 재조정
    patterns.forEach(pattern => adjustCardSize(pattern.id));
}

function updatePatternFromElement(element) {
    // 요소의 ID에서 패턴 ID 추출
    const isPattern = element.classList.contains('pattern-display');
    const isExamples = element.classList.contains('examples-display');

    if (!isPattern && !isExamples) return;

    const elementId = element.id;
    const matches = elementId.match(/(\d+)/);
    if (!matches) return;

    const patternId = parseInt(matches[1]);
    const pattern = patterns.find(p => p.id === patternId);
    if (!pattern) return;

    // HTML 내용을 패턴 데이터에 저장
    if (isPattern) {
        pattern.patternHTML = element.innerHTML;
    } else if (isExamples) {
        pattern.examplesHTML = element.innerHTML;
    }
}

// XSS 방지를 위한 HTML 이스케이프 함수
function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// XSS 방지를 위한 입력값 검증 및 정화
function sanitizeInput(input) {
    if (typeof input !== 'string') return '';

    // 위험한 문자열 패턴 제거
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

    // HTML 엔티티로 변환
    return escapeHTML(sanitized).substring(0, 500); // 길이 제한도 적용
}

// 날짜 포맷팅 유틸리티 함수들
function formatDateToYYMMDD(date) {
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayOfWeek = dayNames[date.getDay()];

    return `${year}.${month}.${day} (${dayOfWeek})`;
}

function parseYYMMDDToDate(dateStr) {
    // 요일 부분 제거 - 괄호와 그 안의 내용을 제거
    const dateOnly = dateStr.split(' ')[0];
    const parts = dateOnly.split('.');
    if (parts.length !== 3) return new Date();

    const year = 2000 + parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const day = parseInt(parts[2]);

    return new Date(year, month, day);
}

function validateDateFormat(dateStr) {
    // 요일이 포함된 형식과 포함되지 않은 형식 둘 다 허용
    const regexWithDay = /^\d{2}.\d{2}.\d{2} \([A-Za-z]{3}\)$/;
    const regexWithoutDay = /^\d{2}.\d{2}.\d{2}$/;

    if (!regexWithDay.test(dateStr) && !regexWithoutDay.test(dateStr)) {
        return false;
    }

    const date = parseYYMMDDToDate(dateStr);
    return !isNaN(date.getTime());
}

// 날짜 업데이트 - 오늘 날짜로 변경 및 DOM 로드 후 확실히 실행
function updateDate() {
    const now = new Date();
    
    // 영어 형식으로 포맷
    const options = { month: 'short', day: 'numeric' };
    const dateStr = now.toLocaleDateString('en-US', options);
    const year = now.getFullYear();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[now.getDay()];
    
    const formattedDate = `${dateStr}, ${year} - ${dayName}`;
    
    // DOM이 준비될 때까지 기다린 후 업데이트
    const updateBadge = () => {
        const badge = document.getElementById('date-badge');
        if (badge) {
            badge.textContent = formattedDate;
            console.log('날짜 배지 업데이트 성공:', formattedDate);
        } else {
            console.log('date-badge 요소를 찾을 수 없음');
            // 1초 후 다시 시도
            setTimeout(updateBadge, 1000);
        }
    };
    
    // DOM이 로드되었는지 확인
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateBadge);
    } else {
        updateBadge();
    }
}

// 텍스트에서 [] 를 네모 박스로 변환 (공백 개수로 크기 결정) - XSS 방지 적용
function processBlankBoxes(text, isTitle = false) {
    if (isTitle) {
        return escapeHTML(text); // 제목에서는 HTML 이스케이프만 적용
    }

    // 먼저 입력값을 정화
    const sanitizedText = sanitizeInput(text);

    // [공백들] 패턴을 찾아서 공백 개수에 따라 박스 크기 조절
    return sanitizedText.replace(/\[(\s*)\]/g, function(match, spaces) {
        const spaceCount = spaces.length;
        let sizeClass = '';
        
        if (spaceCount === 0) {
            sizeClass = 'space-1'; // [] - 가장 작은 크기
        } else if (spaceCount === 1) {
            sizeClass = 'space-2'; // [ ] - 작은 크기
        } else if (spaceCount === 2 || spaceCount === 3) {
            sizeClass = 'space-3'; // [  ] 또는 [   ] - 중간 크기
        } else if (spaceCount === 4 || spaceCount === 5) {
            sizeClass = 'space-4'; // [    ] 또는 [     ] - 큰 크기
        } else {
            sizeClass = 'space-5-plus'; // 그 이상 - 가장 큰 크기
        }
        
        return `<span class="blank-box ${sizeClass}"></span>`;
    });
}

// 패턴 카드의 높이 자동 조절 (내용에 따라)
function adjustCardSize(patternId) {
    const card = document.getElementById(`pattern-${patternId}`);
    const pattern = patterns.find(p => p.id === patternId);

    if (!card || !pattern) {
        return;
    }

    // 기존 크기 클래스 제거
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

// 예제 표시 상태 적용 함수
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
        // 빈 상태 표시
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
        
    });

    // 예제 표시 상태 적용
    setTimeout(() => {
        applyExamplesVisibility();
    }, 100);
}

// 패턴 카드 생성
function createPatternCard(pattern, number) {
    const card = document.createElement('div');
    card.className = 'pattern-card';
    card.id = `pattern-${pattern.id}`;

    // 패턴 텍스트 처리 - HTML이 있으면 사용, 없으면 [] 변환
    const processedPattern = pattern.patternHTML || (pattern.pattern ? processBlankBoxes(pattern.pattern) : '');
    const processedExamples = pattern.examplesHTML || (pattern.examples ? processBlankBoxes(pattern.examples) : '');

    card.innerHTML = `
        <button class="pattern-delete-btn" onclick="deletePattern(${pattern.id})" title="Delete pattern">Del</button>
        
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

// 패턴 편집
function editPattern(id) {
    const card = document.getElementById(`pattern-${id}`);
    const input = document.getElementById(`pattern-input-${id}`);

    card.classList.add('editing');
    input.focus();
    input.select();
}

// 예시 편집
function editExamples(id) {
    const card = document.getElementById(`pattern-${id}`);
    const textarea = document.getElementById(`examples-input-${id}`);

    card.classList.add('editing');
    textarea.focus();
}

// 패턴 저장
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

// 예시 저장
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

// 패턴 입력 키 핸들링
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

// 예시 입력 키 핸들링
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

// 날짜 저장
function saveDatePattern(id) {
    const input = document.getElementById(`pattern-date-${id}`);
    const pattern = patterns.find(p => p.id === id);

    if (pattern) {
        const dateValue = input.value.trim();
        if (dateValue === '' || validateDateFormat(dateValue)) {
            pattern.date = dateValue;
        } else {
            // 잘못된 형식일 경우 이전 값으로 복원
            input.value = pattern.date || '';
            alert('날짜 형식이 올바르지 않습니다. YY.MM.DD 형식으로 입력해주세요. (예: 25.08.25)');
        }
    }
}

function handleDateKeydown(e, id) {
    if (e.key === 'Enter') { e.preventDefault(); saveDatePattern(id); }
    if (e.key === 'Escape') { e.preventDefault(); e.target.blur(); }
}

// 캘린더 드롭다운을 동적으로 생성하는 함수
function createCalendarDropdown(id) {
    const container = document.getElementById('calendar-container');

    // 기존 캘린더가 있으면 제거
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

// 날짜 입력 키 핸들링
function toggleCalendar(id) {
    // 모든 캘린더 닫기
    document.querySelectorAll('.calendar-dropdown').forEach(cal => cal.classList.remove('show'));

    // 기존에 열린 캘린더가 있는지 확인
    const wasVisible = activeCalendar === id;

    if (!wasVisible) {
        activeCalendar = id;
        const pattern = patterns.find(p => p.id === id);

        // 캘린더 동적 생성
        const calendar = createCalendarDropdown(id);

        // 기준 날짜 세팅
        if (pattern?.date && validateDateFormat(pattern.date)) {
            currentCalendarDate = parseYYMMDDToDate(pattern.date);
        } else {
            currentCalendarDate = new Date();
        }
        renderCalendar(id);

        // 화면 중앙에 띄우기
        calendar.classList.add('show');
    } else {
        activeCalendar = null;
    }
}

// 캘린더 렌더링
function renderCalendar(id) {
    const headerElement = document.getElementById(`calendar-header-${id}`);
    const gridElement = document.getElementById(`calendar-grid-${id}`);

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // 헤더 업데이트
    headerElement.textContent = `${monthNames[currentCalendarDate.getMonth()]} ${currentCalendarDate.getFullYear()}`;

    // 그리드 클리어
    gridElement.innerHTML = '';

    // 요일 헤더 추가
    dayNames.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-day-header';
        dayHeader.textContent = day;
        gridElement.appendChild(dayHeader);
    });

    // 달력 날짜 생성
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

    // 6주간의 날짜 생성
    for (let i = 0; i < 42; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = date.getDate();
        
        // 클래스 설정
        if (date.getMonth() !== currentCalendarDate.getMonth()) {
            dayElement.classList.add('other-month');
        }
        
        if (date.toDateString() === today.toDateString()) {
            dayElement.classList.add('today');
        }
        
        if (selectedDate && date.toDateString() === selectedDate.toDateString()) {
            dayElement.classList.add('selected');
        }
        
        // 클릭 이벤트
        dayElement.addEventListener('click', () => selectDate(id, date));
        
        gridElement.appendChild(dayElement);
    }
}

// 캘린더 네비게이션
function navigateCalendar(id, direction) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + direction);
    renderCalendar(id);
}

// 날짜 선택
function selectDate(id, date) {
    const pattern = patterns.find(p => p.id === id);
    const input = document.getElementById(`pattern-date-${id}`);

    if (pattern) {
        pattern.date = formatDateToYYMMDD(date);
        input.value = pattern.date;
    }

    // 캘린더 닫기
    toggleCalendar(id);
}

function toggleExamples() {
    // 전역 상태 변경
    examplesVisible = !examplesVisible;

    const btnText = document.getElementById('examples-btn-text');
    const btnIcon = document.getElementById('examples-icon');

    // 버튼 텍스트와 아이콘 업데이트
    if (examplesVisible) {
        btnText.textContent = 'Hide Examples';
        btnIcon.innerHTML = '<path d="M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.061L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z"/>';
    } else {
        btnText.textContent = 'Show Examples';
        btnIcon.innerHTML = '<path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>';
    }

    // 예제 표시 상태 적용
    applyExamplesVisibility();
}

// 개별 패턴 삭제 함수 추가
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

// 패턴 추가
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
        date: defaultDate
    };

    patterns.push(newPattern);
    renderPatterns();

    // 새로 추가된 패턴 바로 편집
    setTimeout(() => editPattern(patternCounter), 100);
}

// 모두 지우기
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

// 저장 옵션 모달 표시
function showSaveOptions() {
    const modal = document.getElementById('save-modal-overlay');
    modal.style.display = 'flex';
}

// 저장 옵션 모달 닫기
function closeSaveModal() {
    const modal = document.getElementById('save-modal-overlay');
    modal.style.display = 'none';
}

// ESC 키로 모달 닫기
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeSaveModal();
    }
});

// 모달 오버레이 클릭으로 닫기
document.getElementById('save-modal-overlay').addEventListener('click', function(event) {
    if (event.target === this) {
        closeSaveModal();
    }
});

// 파일 저장 (PDF 또는 PNG)
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
        
        // 모든 캘린더 버튼과 날짜 배지 숨김 (PDF/PNG 저장 시)
        const calendarButtons = document.querySelectorAll('.calendar-btn');
        const dateBadge = document.getElementById('date-badge');
        
        calendarButtons.forEach(btn => btn.classList.add('hide-for-export'));
        if (dateBadge) dateBadge.style.display = 'none'; 
        
        // 임시로 border-radius 제거 (렌더링 최적화)
        element.style.borderRadius = '0';
        
        // A4 비율에 맞게 강제 크기 설정 (210mm : 297mm = 1 : 1.414)
        const originalWidth = element.style.width;
        const originalHeight = element.style.height;
        
        // A4 비율로 강제 설정 (픽셀 기준)
        const a4Width = 794; // 210mm at 96 DPI
        const a4Height = 1123; // 297mm at 96 DPI
        
        element.style.width = `${a4Width}px`;
        element.style.height = `${a4Height}px`;
        
        const canvas = await html2canvas(element, {
            scale: 3, // 고해상도
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
        
        // 원래 크기로 복원
        element.style.width = originalWidth;
        element.style.height = originalHeight;
        
        // 캘린더 버튼과 날짜 배지 다시 표시
        calendarButtons.forEach(btn => btn.classList.remove('hide-for-export'));
        if (dateBadge) dateBadge.style.display = 'block';
        
        // border-radius 복원
        element.style.borderRadius = '24px';
        
        if (format === 'pdf') {
            // PDF 저장
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
                compress: true
            });
            
            const imgData = canvas.toDataURL('image/png', 1.0);
            
            // A4 크기에 정확히 맞추기
            const pdfWidth = 210;
            const pdfHeight = 297;
            
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`${filename}.pdf`);
            
            alert(`PDF가 ${filename}.pdf로 저장되었습니다!`);
        } else {
            // PNG 저장 - A4 비율 유지된 상태로 저장
            const link = document.createElement('a');
            link.download = `${filename}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            
            // 임시로 DOM에 추가하여 클릭
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
    // 캘린더 외부 클릭으로 닫기
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

// 초기화 함수
function initializeApp() {
    console.log('앱 초기화 시작...');
    
    // 날짜 업데이트
    updateDate();
    
    // 기본 폰트 크기 설정
    setFontSize(1.0);
    
    // 패턴 렌더링
    renderPatterns();
    
    // 첫 패턴 자동 추가
    addPattern();
    
    console.log('앱 초기화 완료');
}

// DOM이 로드된 후 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// 우클릭 방지 (단순 방지만 유지)
document.addEventListener('contextmenu', function(event) {
    event.preventDefault();
});

// 개발자 도구 키보드 단축키 방지
document.addEventListener('keydown', function(event) {
    // F12 방지
    if (event.key === 'F12') {
        event.preventDefault();
        return false;
    }

    // Ctrl+Shift+I 방지 (개발자 도구)
    if (event.ctrlKey && event.shiftKey && event.key === 'I') {
        event.preventDefault();
        return false;
    }

    // Ctrl+Shift+J 방지 (콘솔)
    if (event.ctrlKey && event.shiftKey && event.key === 'J') {
        event.preventDefault();
        return false;
    }

    // Ctrl+U 방지 (소스 보기)
    if (event.ctrlKey && event.key === 'u') {
        event.preventDefault();
        return false;
    }

    // Ctrl+Shift+C 방지 (요소 선택)
    if (event.ctrlKey && event.shiftKey && event.key === 'C') {
        event.preventDefault();
        return false;
    }
});

// 드래그 방지
document.addEventListener('dragstart', function(event) {
    event.preventDefault();
});

// 선택 방지 (CSS로도 처리하지만 추가 보안) - 단, 텍스트 선택은 허용
document.addEventListener('selectstart', function(event) {
    // 입력 필드는 선택 허용
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return true;
    }
    
    // 패턴과 예제 영역에서는 텍스트 선택 허용
    const isPatternDisplay = event.target.closest('.pattern-display');
    const isExamplesDisplay = event.target.closest('.examples-display');
    
    if (isPatternDisplay || isExamplesDisplay) {
        return true;
    }
    
    event.preventDefault();
    return false;
});
