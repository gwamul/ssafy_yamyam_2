// 글로벌 변수
let dietData = [];
let foodDatabase = {};
let currentFilters = {
    date: '',
    mealType: ''
};

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupEventListeners();
    setupPanelNavigation();
});

// 패널 네비게이션 설정
function setupPanelNavigation() {
    const sidebarIcons = document.querySelectorAll('.sidebar-icon');
    sidebarIcons.forEach(icon => {
        icon.addEventListener('click', () => {
            const panelName = icon.dataset.panel;
            switchPanel(panelName);
            
            // 활성 아이콘 업데이트
            sidebarIcons.forEach(i => i.classList.remove('active'));
            icon.classList.add('active');
            
            // Secondary Sidebar 업데이트
            updateSecondaryPanel(panelName);
        });
    });
}

// 패널 전환
function switchPanel(panelName) {
    const panels = document.querySelectorAll('.content-panel');
    panels.forEach(panel => panel.classList.remove('active'));
    
    const targetPanel = document.getElementById(`${panelName}-panel`);
    if (targetPanel) {
        targetPanel.classList.add('active');
    }
}

// Secondary Sidebar 업데이트
function updateSecondaryPanel(panelName) {
    const secondarySidebarContent = document.getElementById('secondary-sidebar-content');
    
    switch(panelName) {
        case 'home':
            renderSecondaryPanelHome();
            break;
        case 'diet':
            renderSecondaryPanelDiet();
            break;
        case 'community':
            renderSecondaryPanelCommunity();
            break;
        case 'workout':
            renderSecondaryPanelWorkout();
            break;
        case 'challenge':
            renderSecondaryPanelChallenge();
            break;
        case 'settings':
            renderSecondaryPanelSettings();
            break;
        default:
            secondarySidebarContent.innerHTML = '<p class="text-muted">정보가 없습니다</p>';
    }
}

// Secondary Panel - 홈
function renderSecondaryPanelHome() {
    const secondarySidebarContent = document.getElementById('secondary-sidebar-content');
    
    const today = new Date().toISOString().split('T')[0];
    const todayMeals = dietData.filter(meal => meal.날짜 === today);
    const totalCalorie = todayMeals.reduce((sum, meal) => {
        return sum + (meal.음식 || []).reduce((s, f) => s + (parseFloat(f.에너지) || 0), 0);
    }, 0);
    
    secondarySidebarContent.innerHTML = `
        <div class="secondary-item">
            <div class="secondary-item-title">오늘 섭취</div>
            <div class="secondary-item-subtitle">${totalCalorie.toFixed(0)} kcal</div>
        </div>
        <div class="secondary-item">
            <div class="secondary-item-title">목표 칼로리</div>
            <div class="secondary-item-subtitle">2000 kcal</div>
        </div>
        <div class="secondary-item">
            <div class="secondary-item-title">식사 횟수</div>
            <div class="secondary-item-subtitle">${todayMeals.length}끼</div>
        </div>
        <div class="secondary-item">
            <div class="secondary-item-title">빠른 메뉴</div>
            <div class="secondary-item-subtitle">식단 탭으로 이동</div>
        </div>
    `;
}

// Secondary Panel - 식단
function renderSecondaryPanelDiet() {
    const secondarySidebarContent = document.getElementById('secondary-sidebar-content');
    const mealTypes = ['아침', '점심', '저녁', '간식'];
    
    const today = new Date().toISOString().split('T')[0];
    const todayMeals = dietData.filter(meal => meal.날짜 === today);
    
    let html = '';
    mealTypes.forEach(mealType => {
        const mealCount = todayMeals.filter(m => m.식사구분 === mealType).length;
        const calories = todayMeals
            .filter(m => m.식사구분 === mealType)
            .reduce((sum, meal) => sum + (meal.음식 || []).reduce((s, f) => s + (parseFloat(f.에너지) || 0), 0), 0);
        
        html += `
            <div class="secondary-item" data-meal-type="${mealType}">
                <div class="secondary-item-title">${mealType}</div>
                <div class="secondary-item-subtitle">${mealCount > 0 ? `${mealCount}가지 · ${calories.toFixed(0)}kcal` : '기록 없음'}</div>
            </div>
        `;
    });
    
    secondarySidebarContent.innerHTML = html;
    
    // 클릭 이벤트 추가
    document.querySelectorAll('#secondary-sidebar-content .secondary-item').forEach(item => {
        item.addEventListener('click', () => {
            const mealType = item.dataset.mealType;
            document.getElementById('filterMealType').value = mealType;
            document.getElementById('filterDate').value = today;
            applyFilters();
        });
    });
}

// Secondary Panel - 커뮤니티
function renderSecondaryPanelCommunity() {
    const secondarySidebarContent = document.getElementById('secondary-sidebar-content');
    secondarySidebarContent.innerHTML = `
        <div class="secondary-item">
            <div class="secondary-item-title">공개 피드</div>
            <div class="secondary-item-subtitle">곧 출시</div>
        </div>
        <div class="secondary-item">
            <div class="secondary-item-title">나의 게시물</div>
            <div class="secondary-item-subtitle">곧 출시</div>
        </div>
        <div class="secondary-item">
            <div class="secondary-item-title">팔로우</div>
            <div class="secondary-item-subtitle">곧 출시</div>
        </div>
    `;
}

// Secondary Panel - 운동
function renderSecondaryPanelWorkout() {
    const secondarySidebarContent = document.getElementById('secondary-sidebar-content');
    secondarySidebarContent.innerHTML = `
        <div class="secondary-item">
            <div class="secondary-item-title">오늘의 운동</div>
            <div class="secondary-item-subtitle">곧 출시</div>
        </div>
        <div class="secondary-item">
            <div class="secondary-item-title">이전 운동</div>
            <div class="secondary-item-subtitle">곧 출시</div>
        </div>
        <div class="secondary-item">
            <div class="secondary-item-title">AI 코칭</div>
            <div class="secondary-item-subtitle">곧 출시</div>
        </div>
    `;
}

// Secondary Panel - 챌린지
function renderSecondaryPanelChallenge() {
    const secondarySidebarContent = document.getElementById('secondary-sidebar-content');
    secondarySidebarContent.innerHTML = `
        <div class="secondary-item">
            <div class="secondary-item-title">진행중</div>
            <div class="secondary-item-subtitle">곧 출시</div>
        </div>
        <div class="secondary-item">
            <div class="secondary-item-title">완료됨</div>
            <div class="secondary-item-subtitle">곧 출시</div>
        </div>
        <div class="secondary-item">
            <div class="secondary-item-title">모든 챌린지</div>
            <div class="secondary-item-subtitle">곧 출시</div>
        </div>
    `;
}

// Secondary Panel - 설정
function renderSecondaryPanelSettings() {
    const secondarySidebarContent = document.getElementById('secondary-sidebar-content');
    secondarySidebarContent.innerHTML = `
        <div class="secondary-item">
            <div class="secondary-item-title">프로필</div>
            <div class="secondary-item-subtitle">곧 출시</div>
        </div>
        <div class="secondary-item">
            <div class="secondary-item-title">알림</div>
            <div class="secondary-item-subtitle">곧 출시</div>
        </div>
        <div class="secondary-item">
            <div class="secondary-item-title">개인정보</div>
            <div class="secondary-item-subtitle">곧 출시</div>
        </div>
    `;
}

// 식단 추가 화면으로 전환
function switchToAddMeal() {
    switchPanel('diet');
    const mealList = document.getElementById('mealList');
    mealList.innerHTML = `
        <div class="card" style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
            <h4 style="margin-bottom: 20px; color: #1e1e1e;">새로운 식단 추가</h4>
            <form id="addMealForm">
                <div class="row g-3">
                    <div class="col-md-3">
                        <label class="form-label">날짜</label>
                        <input type="date" class="form-control" id="newDate" required>
                    </div>
                    <div class="col-md-3">
                        <label class="form-label">식사구분</label>
                        <select class="form-select" id="newMealType" required>
                            <option value="">선택</option>
                            <option value="아침">아침</option>
                            <option value="점심">점심</option>
                            <option value="저녁">저녁</option>
                            <option value="간식">간식</option>
                        </select>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">음식 검색</label>
                        <div class="input-group">
                            <input type="text" class="form-control" id="foodSearch" placeholder="음식명 입력" autocomplete="off">
                            <button class="btn btn-outline-secondary" type="button" id="addFoodBtn">추가</button>
                        </div>
                        <div id="foodSuggestions" class="list-group mt-2"></div>
                    </div>
                </div>
                <div class="mt-3" id="selectedFoodsDiv"></div>
                <button type="submit" class="btn btn-primary mt-3" style="width: 100%;">식단 추가</button>
            </form>
        </div>
    `;
    
    // 이벤트 재설정
    setupEventListeners();
    // Secondary panel 업데이트
    updateSecondaryPanel('diet');
}

// 데이터 로드
async function loadData() {
    try {
        const response = await fetch('data/식단데이터.json');
        dietData = await response.json();
        console.log('식단 데이터 로드 완료:', dietData);
        
        await loadFoodDatabase();
        updateHomeStats();
    } catch (error) {
        console.error('데이터 로드 오류:', error);
    }
}

// 홈 화면 통계 업데이트
function updateHomeStats() {
    const today = new Date().toISOString().split('T')[0];
    const todayMeals = dietData.filter(meal => meal.날짜 === today);
    
    const totalCalorie = todayMeals.reduce((sum, meal) => {
        return sum + (meal.음식 || []).reduce((s, f) => s + (parseFloat(f.에너지) || 0), 0);
    }, 0);
    
    const totalProtein = todayMeals.reduce((sum, meal) => {
        return sum + (meal.음식 || []).reduce((s, f) => s + (parseFloat(f.단백질) || 0), 0);
    }, 0);
    
    document.getElementById('todayCalorie').textContent = totalCalorie.toFixed(0);
    document.getElementById('todayProtein').textContent = totalProtein.toFixed(1);
}

// CSV 음식 데이터베이스 로드
async function loadFoodDatabase() {
    try {
        const response = await fetch('data/음식DB.csv');
        const csv = await response.text();
        const lines = csv.split('\n');
        
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '') continue;
            
            try {
                const values = parseCSVLine(lines[i]);
                if (values.length >= 13) {
                    const foodItem = {
                        식품코드: values[0],
                        식품명: values[1],
                        식품대분류명: values[2],
                        영양성분함량기준량: values[3],
                        에너지: parseFloat(values[4]) || 0,
                        단백질: parseFloat(values[5]) || 0,
                        지방: parseFloat(values[6]) || 0,
                        탄수화물: parseFloat(values[7]) || 0,
                        당류: parseFloat(values[8]) || 0,
                        나트륨: parseFloat(values[9]) || 0,
                        포화지방산: parseFloat(values[10]) || 0,
                        트랜스지방산: parseFloat(values[11]) || 0,
                        식품중량: values[12]
                    };
                    foodDatabase[foodItem.식품명] = foodItem;
                }
            } catch (e) {
                // 파싱 오류 무시
            }
        }
        console.log('음식 데이터베이스 로드 완료:', Object.keys(foodDatabase).length, '개 항목');
    } catch (error) {
        console.error('CSV 로드 오류:', error);
    }
}

// CSV 라인 파싱
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current.trim());
    return result;
}

// 이벤트 리스너 설정
function setupEventListeners() {
    if (document.getElementById('filterBtn')) {
        document.getElementById('filterBtn').addEventListener('click', applyFilters);
    }
    if (document.getElementById('addMealForm')) {
        document.getElementById('addMealForm').addEventListener('submit', handleAddMeal);
    }
    if (document.getElementById('foodSearch')) {
        document.getElementById('foodSearch').addEventListener('input', handleFoodSearch);
    }
    if (document.getElementById('addFoodBtn')) {
        document.getElementById('addFoodBtn').addEventListener('click', addSelectedFood);
    }
}

// 필터 적용
function applyFilters() {
    currentFilters.date = document.getElementById('filterDate').value;
    currentFilters.mealType = document.getElementById('filterMealType').value;
    
    const filtered = dietData.filter(meal => {
        const dateMatch = !currentFilters.date || meal.날짜 === currentFilters.date;
        const typeMatch = !currentFilters.mealType || meal.식사구분 === currentFilters.mealType;
        return dateMatch && typeMatch;
    });
    
    renderMealList(filtered);
}

// 식단 목록 렌더링
function renderMealList(meals) {
    const container = document.getElementById('mealList');
    
    if (meals.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">조건에 맞는 식단이 없습니다.</div>';
        return;
    }
    
    container.innerHTML = meals.map(meal => createMealCard(meal)).join('');
    
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const mealId = parseInt(e.target.dataset.mealId);
            deleteMeal(mealId);
        });
    });
}

// 식단 카드 생성
function createMealCard(meal) {
    const getMealTypeClass = (type) => {
        const typeMap = {
            '아침': 'breakfast',
            '점심': 'lunch',
            '저녁': 'dinner',
            '간식': 'snack'
        };
        return typeMap[type] || '';
    };
    
    const foods = meal.음식 || [];
    const totals = calculateTotals(foods);
    
    let foodsHtml = foods.map(food => `
        <div class="food-item">
            <div class="food-name">${food.식품명}</div>
            <div class="nutrition-info">
                <div class="nutrition-item">
                    <div class="label">에너지</div>
                    <div class="value">${Number(food.에너지).toFixed(1)}</div>
                </div>
                <div class="nutrition-item">
                    <div class="label">탄수화물</div>
                    <div class="value">${Number(food.탄수화물).toFixed(1)}g</div>
                </div>
                <div class="nutrition-item">
                    <div class="label">단백질</div>
                    <div class="value">${Number(food.단백질).toFixed(1)}g</div>
                </div>
                <div class="nutrition-item">
                    <div class="label">지방</div>
                    <div class="value">${Number(food.지방).toFixed(1)}g</div>
                </div>
            </div>
        </div>
    `).join('');
    
    return `
        <div class="meal-card">
            <div class="meal-header">
                <div>
                    <div class="meal-date">${meal.날짜} · ${meal.식사구분}</div>
                    <span class="meal-type ${getMealTypeClass(meal.식사구분)}">${meal.식사구분}</span>
                </div>
                <button class="btn-delete" data-meal-id="${meal.식단ID}" title="삭제">×</button>
            </div>
            <div class="foods-list">
                ${foodsHtml}
            </div>
            <div class="nutrition-totals">
                <h6>📊 영양 요약</h6>
                <div class="nutrition-grid">
                    <div class="nutrition-item-total">
                        <div class="label">에너지</div>
                        <div class="value">${totals.에너지.toFixed(0)}</div>
                    </div>
                    <div class="nutrition-item-total">
                        <div class="label">탄수화물</div>
                        <div class="value">${totals.탄수화물.toFixed(1)}</div>
                    </div>
                    <div class="nutrition-item-total">
                        <div class="label">단백질</div>
                        <div class="value">${totals.단백질.toFixed(1)}</div>
                    </div>
                    <div class="nutrition-item-total">
                        <div class="label">지방</div>
                        <div class="value">${totals.지방.toFixed(1)}</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// 영양정보 총합 계산
function calculateTotals(foods) {
    return {
        에너지: foods.reduce((sum, food) => sum + (parseFloat(food.에너지) || 0), 0),
        탄수화물: foods.reduce((sum, food) => sum + (parseFloat(food.탄수화물) || 0), 0),
        단백질: foods.reduce((sum, food) => sum + (parseFloat(food.단백질) || 0), 0),
        지방: foods.reduce((sum, food) => sum + (parseFloat(food.지방) || 0), 0)
    };
}

// 식단 삭제
function deleteMeal(mealId) {
    if (confirm('이 식단을 삭제하시겠습니까?')) {
        dietData = dietData.filter(meal => meal.식단ID !== mealId);
        updateHomeStats();
        updateSecondaryPanel('diet');
        applyFilters();
    }
}

// 음식 검색 결과 표시
function handleFoodSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    const suggestionsDiv = document.getElementById('foodSuggestions');
    
    if (searchTerm.length < 2) {
        suggestionsDiv.innerHTML = '';
        return;
    }
    
    const matches = Object.keys(foodDatabase)
        .filter(name => name.toLowerCase().includes(searchTerm))
        .slice(0, 10);
    
    suggestionsDiv.innerHTML = matches.map(name => `
        <div class="list-group-item" onclick="selectFoodItem('${name}')">${name}</div>
    `).join('');
}

// 음식 아이템 선택
let selectedFoods = [];

function selectFoodItem(foodName) {
    if (!selectedFoods.find(f => f.식품명 === foodName)) {
        const foodItem = foodDatabase[foodName];
        if (foodItem) {
            selectedFoods.push(foodItem);
            displaySelectedFoods();
        }
    }
    document.getElementById('foodSearch').value = '';
    document.getElementById('foodSuggestions').innerHTML = '';
}

// 선택된 음식 추가 버튼
function addSelectedFood() {
    const searchTerm = document.getElementById('foodSearch').value.toLowerCase();
    const matches = Object.keys(foodDatabase)
        .filter(name => name.toLowerCase().includes(searchTerm));
    
    if (matches.length > 0) {
        selectFoodItem(matches[0]);
    }
}

// 선택된 음식 목록 표시
function displaySelectedFoods() {
    const div = document.getElementById('selectedFoodsDiv');
    
    if (selectedFoods.length === 0) {
        div.innerHTML = '';
        return;
    }
    
    div.innerHTML = `
        <div class="selected-foods">
            <h6 style="margin-bottom: 10px;">선택된 음식:</h6>
            ${selectedFoods.map((food, idx) => `
                <span class="selected-food-tag">
                    ${food.식품명}
                    <span class="remove" onclick="removeSelectedFood(${idx})">×</span>
                </span>
            `).join('')}
        </div>
    `;
}

// 선택된 음식 제거
function removeSelectedFood(idx) {
    selectedFoods.splice(idx, 1);
    displaySelectedFoods();
}

// 식단 추가 처리
function handleAddMeal(e) {
    e.preventDefault();
    
    const date = document.getElementById('newDate').value;
    const mealType = document.getElementById('newMealType').value;
    
    if (!date || !mealType || selectedFoods.length === 0) {
        alert('모든 필드를 입력하고 음식을 선택해주세요.');
        return;
    }
    
    const newMealId = Math.max(...dietData.map(m => m.식단ID), 0) + 1;
    
    const newMeal = {
        식단ID: newMealId,
        날짜: date,
        식사구분: mealType,
        음식: selectedFoods.map(food => ({
            식품코드: food.식품코드,
            식품명: food.식품명,
            에너지: food.에너지,
            탄수화물: food.탄수화물,
            단백질: food.단백질,
            지방: food.지방,
            식품중량: food.식품중량
        }))
    };
    
    dietData.push(newMeal);
    
    document.getElementById('addMealForm').reset();
    selectedFoods = [];
    document.getElementById('selectedFoodsDiv').innerHTML = '';
    
    updateHomeStats();
    updateSecondaryPanel('diet');
    applyFilters();
    alert('식단이 추가되었습니다!');
}
