// text-editor.js - 텍스트 편집 및 스타일링

// 텍스트 에디터 관련 전역 변수
let activeTextSelection = null;
let colorPalette = null;
let fontSizeControls = null;
let textEditorToolbar = null;

// 폰트 크기 기준값 관리를 위한 전역 변수 추가
let originalFontSizes = new Map(); // 각 요소의 원본 폰트 크기 저장

// 모바일 더블탭 지원을 위한 변수
let lastTapTime = 0;
let tapCount = 0;
let tapTimer = null;
let mobileSelection = null;

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
    
    // 먼저 툴바를 보이게 한 후 실제 크기 측정
    textEditorToolbar.style.visibility = 'hidden';
    textEditorToolbar.style.display = 'flex';
    textEditorToolbar.classList.add('show');
    
    // 실제 툴바 크기 측정
    const toolbarRect = textEditorToolbar.getBoundingClientRect();
    const toolbarWidth = toolbarRect.width;
    const toolbarHeight = toolbarRect.height;
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;
    
    // X 좌표 조정 (스크롤 위치 고려)
    let leftPosition = x + scrollX;
    if (leftPosition + toolbarWidth > viewportWidth + scrollX) {
        leftPosition = viewportWidth + scrollX - toolbarWidth - 10;
    }
    if (leftPosition < scrollX + 10) {
        leftPosition = scrollX + 10;
    }
    
    // Y 좌표 조정 (마우스 위치에서 약간 위쪽에 표시, 스크롤 위치 고려)
    let topPosition = y + scrollY - toolbarHeight - 10;
    if (topPosition < scrollY + 10) {
        topPosition = y + scrollY + 20; // 마우스 아래쪽에 표시
    }
    if (topPosition + toolbarHeight > viewportHeight + scrollY - 20) {
        topPosition = viewportHeight + scrollY - toolbarHeight - 20;
    }
    
    textEditorToolbar.style.left = leftPosition + 'px';
    textEditorToolbar.style.top = topPosition + 'px';
    textEditorToolbar.style.visibility = 'visible';
    
    console.log('툴바 스타일 설정됨:', {
        left: textEditorToolbar.style.left,
        top: textEditorToolbar.style.top,
        mouseX: x,
        mouseY: y,
        scrollX: scrollX,
        scrollY: scrollY
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
    
    // blank-box의 경우
    if (activeTextSelection.isBlankBox && activeTextSelection.blankBoxElement) {
        const blankBox = activeTextSelection.blankBoxElement;
        if (blankBox.style.fontSize) {
            return parseFloat(blankBox.style.fontSize.replace('em', ''));
        }
        return 1.0; // 기본값
    }
    
    // 일반 텍스트의 경우
    const range = activeTextSelection.range;
    if (!range) return 1.0;
    
    const container = range.commonAncestorContainer;
    const element = container.nodeType === Node.TEXT_NODE ? 
        container.parentElement : container;
    
    // 현재 요소에서 폰트 크기 찾기
    let currentElement = element;
    while (currentElement && currentElement !== document.body) {
        if (currentElement.style && currentElement.style.fontSize) {
            const fontSize = currentElement.style.fontSize;
            if (fontSize.includes('em')) {
                return parseFloat(fontSize.replace('em', ''));
            } else if (fontSize.includes('px')) {
                // px을 em으로 변환 (기본 폰트 크기 16px 기준)
                const pxValue = parseFloat(fontSize.replace('px', ''));
                return pxValue / 16;
            }
        }
        currentElement = currentElement.parentElement;
    }
    
    return 1.0; // 기본값
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

function changeTextFontSize(size) {
    if (!activeTextSelection) return;
    
    // blank-box 처리
    if (activeTextSelection.isBlankBox && activeTextSelection.blankBoxElement) {
        const blankBox = activeTextSelection.blankBoxElement;
        
        // 원본 크기가 저장되지 않았다면 현재 크기를 원본으로 저장
        const elementId = blankBox.getAttribute('data-element-id') || 
            'blank-box-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        blankBox.setAttribute('data-element-id', elementId);
        
        if (!originalFontSizes.has(elementId)) {
            const currentSize = blankBox.style.fontSize ? 
                parseFloat(blankBox.style.fontSize.replace('em', '')) : 1.0;
            originalFontSizes.set(elementId, currentSize);
        }
        
        blankBox.style.setProperty('font-size', `${size}em`, 'important');
        blankBox.setAttribute('data-styled', 'true');
        
        // 패턴 데이터 업데이트
        const patternId = getPatternIdFromElement(activeTextSelection.element);
        if (patternId) {
            updatePatternData(patternId);
        }
        return;
    }
    
    // 일반 텍스트 처리
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
    // 선택 영역의 앞뒤 공백 확인
    const startContainer = range.startContainer;
    const endContainer = range.endContainer;
    const startOffset = range.startOffset;
    const endOffset = range.endOffset;
    
    // 앞쪽 공백 확인
    let leadingSpace = '';
    if (startContainer.nodeType === Node.TEXT_NODE && startOffset > 0) {
        const prevChar = startContainer.textContent.charAt(startOffset - 1);
        if (prevChar === ' ' || prevChar === '\u00A0') {
            leadingSpace = '&nbsp;';
        }
    }
    
    // 뒤쪽 공백 확인
    let trailingSpace = '';
    if (endContainer.nodeType === Node.TEXT_NODE && endOffset < endContainer.textContent.length) {
        const nextChar = endContainer.textContent.charAt(endOffset);
        if (nextChar === ' ' || nextChar === '\u00A0') {
            trailingSpace = '&nbsp;';
        }
    }
    
    const extractedContent = range.extractContents();
    
    const span = document.createElement('span');
    span.style.setProperty(property, value);
    span.style.whiteSpace = 'pre-wrap';
    span.style.verticalAlign = 'baseline';
    span.style.display = 'inline';
	
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
    
    // 앞쪽 공백 추가
    if (leadingSpace) {
        const leadingSpaceElement = document.createElement('span');
        leadingSpaceElement.innerHTML = leadingSpace;
        leadingSpaceElement.style.whiteSpace = 'pre-wrap';
        span.appendChild(leadingSpaceElement);
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
    
    // 뒤쪽 공백 추가
    if (trailingSpace) {
        const trailingSpaceElement = document.createElement('span');
        trailingSpaceElement.innerHTML = trailingSpace;
        trailingSpaceElement.style.whiteSpace = 'pre-wrap';
        span.appendChild(trailingSpaceElement);
    }
    
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
        
        // 원본 크기 저장
        const elementId = blankBox.getAttribute('data-element-id') || 
            'blank-box-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        blankBox.setAttribute('data-element-id', elementId);
        
        if (!originalFontSizes.has(elementId) && property === 'font-size') {
            const currentSize = blankBox.style.fontSize ? 
                parseFloat(blankBox.style.fontSize.replace('em', '')) : 1.0;
            originalFontSizes.set(elementId, currentSize);
        }
        
        // 스타일 적용
        if (property === 'color') {
            blankBox.style.cssText = blankBox.style.cssText.replace(/color:[^;]+;?/g, '');
            blankBox.style.setProperty('color', value, 'important');
            blankBox.setAttribute('data-styled', 'true');
        } else if (property === 'font-size') {
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
    
    // 일반 텍스트 처리
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
        
        // 원본 크기 저장 (font-size 변경 시)
        if (property === 'font-size') {
            const container = range.commonAncestorContainer;
            const element = container.nodeType === Node.TEXT_NODE ? 
                container.parentElement : container;
            
            const elementId = element.getAttribute('data-element-id') || 
                'text-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            element.setAttribute('data-element-id', elementId);
            
            if (!originalFontSizes.has(elementId)) {
                const currentSize = getCurrentFontSize();
                originalFontSizes.set(elementId, currentSize);
            }
        }
        
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
        const elementId = blankBox.getAttribute('data-element-id');
        
        // 원본 크기가 있다면 복원, 없다면 1.0으로 설정
        if (elementId && originalFontSizes.has(elementId)) {
            const originalSize = originalFontSizes.get(elementId);
            blankBox.style.setProperty('font-size', `${originalSize}em`, 'important');
        } else {
            // 모든 인라인 스타일 제거 (기본값으로 복원)
            blankBox.removeAttribute('style');
        }
        
        blankBox.removeAttribute('data-styled');
        
        // 패턴 데이터 업데이트
        const patternId = getPatternIdFromElement(activeTextSelection.element);
        if (patternId) {
            updatePatternData(patternId);
        }
        
        hideTextEditorControls();
        return;
    }
    
    // 일반 텍스트 리셋 처리
    try {
        const range = activeTextSelection.range;
        const container = range.commonAncestorContainer;
        const parentElement = container.nodeType === Node.TEXT_NODE ? 
            container.parentElement : container;
        
        // 선택 영역의 HTML 가져오기
        const fragment = range.extractContents();
        const tempDiv = document.createElement('div');
        tempDiv.appendChild(fragment);
        
        // 모든 스타일 제거하면서 원본 크기로 복원
        const styledElements = tempDiv.querySelectorAll('[style]');
        styledElements.forEach(el => {
            if (el.classList && el.classList.contains('blank-box')) {
                // blank-box는 원본 크기로 복원
                const elementId = el.getAttribute('data-element-id');
                if (elementId && originalFontSizes.has(elementId)) {
                    const originalSize = originalFontSizes.get(elementId);
                    el.style.cssText = '';
                    el.style.setProperty('font-size', `${originalSize}em`, 'important');
                } else {
                    el.removeAttribute('style');
                }
                el.removeAttribute('data-styled');
            } else if (el.tagName === 'SPAN') {
                // 일반 span은 원본 크기로 복원 후 텍스트만 추출
                const elementId = el.getAttribute('data-element-id');
                if (elementId && originalFontSizes.has(elementId)) {
                    // 원본 크기가 1.0이 아니라면 유지
                    const originalSize = originalFontSizes.get(elementId);
                    if (originalSize !== 1.0) {
                        el.style.cssText = '';
                        el.style.setProperty('font-size', `${originalSize}em`);
                        el.removeAttribute('data-element-id');
                    } else {
                        // 기본 크기라면 완전 제거
                        const textNode = document.createTextNode(el.textContent);
                        el.parentNode.replaceChild(textNode, el);
                    }
                } else {
                    // 원본 크기 정보가 없다면 텍스트만 추출
                    const textNode = document.createTextNode(el.textContent);
                    el.parentNode.replaceChild(textNode, el);
                }
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