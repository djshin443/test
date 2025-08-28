// core.js - 핵심 패턴 관리 기능

// 전역 변수들
let patterns = [];
let patternCounter = 0;
let examplesVisible = false;

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

// 텍스트에서 [] 를 네모 박스로 변환 (HTML 컨텐츠 지원)
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

// 예시 표시 상태 적용 함수
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
    
    // 예시 표시 상태 적용
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
    
    // HTML 컨텐츠가 있으면 우선 사용, 없으면 일반 텍스트 처리
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
        // HTML 컨텐츠 초기화 (새로운 텍스트 입력 시)
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
        // HTML 컨텐츠 초기화 (새로운 텍스트 입력 시)
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
    
    // 예시 표시 상태 적용
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

// 초기화
updateDate();
renderPatterns();

// 첫 패턴 자동 추가
addPattern();