let patterns = [];
let patternCounter = 0;
let examplesVisible = false; // 예제 표시 상태를 전역적으로 관리

let activeCalendar = null;
let currentCalendarDate = new Date();

// 텍스트 에디터 관련 전역 변수
let activeTextSelection = null;
let colorPalette = null;
let fontSizeControls = null;
let textEditorToolbar = null;

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
    const regexWithDay = /^\d{2}\.\d{2}\.\d{2} \([A-Za-z]{3}\)$/;
    const regexWithoutDay = /^\d{2}\.\d{2}\.\d{2}$/;
    
    if (!regexWithDay.test(dateStr) && !regexWithoutDay.test(dateStr)) {
        return false;
    }
    
    const date = parseYYMMDDToDate(dateStr);
    return !isNaN(date.getTime());
}

// 날짜 업데이트 - 주간으로 변경
function updateDate() {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sun 시작
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const options = { month: 'short', day: 'numeric' };
    const startStr = startOfWeek.toLocaleDateString('en-US', options);
    const endStr = endOfWeek.toLocaleDateString('en-US', options);
    const year = now.getFullYear();

    const badge = document.getElementById('date-badge');
    if (badge) badge.textContent = `${startStr} - ${endStr}, ${year}`;
}

// 텍스트에서 [] 를 네모 박스로 변환 (HTML 콘텐츠 지원)
function processBlankBoxesWithHTML(text, isTitle = false) {
    if (isTitle) {
        return escapeHTML(text);
    }
    
    if (text && text.includes('<span')) {
        return text;
    }
    
    if (!text || text.trim() === '') {
        return '';
    }
    
    let sanitizedText = text;
    if (typeof sanitizedText === 'string') {
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
        
        dangerousPatterns.forEach(pattern => {
            sanitizedText = sanitizedText.replace(pattern, '');
        });
        
        sanitizedText = sanitizedText.substring(0, 500);
    }
    
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
        
        // 선택 가능한 텍스트 노드 포함
        return `<span class="blank-box ${sizeClass}" data-blank-box="true" data-selectable="true">&nbsp;</span>`;
    });
}

// 텍스트에서 [] 를 네모 박스로 변환 (기존 함수 - 호환성 유지)
function processBlankBoxes(text, isTitle = false) {
    return processBlankBoxesWithHTML(text, isTitle);
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
    
    // 그리드는 항상 균등 배치 (grid-auto-rows: 1fr 적용됨)
    patterns.forEach((pattern, index) => {
        const card = createPatternCard(pattern, index + 1);
        grid.appendChild(card);
    });
    
    // 예제 표시 상태 적용
    setTimeout(() => {
        applyExamplesVisibility();
    }, 100);
    
    // 텍스트 에디터 초기화
    setTimeout(() => {
        initTextEditor();
    }, 200);
}

// 패턴 카드 생성
function createPatternCard(pattern, number) {
    const card = document.createElement('div');
    card.className = 'pattern-card';
    card.id = `pattern-${pattern.id}`;
    
    // HTML 콘텐츠가 있으면 우선 사용, 없으면 일반 텍스트 처리
    const processedPattern = pattern.htmlContent || (pattern.pattern ? processBlankBoxesWithHTML(pattern.pattern) : '');
    const processedExamples = pattern.examplesHtmlContent || (pattern.examples ? processBlankBoxesWithHTML(pattern.examples) : '');
    
    card.innerHTML = `
        <button class="pattern-delete-btn" onclick="deletePattern(${pattern.id})" title="Delete pattern">Del</button>
        
        <!-- 날짜 입력 영역 - 절대 위치로 우상단에 배치 -->
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
                 data-pattern-id="${pattern.id}"
                 ondblclick="editPattern(${pattern.id})">
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
                 ondblclick="editExamples(${pattern.id})">
                ${processedExamples || 'Add examples (use [] for blanks)'}
            </div>
        </div>
    `;
    
    return card;
}

// 패턴 편집
function editPattern(id) {
    // 편집 모드 진입 시 텍스트 에디터 컨트롤 숨기기
    hideTextEditorControls();
    
    const card = document.getElementById(`pattern-${id}`);
    const input = document.getElementById(`pattern-input-${id}`);
    
    card.classList.add('editing');
    input.focus();
    input.select();
}

// 예시 편집
function editExamples(id) {
    // 편집 모드 진입 시 텍스트 에디터 컨트롤 숨기기
    hideTextEditorControls();
    
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
        // HTML 콘텐츠 초기화 (새로운 텍스트 입력 시)
        pattern.htmlContent = null;
        
        adjustCardSize(pattern.id);
        renderPatterns();
        
        activeTextSelection = null;
        hideTextEditorControls();
    }
}

// 예시 저장
function saveExamples(id) {
    const card = document.getElementById(`pattern-${id}`);
    const textarea = document.getElementById(`examples-input-${id}`);
    const pattern = patterns.find(p => p.id === id);
    
    if (pattern) {
        pattern.examples = textarea.value.trim();
        // HTML 콘텐츠 초기화 (새로운 텍스트 입력 시)
        pattern.examplesHtmlContent = null;
        
        // activeTextSelection 임시 저장
        const tempActiveTextSelection = activeTextSelection;
        
        adjustCardSize(pattern.id);
        renderPatterns();
        
        // activeTextSelection 복원 불가능 (DOM 재생성으로 인해)
        activeTextSelection = null;
        
        // 텍스트 에디터 컨트롤 숨기기
        hideTextEditorControls();
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
        hideTextEditorControls();
        
        // 캘린더도 닫기
        if (activeCalendar !== null) {
            const calendarElement = document.getElementById(`calendar-${activeCalendar}`);
            if (calendarElement) {
                calendarElement.classList.remove('show');
            }
            activeCalendar = null;
        }
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

// 텍스트 에디터 초기화
function initTextEditor() {
    // 컬러 팔레트 생성
    createColorPalette();
    
    // 폰트 크기 컨트롤 생성
    createFontSizeControls();
    
    // 툴바 생성
    createTextEditorToolbar();
    
    // 이벤트 리스너 추가
    addTextEditorEventListeners();
}

function addTextEditorEventListeners() {
    // 마우스 다운 시 기존 선택 해제
    document.addEventListener('mousedown', function(event) {
        // 툴바나 컨트롤 영역이 아닌 곳을 클릭할 때만
        if (!event.target.closest('#text-editor-toolbar') &&
            !event.target.closest('#color-palette') &&
            !event.target.closest('#font-size-controls')) {
            
            // 드래그가 시작되면 기존 activeTextSelection 초기화
            if (activeTextSelection) {
                activeTextSelection = null;
            }
        }
    });
    
    // mouseup 이벤트는 텍스트 선택 감지만 (툴바 표시하지 않음)
    document.addEventListener('mouseup', handleTextSelection);
}

// 컬러 팔레트 생성
function createColorPalette() {
    // 기존 팔레트 제거
    if (colorPalette) {
        colorPalette.remove();
    }
    
    colorPalette = document.createElement('div');
    colorPalette.className = 'color-palette';
    colorPalette.id = 'color-palette';
    
    const colors = ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'purple', 'black'];
    
    colors.forEach(color => {
        const colorOption = document.createElement('div');
        colorOption.className = `color-option ${color}`;
        
        // 이벤트 리스너 추가
        colorOption.addEventListener('click', function(e) {
            e.stopPropagation();
            changeTextColor(color);
        });
        
        colorPalette.appendChild(colorOption);
    });
    
    document.body.appendChild(colorPalette);
}


// 폰트 크기 컨트롤 생성
function createFontSizeControls() {
    // 기존 컨트롤 제거
    if (fontSizeControls) {
        fontSizeControls.remove();
    }
    
    fontSizeControls = document.createElement('div');
    fontSizeControls.className = 'font-size-controls';
    fontSizeControls.id = 'font-size-controls';
    
    fontSizeControls.innerHTML = `
        <div class="font-size-input-group">
            <label for="font-size-input" class="font-size-label">Font Size (em):</label>
            <input type="number" class="font-size-input" id="font-size-input" 
                   min="0.5" max="5.0" step="0.1" value="1.0" 
                   placeholder="1.0">
        </div>
        <input type="range" class="font-size-slider" id="font-size-slider" 
               min="0.5" max="3.0" step="0.1" value="1.0">
        <div class="font-size-presets">
            <button class="preset-btn" data-size="0.8">Small</button>
            <button class="preset-btn" data-size="1.0">Normal</button>
            <button class="preset-btn" data-size="1.2">Large</button>
            <button class="preset-btn" data-size="1.5">XL</button>
        </div>
    `;
    
    document.body.appendChild(fontSizeControls);
    
    // 요소들 가져오기
    const slider = document.getElementById('font-size-slider');
    const input = document.getElementById('font-size-input');
    const presetButtons = fontSizeControls.querySelectorAll('.preset-btn');
    
    // 슬라이더 이벤트
    slider.addEventListener('input', function() {
        const value = parseFloat(this.value);
        input.value = value;
        if (activeTextSelection) {
            changeTextFontSize(value);
        }
    });
    
    // 입력 필드 이벤트
    input.addEventListener('input', function() {
        let value = parseFloat(this.value);
        
        // 값 범위 제한
        if (value < 0.5) value = 0.5;
        if (value > 5.0) value = 5.0;
        
        this.value = value;
        
        // 슬라이더 범위 내에서만 동기화
        if (value >= 0.5 && value <= 3.0) {
            slider.value = value;
        }
        
        if (activeTextSelection) {
            changeTextFontSize(value);
        }
    });
    
    // Enter 키로 적용
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            this.blur();
        }
    });
    
    // 프리셋 버튼 이벤트
    presetButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const size = parseFloat(this.dataset.size);
            input.value = size;
            slider.value = size;
            if (activeTextSelection) {
                changeTextFontSize(size);
            }
        });
    });
}

// 텍스트 에디터 툴바 생성
function createTextEditorToolbar() {
    // 기존 툴바 제거
    if (textEditorToolbar) {
        textEditorToolbar.remove();
    }
    
    textEditorToolbar = document.createElement('div');
    textEditorToolbar.className = 'text-editor-toolbar';
    textEditorToolbar.id = 'text-editor-toolbar';
    
    // 버튼들을 innerHTML로 한번에 생성
    textEditorToolbar.innerHTML = `
        <button class="toolbar-btn" id="toolbar-color-btn">Color</button>
        <button class="toolbar-btn" id="toolbar-size-btn">Size</button>
        <button class="toolbar-btn" id="toolbar-reset-btn">Reset</button>
    `;
    
    document.body.appendChild(textEditorToolbar);
    
    // DOM에 추가된 후 바로 이벤트 리스너 등록
    document.getElementById('toolbar-color-btn').addEventListener('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        console.log('Color 버튼 클릭됨');
        showColorPalette(e);
    });
    
    document.getElementById('toolbar-size-btn').addEventListener('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        console.log('Size 버튼 클릭됨');
        showFontSizeControls(e);
    });
    
    document.getElementById('toolbar-reset-btn').addEventListener('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        console.log('Reset 버튼 클릭됨');
        resetTextStyle();
    });
}

// 이벤트 리스너 추가
document.addEventListener('click', function(event) {
    // 텍스트 에디터 관련 요소들 확인
    const isToolbarClick = event.target.closest('#text-editor-toolbar');
    const isPaletteClick = event.target.closest('#color-palette');
    const isFontControlClick = event.target.closest('#font-size-controls');
    
    // 텍스트 에디터 관련 요소를 클릭한 경우 아무것도 하지 않음
    if (isToolbarClick || isPaletteClick || isFontControlClick) {
        return;
    }
    
    // 입력 필드들 (input, textarea) 클릭 시에는 텍스트 에디터 컨트롤 숨기지 않음
    const isInputField = event.target.matches('input, textarea') || event.target.closest('input, textarea');
    if (isInputField) {
        return;
    }
    
    // 패턴 디스플레이나 예시 디스플레이 클릭은 무시 (더블클릭 이벤트를 위해)
    const isDisplayClick = event.target.closest('.pattern-display, .examples-display');
    if (isDisplayClick) {
        return;
    }
    
    // 그 외의 모든 곳을 클릭하면 텍스트 에디터 컨트롤 숨기기
    hideTextEditorControls();
});

// 우클릭으로 텍스트 에디터 표시하는 함수
function handleTextSelectionOnRightClick(event) {
    event.preventDefault();
    
    // blank-box를 직접 우클릭한 경우
    if (event.target.classList && event.target.classList.contains('blank-box')) {
        console.log('Blank box 직접 선택됨');
        
        const blankBox = event.target;
        const patternDisplay = blankBox.closest('.pattern-display, .examples-display');
        
        if (!patternDisplay) return;
        
        // blank-box 전용 선택 상태 저장
        activeTextSelection = {
            isBlankBox: true,
            blankBoxElement: blankBox,
            element: patternDisplay,
            text: '[]',
            timestamp: Date.now()
        };
        
        // blank-box에 시각적 피드백
        blankBox.style.outline = '2px solid #6366F1';
        blankBox.style.outlineOffset = '2px';
        
        showTextEditorToolbar(event.clientX, event.clientY);
        return;
    }
    
    // 일반 텍스트 선택 처리
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (!selectedText || selection.rangeCount === 0) {
        return;
    }
    
    const range = selection.getRangeAt(0);
    let element = range.commonAncestorContainer;
    
    if (element.nodeType === Node.TEXT_NODE) {
        element = element.parentElement;
    }
    
    let patternDisplay = element.closest('.pattern-display, .examples-display');
    
    if (!patternDisplay) {
        return;
    }
    
    activeTextSelection = {
        range: range.cloneRange(),
        text: selectedText,
        element: patternDisplay,
        startContainer: range.startContainer,
        endContainer: range.endContainer,
        startOffset: range.startOffset,
        endOffset: range.endOffset,
        timestamp: Date.now()
    };
    
    showTextEditorToolbar(event.clientX, event.clientY);
}

// 텍스트 선택 처리 (드래그 완료 시 - 이제 툴바를 바로 표시하지 않음)
function handleTextSelection(event) {
    // 툴바나 컨트롤이 이미 표시중이면 무시
    if (textEditorToolbar && textEditorToolbar.classList.contains('show')) {
        return;
    }
    if (colorPalette && colorPalette.classList.contains('show')) return;
    if (fontSizeControls && fontSizeControls.classList.contains('show')) return;
    
    // 툴바 관련 요소 클릭시 무시
    if (event.target && (
        event.target.closest('#text-editor-toolbar') ||
        event.target.closest('#color-palette') ||
        event.target.closest('#font-size-controls')
    )) {
        return;
    }
    
    // 드래그로 텍스트를 선택했을 때는 툴바를 표시하지 않음
    // 대신 사용자가 우클릭할 때까지 대기
    setTimeout(() => {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        
        if (!selectedText || selection.rangeCount === 0) {
            // 선택이 없을 때만 activeTextSelection 초기화
            if (!textEditorToolbar || !textEditorToolbar.classList.contains('show')) {
                activeTextSelection = null;
            }
            return;
        }
        
        // 선택은 되었지만 툴바는 표시하지 않음 (우클릭을 기다림)
        console.log('텍스트가 선택되었습니다. 우클릭하여 편집 도구를 표시하세요.');
        
    }, 50);
}

// 툴바 표시
function showTextEditorToolbar(x, y) {
    console.log('showTextEditorToolbar 호출됨:', x, y);
    console.log('textEditorToolbar 존재:', !!textEditorToolbar);
    
    // 기존 컨트롤 숨기기 (툴바는 제외)
    if (colorPalette) colorPalette.style.display = 'none';
    if (fontSizeControls) fontSizeControls.style.display = 'none';
    
    if (!textEditorToolbar) {
        console.error('텍스트 에디터 툴바가 존재하지 않음');
        return;
    }
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const toolbarWidth = 200; // 예상 툴바 너비
    const toolbarHeight = 50; // 예상 툴바 높이
    
    // X 좌표 조정
    let leftPosition = x;
    if (leftPosition + toolbarWidth > viewportWidth) {
        leftPosition = viewportWidth - toolbarWidth - 10;
    }
    if (leftPosition < 10) {
        leftPosition = 10;
    }
    
    // Y 좌표 조정
    let topPosition = y - 60;
    if (topPosition + toolbarHeight > viewportHeight - 100) {
        topPosition = viewportHeight - toolbarHeight - 100;
    }
    if (topPosition < 10) {
        topPosition = 10;
    }
    
    textEditorToolbar.style.left = leftPosition + 'px';
    textEditorToolbar.style.top = topPosition + 'px';
    textEditorToolbar.style.display = 'flex';
    textEditorToolbar.classList.add('show');
    
    console.log('툴바 스타일 설정됨:', {
        left: textEditorToolbar.style.left,
        top: textEditorToolbar.style.top
    });
}

// 컬러 팔레트 표시
function showColorPalette(e) {
    if (e) {
        e.stopPropagation();
        e.preventDefault();
    }
    
    if (!activeTextSelection) {
        console.log('No active selection - trying to restore from current selection');
        
        // 현재 브라우저 선택 상태에서 activeTextSelection 복원 시도
        const selection = window.getSelection();
        if (selection.rangeCount > 0 && selection.toString().trim()) {
            const range = selection.getRangeAt(0);
            let element = range.commonAncestorContainer;
            
            if (element.nodeType === Node.TEXT_NODE) {
                element = element.parentElement;
            }
            
            // 편집 가능한 영역 찾기
            let patternDisplay = element.closest('.pattern-display, .examples-display');
            
            if (patternDisplay) {
                activeTextSelection = {
                    range: range.cloneRange(),
                    text: selection.toString().trim(),
                    element: patternDisplay,
                    startContainer: range.startContainer,
                    endContainer: range.endContainer,
                    startOffset: range.startOffset,
                    endOffset: range.endOffset,
                    timestamp: Date.now()
                };
            }
        }
        
        if (!activeTextSelection) {
            alert('텍스트를 먼저 선택해 주세요.');
            return;
        }
    }
    
    const toolbarRect = textEditorToolbar.getBoundingClientRect();
    colorPalette.style.left = toolbarRect.left + 'px';
    colorPalette.style.top = (toolbarRect.bottom + 10) + 'px';
    colorPalette.style.display = 'flex';
    colorPalette.classList.add('show');
    
    // 폰트 컨트롤 숨기기
    if (fontSizeControls) {
        fontSizeControls.classList.remove('show');
        fontSizeControls.style.display = 'none';
    }
}

// 폰트 크기 컨트롤 표시
function showFontSizeControls(e) {
    if (e) {
        e.stopPropagation();
        e.preventDefault();
    }
    
    if (!activeTextSelection) {
        console.log('No active selection - trying to restore from current selection');
        
        // 현재 브라우저 선택 상태에서 activeTextSelection 복원 시도
        const selection = window.getSelection();
        if (selection.rangeCount > 0 && selection.toString().trim()) {
            const range = selection.getRangeAt(0);
            let element = range.commonAncestorContainer;
            
            if (element.nodeType === Node.TEXT_NODE) {
                element = element.parentElement;
            }
            
            // 편집 가능한 영역 찾기
            let patternDisplay = element.closest('.pattern-display, .examples-display');
            
            if (patternDisplay) {
                activeTextSelection = {
                    range: range.cloneRange(),
                    text: selection.toString().trim(),
                    element: patternDisplay,
                    startContainer: range.startContainer,
                    endContainer: range.endContainer,
                    startOffset: range.startOffset,
                    endOffset: range.endOffset,
                    timestamp: Date.now()
                };
            }
        }
        
        if (!activeTextSelection) {
            alert('텍스트를 먼저 선택해 주세요.');
            return;
        }
    }
    
    const toolbarRect = textEditorToolbar.getBoundingClientRect();
    fontSizeControls.style.left = toolbarRect.left + 'px';
    fontSizeControls.style.top = (toolbarRect.bottom + 10) + 'px';
    fontSizeControls.style.display = 'flex';
    fontSizeControls.classList.add('show');
    
    // 컬러 팔레트 숨기기
    if (colorPalette) {
        colorPalette.classList.remove('show');
        colorPalette.style.display = 'none';
    }
    
    // 현재 선택된 텍스트의 폰트 크기 가져오기
    const currentSize = getCurrentFontSize();
    const slider = document.getElementById('font-size-slider');
    const input = document.getElementById('font-size-input');
    
    if (slider && input) {
        input.value = currentSize;
        // 슬라이더 범위 내에 있을 때만 동기화
        if (currentSize >= 0.5 && currentSize <= 3.0) {
            slider.value = currentSize;
        }
    }
}

// 현재 폰트 크기 가져오기
function getCurrentFontSize() {
    if (!activeTextSelection) return 1.0;
    
    const range = activeTextSelection.range;
    const span = range.commonAncestorContainer.nodeType === Node.TEXT_NODE ?
        range.commonAncestorContainer.parentElement :
        range.commonAncestorContainer;
    
    if (span.style && span.style.fontSize) {
        return parseFloat(span.style.fontSize.replace('em', ''));
    }
    
    return 1.0;
}

// 텍스트 색상 변경
function changeTextColor(color) {
    if (!activeTextSelection) return;
    
    const colorMap = {
        red: '#EF4444',
        orange: '#F97316',
        yellow: '#EAB308',
        green: '#10B981',
        blue: '#3B82F6',
        indigo: '#6366F1',
        purple: '#8B5CF6',
        black: '#1F2937'
    };
    
    // 선택 영역 복원
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(activeTextSelection.range);
    
    applyStyleToSelection('color', colorMap[color]);
    
    // 팔레트만 숨기고 툴바는 유지
    if (colorPalette) {
        colorPalette.classList.remove('show');
        colorPalette.style.display = 'none';
    }
}

// 텍스트 폰트 크기 변경
function changeTextFontSize(size) {
    if (!activeTextSelection) return;
    
    // 선택 영역 복원
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(activeTextSelection.range);
    
    applyStyleToSelection('font-size', `${size}em`);
}


// 새로운 헬퍼 함수: 선택된 HTML 가져오기
function getSelectedHtml(range) {
    const container = document.createElement('div');
    container.appendChild(range.cloneContents());
    return container.innerHTML;
}

function applyStyleToTextOnly(range, property, value) {
    const extractedContent = range.extractContents();
    
    const span = document.createElement('span');
    span.style.setProperty(property, value);
    span.style.whiteSpace = 'pre-wrap';
    span.style.verticalAlign = 'baseline';  /* 추가 */
    span.style.display = 'inline';           /* 추가 */
	
    // 부모 스타일 상속
    const targetNode = range.commonAncestorContainer.nodeType === Node.TEXT_NODE ?
        range.commonAncestorContainer.parentElement :
        range.commonAncestorContainer;
    
    let parentSpan = targetNode.closest('span:not(.blank-box)');
    if (parentSpan) {
        if (parentSpan.style.color && property !== 'color') {
            span.style.color = parentSpan.style.color;
        }
        if (parentSpan.style.fontSize && property !== 'font-size') {
            span.style.fontSize = parentSpan.style.fontSize;
        }
    }
    
    // 텍스트 노드의 공백을 보존하며 추가
    const childNodes = Array.from(extractedContent.childNodes);
    childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
            // 공백을 &nbsp;로 변환
            const text = preserveSpaces(node.textContent);
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = text;
            while (tempDiv.firstChild) {
                span.appendChild(tempDiv.firstChild);
            }
        } else {
            span.appendChild(node);
        }
    });
    
    range.insertNode(span);
    
    // activeTextSelection 업데이트
    const newSpanRange = document.createRange();
    newSpanRange.selectNodeContents(span);
    activeTextSelection.range = newSpanRange;
    activeTextSelection.text = span.textContent;
}

// 새로운 함수: 텍스트만 있는 경우 스타일 적용
function applyStyleToSelection(property, value) {
    if (!activeTextSelection) {
        console.log('No active text selection');
        return;
    }
    
    if (activeTextSelection.element.tagName === 'INPUT' || 
        activeTextSelection.element.tagName === 'TEXTAREA') {
        alert('편집 모드에서는 텍스트 스타일을 적용할 수 없습니다. 먼저 Enter를 눌러 저장한 후 시도해주세요.');
        hideTextEditorControls();
        return;
    }
    
    // blank-box 전용 처리 (최우선)
    if (activeTextSelection.isBlankBox && activeTextSelection.blankBoxElement) {
	    const blankBox = activeTextSelection.blankBoxElement;
	    
	    // 스타일 적용
	    if (property === 'color') {
	        blankBox.style.cssText = blankBox.style.cssText.replace(/color:[^;]+;?/g, '');
	        blankBox.style.setProperty('color', value, 'important');
	        blankBox.setAttribute('data-styled', 'true');
	    } else if (property === 'font-size') {
	        // font-size만 설정하면 em 단위로 설정된 width와 height가 자동으로 조절됨
	        blankBox.style.setProperty('font-size', value, 'important');
	        blankBox.setAttribute('data-styled', 'true');
	    }
	    
	    // 시각적 피드백 제거
	    blankBox.style.outline = '';
	    blankBox.style.outlineOffset = '';
	    
	    // 패턴 데이터 업데이트
	    const patternId = getPatternIdFromElement(activeTextSelection.element);
	    if (patternId) {
	        updatePatternData(patternId);
	    }
	    
	    return;
	}
    
    // 일반 텍스트 처리 (기존 코드)
    try {
        const selection = window.getSelection();
        selection.removeAllRanges();
        
        // DOM 노드가 여전히 문서에 존재하는지 확인
        if (!document.body.contains(activeTextSelection.element)) {
            alert('선택 영역이 더 이상 존재하지 않습니다. 다시 선택해 주세요.');
            hideTextEditorControls();
            return;
        }
        
        // Range 복원
        const range = activeTextSelection.range;
        selection.addRange(range);
        
        // 선택된 영역의 모든 요소 가져오기
        const container = range.commonAncestorContainer;
        const parentElement = container.nodeType === Node.TEXT_NODE ? 
            container.parentElement : container;
        
        // 선택 영역이 blank-box를 포함하는지 확인
        const selectedHtml = getSelectedHtml(range);
        const hasBlankBox = selectedHtml.includes('blank-box');
        
        if (hasBlankBox) {
            // blank-box가 포함된 경우
            applyStyleToMixedContent(range, property, value);
        } else {
            // 일반 텍스트만 있는 경우
            applyStyleToTextOnly(range, property, value);
        }
        
        // 선택 해제
        selection.removeAllRanges();
        
        // 패턴 데이터 업데이트
        const patternId = getPatternIdFromElement(activeTextSelection.element);
        if (patternId) {
            updatePatternData(patternId);
        }
        
    } catch (error) {
        console.error('스타일 적용 오류:', error);
        alert('스타일 적용 중 오류가 발생했습니다. 다시 시도해 주세요.');
        hideTextEditorControls();
    }
}

// 새로운 함수: blank-box와 텍스트가 혼재된 경우
function applyStyleToMixedContent(range, property, value) {
    const fragment = range.extractContents();
    const wrapper = document.createElement('span');
    wrapper.style.setProperty(property, value);
    wrapper.style.whiteSpace = 'pre-wrap';
	wrapper.style.verticalAlign = 'baseline';  /* 추가 */
    wrapper.style.display = 'inline';           /* 추가 */
    
    const childNodes = Array.from(fragment.childNodes);
    
    childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
            if (node.textContent.trim() || node.textContent.includes(' ')) {
                const textSpan = document.createElement('span');
                textSpan.style.setProperty(property, value);
                textSpan.style.whiteSpace = 'pre-wrap';
                textSpan.style.verticalAlign = 'baseline';  /* 추가 */
                textSpan.style.display = 'inline';           /* 추가 */
                
                // 공백 보존 처리
                const preservedText = preserveSpaces(node.textContent);
                textSpan.innerHTML = preservedText;
                
                wrapper.appendChild(textSpan);
            } else if (node.textContent === '') {
                // 빈 텍스트 노드도 보존
                wrapper.appendChild(document.createTextNode(''));
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.classList && node.classList.contains('blank-box')) {
                const clonedBox = node.cloneNode(true);
                // blank-box의 경우 font-size만 설정하면 em 단위가 자동으로 조절됨
                if (property === 'font-size') {
                    clonedBox.style.setProperty('font-size', value, 'important');
                } else {
                    clonedBox.style.setProperty(property, value, 'important');
                }
                clonedBox.setAttribute('data-styled', 'true');
                
                wrapper.appendChild(clonedBox);
            } else {
                // 다른 요소도 공백 보존
                if (node.tagName === 'SPAN') {
	                node.style.whiteSpace = 'pre-wrap';
	                node.style.verticalAlign = 'baseline';      /* 추가 */
	                node.style.display = 'inline';               /* 추가 */
	            }
                node.style.setProperty(property, value);
                wrapper.appendChild(node);
            }
        }
    });
    
    range.insertNode(wrapper);
    
    const newRange = document.createRange();
    newRange.selectNodeContents(wrapper);
    activeTextSelection.range = newRange;
    activeTextSelection.text = wrapper.textContent;
}

// clearSelection 함수도 추가
function clearSelection() {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        selection.removeAllRanges();
    }
}

// 완전히 새로운 함수 추가
function preserveSpaces(text) {
    if (!text) return '';
    
    let result = '';
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        
        if (char === ' ') {
            // 모든 공백을 무조건 &nbsp;로 변환
            result += '&nbsp;';
        } else if (char === '\n') {
            result += '<br>';
        } else if (char === '\t') {
            result += '&nbsp;&nbsp;&nbsp;&nbsp;';
        } else {
            // HTML 특수문자 이스케이프
            if (char === '<') {
                result += '&lt;';
            } else if (char === '>') {
                result += '&gt;';
            } else if (char === '&') {
                result += '&amp;';
            } else {
                result += char;
            }
        }
    }
    
    return result;
}

// 텍스트 스타일 초기화
function resetTextStyle() {
    if (!activeTextSelection) return;
    
    // blank-box 리셋 처리
    if (activeTextSelection.isBlankBox && activeTextSelection.blankBoxElement) {
        const blankBox = activeTextSelection.blankBoxElement;
        
        // 모든 인라인 스타일 제거
        blankBox.removeAttribute('style');
        blankBox.removeAttribute('data-styled');
        
        // 패턴 데이터 업데이트
        const patternId = getPatternIdFromElement(activeTextSelection.element);
        if (patternId) {
            updatePatternData(patternId);
        }
        
        hideTextEditorControls();
        return;
    }
    
    // 일반 텍스트 리셋 처리 (기존 코드)
    try {
        const range = activeTextSelection.range;
        const container = range.commonAncestorContainer;
        const parentElement = container.nodeType === Node.TEXT_NODE ? 
            container.parentElement : container;
        
        // 선택 영역의 HTML 가져오기
        const fragment = range.extractContents();
        const tempDiv = document.createElement('div');
        tempDiv.appendChild(fragment);
        
        // 모든 스타일 제거
        const styledElements = tempDiv.querySelectorAll('[style]');
        styledElements.forEach(el => {
            if (el.classList && el.classList.contains('blank-box')) {
                // blank-box는 스타일만 제거
                el.removeAttribute('style');
            } else if (el.tagName === 'SPAN') {
                // 일반 span은 텍스트만 추출
                const textNode = document.createTextNode(el.textContent);
                el.parentNode.replaceChild(textNode, el);
            }
        });
        
        // 정리된 내용을 다시 삽입
        while (tempDiv.firstChild) {
            range.insertNode(tempDiv.lastChild);
        }
        
        // 선택 해제
        const selection = window.getSelection();
        selection.removeAllRanges();
        
        // 패턴 데이터 업데이트
        const patternId = getPatternIdFromElement(activeTextSelection.element);
        if (patternId) {
            updatePatternData(patternId);
        }
        
        hideTextEditorControls();
    } catch (error) {
        console.error('스타일 초기화 오류:', error);
        hideTextEditorControls();
    }
}

// 패턴 ID 가져오기
function getPatternIdFromElement(element) {
   const patternCard = element.closest('.pattern-card');
   if (patternCard) {
       const id = patternCard.id.replace('pattern-', '');
       return parseInt(id);
   }
   return null;
}

// 패턴 데이터 업데이트
function updatePatternData(patternId) {
    const pattern = patterns.find(p => p.id === patternId);
    const displayElement = document.querySelector(`#pattern-${patternId} .pattern-display`);
    const examplesDisplay = document.querySelector(`#pattern-${patternId} .examples-display`);
    
    if (pattern) {
        if (displayElement && !displayElement.classList.contains('empty')) {
            // HTML 저장 시 공백 보존 확인
            let htmlContent = displayElement.innerHTML;
            
            // white-space 스타일이 없는 span에 추가
            htmlContent = htmlContent.replace(/<span(?![^>]*white-space)/g, '<span style="white-space: pre-wrap;"');
            
            pattern.htmlContent = htmlContent;
        }
        if (examplesDisplay && !examplesDisplay.classList.contains('empty')) {
            let htmlContent = examplesDisplay.innerHTML;
            
            // white-space 스타일이 없는 span에 추가
            htmlContent = htmlContent.replace(/<span(?![^>]*white-space)/g, '<span style="white-space: pre-wrap;"');
            
            pattern.examplesHtmlContent = htmlContent;
        }
    }
}

// 텍스트 에디터 컨트롤 숨기기
function hideTextEditorControls() {
    // blank-box 시각적 피드백 제거
    if (activeTextSelection && activeTextSelection.blankBoxElement) {
        activeTextSelection.blankBoxElement.style.outline = '';
        activeTextSelection.blankBoxElement.style.outlineOffset = '';
    }
    
    // 모든 컨트롤 숨기기
    if (textEditorToolbar) {
        textEditorToolbar.classList.remove('show');
        textEditorToolbar.style.display = 'none';
    }
    if (colorPalette) {
        colorPalette.classList.remove('show');
        colorPalette.style.display = 'none';
    }
    if (fontSizeControls) {
        fontSizeControls.classList.remove('show');
        fontSizeControls.style.display = 'none';
    }
    
    // 입력 필드에 포커스가 있을 때는 selection을 제거하지 않음
    const activeElement = document.activeElement;
    const isInputActive = activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA'
    );
    
    if (!isInputActive) {
        // 현재 선택 상태 정리 (입력 필드가 활성화되지 않은 경우만)
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            selection.removeAllRanges();
        }
    }
    
    // activeTextSelection 초기화 (선택 상태 해제)
    activeTextSelection = null;
}

// 캘린더 외부 클릭으로 닫기
document.addEventListener('click', function(event) {
   if (activeCalendar !== null) {
       const calendarElement = document.getElementById(`calendar-${activeCalendar}`);
       const calendarBtn = event.target.closest('.calendar-btn');
       const isInsideCalendar = event.target.closest('.calendar-dropdown');
       
       if (!calendarBtn && !isInsideCalendar) {
           calendarElement.classList.remove('show');
           activeCalendar = null;
       }
   }
});

// 모바일 더블탭 지원을 위한 변수
let lastTapTime = 0;
let tapCount = 0;
let tapTimer = null;
let mobileSelection = null;

// 모바일 디바이스 감지 함수
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.innerWidth <= 768);
}

// 모바일 터치 이벤트 처리 (개선)
document.addEventListener('touchstart', function(event) {
    if (!isMobileDevice()) return;
    
    const patternDisplay = event.target.closest('.pattern-display');
    const examplesDisplay = event.target.closest('.examples-display');
    
    if (patternDisplay || examplesDisplay) {
        const currentTime = new Date().getTime();
        const tapDelay = currentTime - lastTapTime;
        
        if (tapDelay < 300 && tapDelay > 50) {
            // 더블탭 감지
            event.preventDefault();
            
            if (patternDisplay) {
                const patternId = patternDisplay.dataset.patternId;
                if (patternId) {
                    editPattern(parseInt(patternId));
                }
            } else if (examplesDisplay) {
                const card = examplesDisplay.closest('.pattern-card');
                if (card) {
                    const patternId = parseInt(card.id.replace('pattern-', ''));
                    editExamples(patternId);
                }
            }
        }
        
        lastTapTime = currentTime;
    }
});

// 데스크톱 우클릭은 그대로 유지
document.addEventListener('contextmenu', function(event) {
    // 모바일에서는 우클릭 방지
    if (isMobileDevice()) {
        event.preventDefault();
        return;
    }
    
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (selectedText) {
        handleTextSelectionOnRightClick(event);
    } else {
        event.preventDefault();
    }
});

// 초기화
updateDate();
renderPatterns();

// 첫 패턴 자동 추가
addPattern();
