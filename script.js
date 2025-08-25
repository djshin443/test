let patterns = [];
let patternCounter = 0;
let examplesVisible = false; // 예제 표시 상태를 전역적으로 관리

let activeCalendar = null;
let currentCalendarDate = new Date();

// XSS 방지를 위한 HTML 이스케이프 함수
function escapeHTML(text) {
const div = document.createElement(‘div’);
div.textContent = text;
return div.innerHTML;
}

// XSS 방지를 위한 입력값 검증 및 정화
function sanitizeInput(input) {
if (typeof input !== ‘string’) return ‘’;

```
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
```

}

// 날짜 포맷팅 유틸리티 함수들
function formatDateToYYMMDD(date) {
const year = date.getFullYear().toString().slice(-2);
const month = (date.getMonth() + 1).toString().padStart(2, ‘0’);
const day = date.getDate().toString().padStart(2, ‘0’);

```
const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const dayOfWeek = dayNames[date.getDay()];

return `${year}.${month}.${day} (${dayOfWeek})`;
```

}

function parseYYMMDDToDate(dateStr) {
// 요일 부분 제거 - 괄호와 그 안의 내용을 제거
const dateOnly = dateStr.split(’ ‘)[0];
const parts = dateOnly.split(’.’);
if (parts.length !== 3) return new Date();

```
const year = 2000 + parseInt(parts[0]);
const month = parseInt(parts[1]) - 1;
const day = parseInt(parts[2]);

return new Date(year, month, day);
```

}

function validateDateFormat(dateStr) {
// 요일이 포함된 형식과 포함되지 않은 형식 둘 다 허용
const regexWithDay = /^\d{2}.\d{2}.\d{2} ([A-Za-z]{3})$/;
const regexWithoutDay = /^\d{2}.\d{2}.\d{2}$/;

```
if (!regexWithDay.test(dateStr) && !regexWithoutDay.test(dateStr)) {
    return false;
}

const date = parseYYMMDDToDate(dateStr);
return !isNaN(date.getTime());
```

}

// 날짜 업데이트 - 주간으로 변경
function updateDate() {
const now = new Date();
const startOfWeek = new Date(now);
startOfWeek.setDate(now.getDate() - now.getDay()); // Sun 시작
const endOfWeek = new Date(startOfWeek);
endOfWeek.setDate(startOfWeek.getDate() + 6);

const options = { month: ‘short’, day: ‘numeric’ };
const startStr = startOfWeek.toLocaleDateString(‘en-US’, options);
const endStr = endOfWeek.toLocaleDateString(‘en-US’, options);
const year = now.getFullYear();

const badge = document.getElementById(‘date-badge’);
if (badge) badge.textContent = `${startStr} - ${endStr}, ${year}`;
}

// 텍스트에서 [] 를 네모 박스로 변환 (공백 개수로 크기 결정) - XSS 방지 적용
function processBlankBoxes(text, isTitle = false) {
if (isTitle) {
return escapeHTML(text); // 제목에서는 HTML 이스케이프만 적용
}

```
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
```

}

// 패턴 카드의 높이 자동 조절 (내용에 따라)
function adjustCardSize(patternId) {
const card = document.getElementById(`pattern-${patternId}`);
const pattern = patterns.find(p => p.id === patternId);

```
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
```

}

// 예제 표시 상태 적용 함수
function applyExamplesVisibility() {
const examplesSections = document.querySelectorAll(’.examples-section’);
const patternCards = document.querySelectorAll(’.pattern-card’);

```
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
```

}

function renderPatterns() {
const grid = document.getElementById(‘patterns-grid’);
grid.innerHTML = ‘’;

```
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
```

}

// 패턴 카드 생성
function createPatternCard(pattern, number) {
const card = document.createElement(‘div’);
card.className = ‘pattern-card’;
card.id = `pattern-${pattern.id}`;

```
// 패턴 텍스트에서 [] 를 네모 박스로 변환
const processedPattern = pattern.pattern ? processBlankBoxes(pattern.pattern) : '';
const processedExamples = pattern.examples ? processBlankBoxes(pattern.examples) : '';

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
        <div class="pattern-display ${!pattern.pattern ? 'empty' : ''}" 
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
        <div class="examples-display ${!pattern.examples ? 'empty' : ''}"
             onclick="editExamples(${pattern.id})">
            ${processedExamples || 'Click to add example sentences (use [], [ ], [   ] for different sizes)'}
        </div>
    </div>
`;

return card;
```

}

// 패턴 편집
function editPattern(id) {
const card = document.getElementById(`pattern-${id}`);
const input = document.getElementById(`pattern-input-${id}`);

```
card.classList.add('editing');
input.focus();
input.select();
```

}

// 예시 편집
function editExamples(id) {
const card = document.getElementById(`pattern-${id}`);
const textarea = document.getElementById(`examples-input-${id}`);

```
card.classList.add('editing');
textarea.focus();
```

}

// 패턴 저장
function savePattern(id) {
const card = document.getElementById(`pattern-${id}`);
const input = document.getElementById(`pattern-input-${id}`);
const pattern = patterns.find(p => p.id === id);

```
if (pattern) {
    pattern.pattern = input.value.trim();
    adjustCardSize(pattern.id);
    renderPatterns();
}
```

}

// 예시 저장
function saveExamples(id) {
const card = document.getElementById(`pattern-${id}`);
const textarea = document.getElementById(`examples-input-${id}`);
const pattern = patterns.find(p => p.id === id);

```
if (pattern) {
    pattern.examples = textarea.value.trim();
    adjustCardSize(pattern.id);
    renderPatterns();
}
```

}

// 패턴 입력 키 핸들링
function handlePatternKeydown(event, id) {
if (event.key === ‘Enter’) {
event.preventDefault();
savePattern(id);
} else if (event.key === ‘Escape’) {
event.preventDefault();
const card = document.getElementById(`pattern-${id}`);
const input = document.getElementById(`pattern-input-${id}`);
const pattern = patterns.find(p => p.id === id);

```
    if (pattern) {
        input.value = pattern.pattern || '';
    }
    card.classList.remove('editing');
}
```

}

// 예시 입력 키 핸들링
function handleExamplesKeydown(event, id) {
if (event.key === ‘Escape’) {
event.preventDefault();
const card = document.getElementById(`pattern-${id}`);
const textarea = document.getElementById(`examples-input-${id}`);
const pattern = patterns.find(p => p.id === id);

```
    if (pattern) {
        textarea.value = pattern.examples || '';
    }
    card.classList.remove
```