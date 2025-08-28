// calendar.js - 캘린더 및 날짜 관리

// 캘린더 관련 전역 변수
let activeCalendar = null;
let currentCalendarDate = new Date();

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