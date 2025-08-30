// text-editor.js - 텍스트 편집 및 스타일링

// 텍스트 에디터 관련 전역 변수
let activeTextSelection = null;
let colorPalette = null;
let fontSizeControls = null;
let textEditorToolbar = null;

// 폰트 크기 기준값 관리를 위한 전역 변수 추가
let originalFontSizes = new Map(); // 각 요소의 원본 폰트 크기 저장

// --- UI sync & re-entrancy guards ---
let isSyncingFontUI = false;   // 슬라이더 <-> 입력 동기화 가드
let isApplyingFontSize = false; // 폰트 적용 재진입 가드

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
    // 커스텀 드래그 기능 초기화
    initCustomDragSelection();
    
    // 블랭크박스 전용 클릭 이벤트 리스너 추가
    document.addEventListener('click', function(event) {
		const blankBox = event.target.closest('.blank-box');
		if (blankBox) {
			const patternDisplay = blankBox.closest('.pattern-display, .examples-display');
			
			if (patternDisplay && !patternDisplay.closest('.pattern-card.editing')) {
				// 편집 모드가 아닐 때는 outline 표시하지 않음
				activeTextSelection = {
					isBlankBox: true,
					blankBoxElement: blankBox,
					element: patternDisplay,
					text: '[]',
					timestamp: Date.now()
				};
				
				// 편집 모드가 아니므로 시각적 피드백 제거
				// blankBox.style.outline = '2px solid #6366F1';
				// blankBox.style.outlineOffset = '2px';
				
				console.log('블랭크박스 선택됨:', blankBox);
				event.stopPropagation();
				return;
			}
		}
	});
    
    // 마우스 다운 시 기존 선택 해제
    document.addEventListener('mousedown', function(event) {
        // 툴바나 컨트롤 영역이 아닌 곳을 클릭할 때만
        if (!event.target.closest('#text-editor-toolbar') &&
            !event.target.closest('#color-palette') &&
            !event.target.closest('#font-size-controls')) {
            
            // 드래그가 시작되면 기존 activeTextSelection 초기화
            if (activeTextSelection && !event.target.closest('.pattern-display, .examples-display')) {
                activeTextSelection = null;
            }
        }
    });
    
    // mouseup 이벤트로 텍스트 선택 감지 및 툴바 활성화
    document.addEventListener('mouseup', handleTextSelection);
    
    // 키보드 선택도 지원 (Shift + 화살표 등)
    document.addEventListener('keyup', handleTextSelection);
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
    slider.addEventListener('input', function () {
	  if (!activeTextSelection) return;
	  const value = parseFloat(this.value);
	  if (Number.isNaN(value)) return;

	  isSyncingFontUI = true;
	  input.value = value;      // 여기서 input의 input 이벤트가 돌지 않게 플래그로 보호
	  isSyncingFontUI = false;

	  changeTextFontSize(value);
	});
		
    // 입력 필드 이벤트
	input.addEventListener('input', function () {
	  if (!activeTextSelection || isSyncingFontUI) return;

	  let value = parseFloat(this.value);
	  if (Number.isNaN(value)) return;

	  // 범위 클램프
	  if (value < 0.5) value = 0.5;
	  if (value > 5.0) value = 5.0;
	  this.value = value;

	  // 슬라이더 범위 내에서만 동기화
	  if (value >= 0.5 && value <= 3.0) {
		isSyncingFontUI = true;
		slider.value = value;   // 여기서 슬라이더의 input 이벤트가 돌지 않게 플래그로 보호
		isSyncingFontUI = false;
	  }

	  changeTextFontSize(value);
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
        showColorPalette(e);
    });
    
    document.getElementById('toolbar-size-btn').addEventListener('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        showFontSizeControls(e);
    });
    
    document.getElementById('toolbar-reset-btn').addEventListener('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
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
    
    // 입력 필드들 (input, textarea) 클릭 시에는 컨트롤 숨기지 않음
    const isInputField = event.target.matches('input, textarea') || event.target.closest('input, textarea');
    if (isInputField) {
        return;
    }
    
    // 패턴 디스플레이나 예시 디스플레이 클릭은 무시
    const isDisplayClick = event.target.closest('.pattern-display, .examples-display');
    if (isDisplayClick) {
        return;
    }
    
    // 그 외의 모든 곳을 클릭하면 선택 해제하고 컨트롤 숨기기
    hideTextEditorControls();
});

// 텍스트 선택 처리 (선택 완료 시 바로 툴바 활성화)
function handleTextSelection(event) {
    // 툴바나 컨트롤 관련 요소 클릭시 무시
    if (event.target && (
        event.target.closest('#text-editor-toolbar') ||
        event.target.closest('#color-palette') ||
        event.target.closest('#font-size-controls')
    )) {
        return;
    }
    
    setTimeout(() => {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        
        if (!selectedText || selection.rangeCount === 0) {
			console.log('스타일 적용 완료, activeTextSelection 해제');
            // 선택이 없을 때 activeTextSelection 초기화
            activeTextSelection = null;
            return;
        }
        
        const range = selection.getRangeAt(0);
        let element = range.commonAncestorContainer;
        
        if (element.nodeType === Node.TEXT_NODE) {
            element = element.parentElement;
        }
        
        // blank-box 직접 선택 확인
        if (element.classList && element.classList.contains('blank-box')) {
			const patternDisplay = element.closest('.pattern-display, .examples-display');
			
			if (!patternDisplay) return;
			
			// 편집 모드 확인
			const isEditing = patternDisplay.closest('.pattern-card.editing');
			
			activeTextSelection = {
				isBlankBox: true,
				blankBoxElement: element,
				element: patternDisplay,
				text: '[]',
				timestamp: Date.now()
			};
			
			// 편집 모드일 때만 시각적 피드백
			if (isEditing) {
				element.style.outline = '2px solid #6366F1';
				element.style.outlineOffset = '2px';
			}
			
			return;
		}
        
		// blank-box의 자식(예: .blank-text)을 선택했을 때도 블랭크로 처리
		const blankAncestor = element.closest && element.closest('.blank-box');
		if (blankAncestor) {
		  const patternDisplay = blankAncestor.closest('.pattern-display, .examples-display');
		  if (patternDisplay) {
			const isEditing = !!patternDisplay.closest('.pattern-card.editing');
			activeTextSelection = {
			  isBlankBox: true,
			  blankBoxElement: blankAncestor,
			  element: patternDisplay,
			  text: '[]',
			  timestamp: Date.now()
			};
			if (isEditing) {
			  blankAncestor.style.outline = '2px solid #6366F1';
			  blankAncestor.style.outlineOffset = '2px';
			}
			return;
		  }
		}
		
        let patternDisplay = element.closest('.pattern-display, .examples-display');
        
        if (!patternDisplay) {
            return;
        }
        
        // 입력 필드에서 선택한 경우 무시
        if (patternDisplay.tagName === 'INPUT' || patternDisplay.tagName === 'TEXTAREA') {
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
        
    }, 50);
}

// 컬러 팔레트 표시
function showColorPalette(e) {
    if (e) {
        e.stopPropagation();
        e.preventDefault();
    }
    
    if (!activeTextSelection) {
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
    colorPalette.style.top = (toolbarRect.top - 150) + 'px';
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
    fontSizeControls.style.top = (toolbarRect.top - 180) + 'px';
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
				return pxValue / 18;
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
    
    // blank-box 처리
    if (activeTextSelection.isBlankBox && activeTextSelection.blankBoxElement) {
        const blankBox = activeTextSelection.blankBoxElement;
        blankBox.style.setProperty('color', colorMap[color], 'important');
        blankBox.setAttribute('data-styled', 'true');
        
        // 시각적 피드백 제거
        blankBox.style.outline = '';
        blankBox.style.outlineOffset = '';
        
        // 팔레트만 숨기고 툴바는 유지
        if (colorPalette) {
            colorPalette.classList.remove('show');
            colorPalette.style.display = 'none';
        }
        
        // 패턴 데이터 업데이트
        const patternId = getPatternIdFromElement(activeTextSelection.element);
        if (patternId) {
            updatePatternData(patternId);
        }
        
        return;
    }
    
    // 일반 텍스트 처리
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
  if (isApplyingFontSize) return;
  isApplyingFontSize = true;
  try {
    const BASE_FONT_SIZE = 18;

    // blank-box 처리
    if (activeTextSelection.isBlankBox && activeTextSelection.blankBoxElement) {
      const blankBox = activeTextSelection.blankBoxElement;

      const elementId = blankBox.getAttribute('data-element-id') ||
        'blank-box-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      blankBox.setAttribute('data-element-id', elementId);

      if (!originalFontSizes.has(elementId)) {
        const currentSize = blankBox.style.fontSize
          ? parseFloat(blankBox.style.fontSize.replace('px', '')) / BASE_FONT_SIZE
          : 1.0;
        originalFontSizes.set(elementId, currentSize);
      }

      const pixelSize = BASE_FONT_SIZE * size;
      blankBox.style.setProperty('font-size', `${pixelSize}px`, 'important');
      blankBox.setAttribute('data-styled', 'true');

      const patternId = getPatternIdFromElement(activeTextSelection.element);
      if (patternId) updatePatternData(patternId);

      return; // 여기서 함수 종료 - 일반 텍스트 처리로 진행하지 않음
    }

    // 일반 텍스트 처리
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(activeTextSelection.range);

    const pixelSize = BASE_FONT_SIZE * size;
    applyStyleToSelection('font-size', `${pixelSize}px`);
  } finally {
    isApplyingFontSize = false;
  }
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
    
    // 텍스트 노드 추가 - 공백을 &nbsp;로 변환하여 보존
    const childNodes = Array.from(extractedContent.childNodes);
    childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
            // 공백을 &nbsp;로 변환하여 HTML에서도 유지되도록 함
            const text = node.textContent;
            if (text) {
                // 모든 공백을 &nbsp;로 변환
                const preservedText = text.replace(/ /g, '\u00A0');
                const textNode = document.createTextNode(preservedText);
                span.appendChild(textNode);
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
	console.log('applyStyleToSelection 호출됨:', property, value);
    console.log('activeTextSelection:', activeTextSelection);
    if (!activeTextSelection) {
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
		console.log('블랭크박스 처리 시작');
        const blankBox = activeTextSelection.blankBoxElement;
		console.log('처리할 블랭크박스:', blankBox);
        
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

// 새로운 함수: blank-box와 텍스트가 혼재된 경우 - 안전한 방식으로 처리
function applyStyleToMixedContent(range, property, value) {
    // 선택된 영역의 내용을 추출
    const fragment = range.extractContents();
    const tempContainer = document.createElement('div');
    tempContainer.appendChild(fragment);
    
    // 모든 노드를 순회하면서 처리
    const processNode = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            // 텍스트 노드가 내용이 있는 경우
            if (node.textContent && (node.textContent.trim() || node.textContent.includes(' '))) {
                const textSpan = document.createElement('span');
                textSpan.style.setProperty(property, value);
                textSpan.style.whiteSpace = 'pre-wrap';
                textSpan.style.verticalAlign = 'baseline';
                textSpan.style.display = 'inline';
                textSpan.innerHTML = preserveSpaces(node.textContent);
                return textSpan;
            }
            return node;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.classList && node.classList.contains('blank-box')) {
                // blank-box는 직접 스타일만 적용하고 그대로 반환
                if (property === 'color') {
                    node.style.setProperty('color', value, 'important');
                } else if (property === 'font-size') {
                    node.style.setProperty('font-size', value, 'important');
                }
                node.setAttribute('data-styled', 'true');
                
                // blank-box 뒤에 보이지 않는 텍스트 노드 추가
                const invisibleText = document.createTextNode('\u200B'); // Zero-width space
                
                // DocumentFragment 생성하여 blank-box와 텍스트를 함께 반환
                const fragment = document.createDocumentFragment();
                fragment.appendChild(node);
                fragment.appendChild(invisibleText);
                return fragment;
                
            } else if (node.tagName === 'SPAN') {
                // 기존 span 요소는 스타일만 추가
                node.style.setProperty(property, value);
                node.style.whiteSpace = 'pre-wrap';
                node.style.verticalAlign = 'baseline';
                node.style.display = 'inline';
                
                // 자식 노드들도 재귀적으로 처리
                const childNodes = Array.from(node.childNodes);
                childNodes.forEach((childNode, index) => {
                    const processedChild = processNode(childNode);
                    if (processedChild !== childNode) {
                        if (processedChild instanceof DocumentFragment) {
                            // DocumentFragment인 경우 특별 처리
                            const nodes = Array.from(processedChild.childNodes);
                            nodes.forEach(n => {
                                node.insertBefore(n, childNode);
                            });
                            node.removeChild(childNode);
                        } else {
                            node.replaceChild(processedChild, childNode);
                        }
                    }
                });
                return node;
            } else {
                // 다른 요소들은 자식 노드 처리 후 스타일 적용
                const childNodes = Array.from(node.childNodes);
                childNodes.forEach((childNode, index) => {
                    const processedChild = processNode(childNode);
                    if (processedChild !== childNode) {
                        if (processedChild instanceof DocumentFragment) {
                            // DocumentFragment인 경우 특별 처리
                            const nodes = Array.from(processedChild.childNodes);
                            nodes.forEach(n => {
                                node.insertBefore(n, childNode);
                            });
                            node.removeChild(childNode);
                        } else {
                            node.replaceChild(processedChild, childNode);
                        }
                    }
                });
                node.style.setProperty(property, value);
                return node;
            }
        }
        return node;
    };
    
    // 최상위 노드들 처리
    const childNodes = Array.from(tempContainer.childNodes);
    const processedNodes = [];
    
    childNodes.forEach(node => {
        const processedNode = processNode(node);
        if (processedNode instanceof DocumentFragment) {
            // DocumentFragment인 경우 모든 자식 노드들을 추가
            Array.from(processedNode.childNodes).forEach(child => {
                processedNodes.push(child);
            });
        } else {
            processedNodes.push(processedNode);
        }
    });
    
    // DocumentFragment를 사용하여 순서 유지하면서 한번에 삽입
    const fragmentToInsert = document.createDocumentFragment();
    processedNodes.forEach(node => {
        fragmentToInsert.appendChild(node);
    });
    
    // 한 번에 모든 노드 삽입
    range.insertNode(fragmentToInsert);
    
    // 새로운 범위 설정
    try {
        const newRange = document.createRange();
        if (processedNodes.length > 0) {
            newRange.setStartBefore(processedNodes[0]);
            newRange.setEndAfter(processedNodes[processedNodes.length - 1]);
        }
        activeTextSelection.range = newRange;
    } catch (e) {
        // 범위 설정 실패 시 원본 범위 유지
        activeTextSelection.range = range;
    }
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
            // 공백을 그대로 유지 (nbsp로 변환하지 않음)
            result += ' ';
        } else if (char === '\n') {
            result += '<br>';
        } else if (char === '\t') {
            result += '    '; // 탭을 4개 공백으로
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
        
        // 모든 스타일 제거
        blankBox.removeAttribute('style');
        blankBox.removeAttribute('data-styled');
        blankBox.removeAttribute('data-element-id');
        
        // 패턴 데이터 업데이트
        const patternId = getPatternIdFromElement(activeTextSelection.element);
        if (patternId) {
            updatePatternData(patternId);
        }
        
        hideTextEditorControls();
        return;
    }
    
    // 일반 텍스트 리셋 처리 (블랭크박스 제외)
    try {
        const range = activeTextSelection.range;
        
        // 선택 영역에 블랭크박스가 포함되어 있는지 확인
        const fragment = range.cloneContents();
        const tempDiv = document.createElement('div');
        tempDiv.appendChild(fragment);
        
        const hasBlankBox = tempDiv.querySelector('.blank-box');
        
        if (hasBlankBox) {
            // 블랭크박스가 포함된 경우 - 스타일만 제거
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            
            const extractedContent = range.extractContents();
            const container = document.createElement('div');
            container.appendChild(extractedContent);
            
            // 모든 스타일 제거하되 블랭크박스는 유지
            container.querySelectorAll('[style]').forEach(el => {
                if (!el.classList.contains('blank-box')) {
                    el.removeAttribute('style');
                }
            });
            
            // span 태그 제거 (블랭크박스 제외)
            container.querySelectorAll('span').forEach(span => {
                if (!span.classList.contains('blank-box') && 
                    !span.classList.contains('blank-text')) {
                    const parent = span.parentNode;
                    while (span.firstChild) {
                        parent.insertBefore(span.firstChild, span);
                    }
                    parent.removeChild(span);
                }
            });
            
            // 정리된 내용 다시 삽입
            while (container.firstChild) {
                range.insertNode(container.lastChild);
            }
            
        } else {
            // 블랭크박스가 없는 경우 - 순수 텍스트로 변환
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            
            const extractedContent = range.extractContents();
            const textContent = extractedContent.textContent;
            const textNode = document.createTextNode(textContent);
            range.insertNode(textNode);
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
            
            // 빈 블랭크박스 제거 (blank-text가 비어있거나 공백만 있는 경우)
            htmlContent = htmlContent.replace(
                /<span[^>]*class="blank-box[^"]*"[^>]*>\s*<span[^>]*class="blank-text"[^>]*>\s*<\/span>\s*<\/span>/g,
                ''
            );
            
            // 연속된 공백 제거
            htmlContent = htmlContent.replace(/\s{2,}/g, ' ');
            
            // blank-text가 비어있으면 기본값 추가
            htmlContent = htmlContent.replace(
                /<span class="blank-text">\s*<\/span>/g,
                '<span class="blank-text">____</span>'
            );
            
            pattern.htmlContent = htmlContent;
        }
        if (examplesDisplay && !examplesDisplay.classList.contains('empty')) {
            let htmlContent = examplesDisplay.innerHTML;
            
            // 빈 블랭크박스 제거
            htmlContent = htmlContent.replace(
                /<span[^>]*class="blank-box[^"]*"[^>]*>\s*<span[^>]*class="blank-text"[^>]*>\s*<\/span>\s*<\/span>/g,
                ''
            );
            
            // 연속된 공백 제거
            htmlContent = htmlContent.replace(/\s{2,}/g, ' ');
            
            // blank-text가 비어있으면 기본값 추가
            htmlContent = htmlContent.replace(
                /<span class="blank-text">\s*<\/span>/g,
                '<span class="blank-text">____</span>'
            );
            
            pattern.examplesHtmlContent = htmlContent;
        }
    }
}

// 텍스트 에디터 컨트롤 숨기기
function hideTextEditorControls() {
    // blank-box 시각적 피드백 제거 (편집 모드 체크 없이 무조건 제거)
    if (activeTextSelection && activeTextSelection.blankBoxElement) {
        activeTextSelection.blankBoxElement.style.outline = '';
        activeTextSelection.blankBoxElement.style.outlineOffset = '';
    }
    
    // 모든 블랭크박스의 outline 제거 (안전장치)
    document.querySelectorAll('.blank-box[style*="outline"]').forEach(box => {
        box.style.outline = '';
        box.style.outlineOffset = '';
    });
    
    // 컨트롤 패널만 숨기기 (툴바는 항상 고정)
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

// 커스텀 드래그 선택 기능 초기화
function initCustomDragSelection() {
    let isSelecting = false;
    let startX, startY;
    let currentElement = null;
    
    // 패턴/예시 디스플레이에만 적용
    document.addEventListener('mousedown', function(e) {
        const target = e.target.closest('.pattern-display, .examples-display');
        if (!target) return;
        
        // 편집 모드가 아닐 때만 드래그 선택 가능
        if (target.closest('.pattern-card.editing')) return;
        
        currentElement = target;
        isSelecting = true;
        startX = e.clientX;
        startY = e.clientY;
        
        // 드래그 시작 시각적 피드백
        target.classList.add('selecting-text');
        target.classList.add('dragging');
        
        // 기본 텍스트 선택 동작 유지하면서 향상된 스타일 적용
        target.style.userSelect = 'text';
        target.style.webkitUserSelect = 'text';
        target.style.mozUserSelect = 'text';
        target.style.msUserSelect = 'text';
        
        e.stopPropagation();
    });
    
    document.addEventListener('mousemove', function(e) {
        if (!isSelecting || !currentElement) return;
        
        const distance = Math.sqrt(
            Math.pow(e.clientX - startX, 2) + 
            Math.pow(e.clientY - startY, 2)
        );
        
        // 최소 드래그 거리에 도달하면 선택 모드 활성화
        if (distance > 3) {
            currentElement.style.cursor = 'text';
        }
    });
    
    document.addEventListener('mouseup', function(e) {
        if (!isSelecting || !currentElement) return;
        
        // 드래그 종료 시각적 피드백 제거
        currentElement.classList.remove('selecting-text');
        currentElement.classList.remove('dragging');
        
        // 선택된 텍스트가 있는지 확인
        setTimeout(() => {
            const selection = window.getSelection();
            if (selection.toString().trim()) {
                enhanceTextSelection(currentElement);
            }
        }, 10);
        
        isSelecting = false;
        currentElement = null;
    });
}

// 텍스트 선택 향상 (블랭크박스 포함)
function enhanceTextSelection(element) {
    const selection = window.getSelection();
    if (!selection.rangeCount || !element) return;
    
    const range = selection.getRangeAt(0);
    
    // 선택 영역이 블랭크박스를 포함하는지 확인
    const selectedContent = range.cloneContents();
    const tempDiv = document.createElement('div');
    tempDiv.appendChild(selectedContent);
    
    // 블랭크박스가 포함된 경우 특별한 처리
    const blankBoxes = tempDiv.querySelectorAll('.blank-box');
    if (blankBoxes.length > 0) {
        // 블랭크박스들에 특별한 선택 스타일 적용
        blankBoxes.forEach(box => {
            const elementId = box.getAttribute('data-element-id');
            if (elementId && element) {
                const originalBox = element.querySelector(`[data-element-id="${elementId}"]`);
                if (originalBox) {
                    originalBox.style.outline = '2px solid rgba(99, 102, 241, 0.5)';
                    originalBox.style.outlineOffset = '2px';
                    originalBox.style.backgroundColor = 'rgba(99, 102, 241, 0.1)';
                }
            }
        });
    }
}