/**
 * YamYam - Advanced Challenge Management System (Fixed Parsing)
 * 수정 사항: 단위(g, kcal) 제거 로직 추가, 상세 영양소 통계 연동
 */

let challenges = [];
let foodDB = [];

document.addEventListener('DOMContentLoaded', () => {
    setupPanelNavigation();
    if (document.getElementById('challenge-panel')) {
        initChallenges();
    }
});

function setupPanelNavigation() {
    document.querySelectorAll('.sidebar-icon').forEach(icon => {
        icon.addEventListener('click', () => {
            const panel = icon.dataset.panel;
            switchPanel(panel);
            document.querySelectorAll('.sidebar-icon').forEach(i => i.classList.remove('active'));
            icon.classList.add('active');
        });
    });
}

function switchPanel(panelName) {
    document.querySelectorAll('.content-panel').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(panelName + '-panel');
    if (target) target.classList.add('active');
}

// 2. 챌린지 시스템 초기화
async function initChallenges() {
    loadChallenges();
    await loadFoodDatabase(); 
    renderExploreChallenges();
    setupCreateHandlers();
    setupFilterHandlers();
    switchChallengeTab('explore');
}

// 3. 파싱 로직 수정 (단위 제거 헬퍼 함수 추가)
const cleanNum = (val) => {
    if (val === undefined || val === null || val === '') return 0;
    // 숫자와 소수점만 남기고 나머지 문자(g, kcal, mg 등) 제거
    const num = parseFloat(String(val).replace(/[^0-9.]/g, ''));
    return isNaN(num) ? 0 : num;
};

async function loadFoodDatabase() {
    try {
        const response = await fetch('data/음식DB.csv');
        const txt = await response.text();
        const lines = txt.split('\n').filter(l => l.trim());
        const header = lines.shift().split(',');

        const idx = {
            name: header.indexOf('식품명'),
            ref: header.indexOf('영양성분함량기준량'),
            energy: header.indexOf('에너지(kcal)'),
            protein: header.indexOf('단백질(g)'),
            fat: header.indexOf('지방(g)'),
            carbs: header.indexOf('탄수화물(g)'),
            sugar: header.indexOf('당류(g)'),
            sodium: header.indexOf('나트륨(mg)'),
            satFat: header.indexOf('포화지방산(g)'),
            transFat: header.indexOf('트랜스지방산(g)'),
            weight: header.indexOf('식품중량')
        };

        foodDB = lines.map(line => {
            const p = line.split(',');
            const refVal = cleanNum(p[idx.ref]);
            const weightVal = cleanNum(p[idx.weight]);
            // 기준량 대비 실제 중량 비율 계산
            const ratio = (refVal > 0 && weightVal > 0) ? (weightVal / refVal) : 1;

            return {
                name: p[idx.name] || '',
                energy: cleanNum(p[idx.energy]) * ratio,
                protein: cleanNum(p[idx.protein]) * ratio,
                fat: cleanNum(p[idx.fat]) * ratio,
                carbs: cleanNum(p[idx.carbs]) * ratio,
                sugar: cleanNum(p[idx.sugar]) * ratio,
                sodium: cleanNum(p[idx.sodium]) * ratio,
                satFat: cleanNum(p[idx.satFat]) * ratio,
                transFat: cleanNum(p[idx.transFat]) * ratio
            };
        }).filter(f => f.name);
        console.log("Food DB Loaded:", foodDB.length, "items");
    } catch (err) {
        console.error('음식 DB 로드 실패:', err);
    }
}

// 4. 자동완성 및 음식 선택
function showFoodSuggestions(input) {
    hideFoodSuggestions();
    const val = input.value.trim().toLowerCase();
    if (!val) return;

    const matches = foodDB.filter(f => f.name.toLowerCase().includes(val)).slice(0, 10);
    if (matches.length === 0) return;

    const box = document.createElement('div');
    box.className = 'autocomplete-suggestions shadow-sm border rounded bg-white';
    const rect = input.getBoundingClientRect();
    Object.assign(box.style, {
        position: 'absolute', top: `${rect.bottom + window.scrollY}px`,
        left: `${rect.left + window.scrollX}px`, width: `${rect.width}px`, zIndex: '2000'
    });

    matches.forEach(f => {
        const item = document.createElement('div');
        item.className = 'suggestion-item p-2 border-bottom cursor-pointer';
        item.innerHTML = `<div class="d-flex justify-content-between">
            <strong>${f.name}</strong><span class="text-primary">${Math.round(f.energy)}kcal</span>
        </div>`;
        item.onmousedown = (e) => {
            e.preventDefault();
            const { day, meal, slot } = input.dataset;
            input.value = f.name;
            const cInp = document.querySelector(`.meal-calorie[data-day="${day}"][data-meal="${meal}"][data-slot="${slot}"]`);
            if (cInp) {
                cInp.value = Math.round(f.energy);
                cInp.dataset.nutrition = JSON.stringify(f);
            }
            hideFoodSuggestions();
            updateRealTimeStats();
        };
        box.appendChild(item);
    });
    document.body.appendChild(box);
}

// 5. 실시간 종합 영양 분석 통계
function updateRealTimeStats() {
    const targetVal = document.getElementById('targetCalories').value;
    const target = parseInt(targetVal) || 0;
    
    const stats = {
        energy: 0, protein: 0, fat: 0, carbs: 0, 
        sugar: 0, sodium: 0, satFat: 0, count: 0
    };

    document.querySelectorAll('.meal-plan-row').forEach(row => {
        let dayEnergy = 0;
        row.querySelectorAll('.meal-calorie').forEach(inp => {
            const val = parseFloat(inp.value) || 0;
            if (val > 0) {
                dayEnergy += val;
                if (inp.dataset.nutrition) {
                    const nut = JSON.parse(inp.dataset.nutrition);
                    // DB에서 가져온 값 합산
                    stats.protein += nut.protein;
                    stats.fat += nut.fat;
                    stats.carbs += nut.carbs;
                    stats.sugar += nut.sugar;
                    stats.sodium += nut.sodium;
                    stats.satFat += nut.satFat;
                }
            }
        });
        
        const dayTotalText = row.querySelector('.day-total-text');
        if (dayTotalText) dayTotalText.textContent = Math.round(dayEnergy);
        
        if (dayEnergy > 0) {
            stats.energy += dayEnergy;
            stats.count++;
        }
    });

    // 상단 대시보드 업데이트
    const avgEnergy = stats.count > 0 ? Math.round(stats.energy / stats.count) : 0;
    document.getElementById('totalCalories').textContent = Math.round(stats.energy).toLocaleString();
    document.getElementById('averageCalories').textContent = avgEnergy.toLocaleString();
    document.getElementById('achievementRate').textContent = target > 0 ? Math.round((avgEnergy / target) * 100) + "%" : "0%";

    // 상세 영양소 표시 (HTML에 해당 ID들이 있어야 함)
    const setNut = (id, val, unit) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val.toFixed(1) + unit;
    };

    setNut('total-protein', stats.protein, 'g');
    setNut('total-fat', stats.fat, 'g');
    setNut('total-carbs', stats.carbs, 'g');
    setNut('total-sugar', stats.sugar, 'g');
    setNut('total-sodium', stats.sodium, 'mg');
    setNut('total-satfat', stats.satFat, 'g');

    const fb = document.getElementById('statsFeedback');
    if (fb && target > 0) {
        fb.style.display = 'block';
        const rate = (avgEnergy / target) * 100;
        fb.className = `alert alert-${rate >= 100 ? 'success' : rate >= 70 ? 'info' : 'warning'} py-1 mt-2`;
        fb.textContent = rate >= 100 ? '🎉 목표 달성!' : rate >= 70 ? '👍 거의 다 왔어요!' : '💪 조금 더 힘내세요!';
    }
}

// 6. 식단 입력창 생성
function generateMealPlanInputs(days) {
    const container = document.getElementById('meal-plans-container');
    if (!container) return;

    let html = '';
    for (let d = 1; d <= days; d++) {
        html += `
        <div class="meal-plan-row border p-3 rounded mb-3 bg-white shadow-sm">
            <div class="d-flex justify-content-between mb-2">
                <span class="fw-bold text-primary">🗓️ ${d}일차</span>
                <span class="small">일일 합계: <span class="day-total-text" data-day="${d}">0</span> kcal</span>
            </div>
            <div class="row g-2">
                ${['breakfast', 'lunch', 'dinner'].map(m => `
                    <div class="col-md-4">
                        <label class="small fw-bold">${m === 'breakfast' ? '아침' : m === 'lunch' ? '점심' : '저녁'}</label>
                        ${[1, 2, 3, 4].map(s => `
                            <div class="input-group input-group-sm mb-1">
                                <input type="text" class="form-control meal-food" placeholder="메뉴 ${s}" 
                                       data-day="${d}" data-meal="${m}" data-slot="${s}">
                                <input type="number" class="form-control meal-calorie" style="max-width:65px" 
                                       placeholder="kcal" data-day="${d}" data-meal="${m}" data-slot="${s}">
                            </div>
                        `).join('')}
                    </div>
                `).join('')}
            </div>
        </div>`;
    }
    container.innerHTML = html || '<p class="text-center text-muted">기간을 선택해주세요.</p>';
    setupFoodAutocomplete();
    setupRealTimeCalculator();
}

// 7. 탭 전환 및 나머지 핸들러
function switchChallengeTab(tabName) {
    // 버튼 활성화 클래스 처리
    document.querySelectorAll('.challenge-tabs .tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // 컨텐츠 표시 처리
    document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = content.id === `${tabName}-tab` ? 'block' : 'none';
        content.classList.remove('active');
        if(content.id === `${tabName}-tab`) content.classList.add('active');
    });

    // [핵심] 탭에 따른 데이터 로드 실행
    if (tabName === 'my-challenges') {
        renderMyChallenges(); // 내 챌린지 리스트 그리기
    } else if (tabName === 'explore') {
        renderExploreChallenges(); // 탐색 리스트 그리기
    }
}

function handleCreateChallenge(e) {
    e.preventDefault();
    const name = document.getElementById('challengeName').value;
    if (!name) return alert('이름을 입력하세요');

    const mealPlans = [];
    document.querySelectorAll('.meal-plan-row').forEach((row, i) => {
        const day = i + 1;
        const plan = { day, breakfast: [], lunch: [], dinner: [] };
        ['breakfast', 'lunch', 'dinner'].forEach(m => {
            for (let s = 1; s <= 4; s++) {
                const f = row.querySelector(`.meal-food[data-meal="${m}"][data-slot="${s}"]`).value;
                const c = row.querySelector(`.meal-calorie[data-meal="${m}"][data-slot="${s}"]`).value;
                if (f) plan[m].push({ name: f, kcal: parseFloat(c) || 0 });
            }
        });
        mealPlans.push(plan);
    });

    const newChallenge = {
        id: Date.now(),
        name,
        difficulty: document.getElementById('challengeDifficulty').value,
        duration: mealPlans.length,
        targetCalories: document.getElementById('targetCalories').value,
        mealPlans
    };

    challenges.push(newChallenge);
    localStorage.setItem('challenges', JSON.stringify(challenges));
    alert('챌린지가 생성되었습니다!');
    location.reload();
}

function renderExploreChallenges() {
    const list = document.getElementById('challenges-list');
    if (!list) return;

    const diffFilter = document.getElementById('filterDifficulty').value;
    const durFilter = document.getElementById('filterDuration').value;

    // 1. 필터링된 데이터 준비
    const filtered = challenges.filter(ch => {
        const matchDiff = !diffFilter || ch.difficulty === diffFilter;
        const matchDur = !durFilter || String(ch.duration) === durFilter;
        return matchDiff && matchDur;
    });

    // 2. 난이도 정렬 순서 및 메타데이터 정의
    const diffLevels = [
        { id: 'easy', name: '🟢 초급: 가벼운 시작', color: '#2ecc71', desc: '누구나 부담 없이 시작할 수 있는 기초 식단입니다.' },
        { id: 'medium', name: '🟠 중급: 꾸준한 관리', color: '#f1c40f', desc: '본격적인 체중 조절과 건강 관리를 위한 단계입니다.' },
        { id: 'hard', name: '🔴 상급: 한계 돌파', color: '#e74c3c', desc: '강력한 의지가 필요한 고강도 식단 조절 단계입니다.' }
    ];

    let html = '';

    // 3. 난이도 순서대로 위에서 아래로(Vertical) 렌더링
    diffLevels.forEach(level => {
        const group = filtered.filter(ch => ch.difficulty === level.id);
        
        // 기간순 정렬 (7일 -> 14일 -> 30일)
        group.sort((a, b) => a.duration - b.duration);

        if (group.length > 0) {
            html += `
                <div class="diff-section-container mb-5">
                    <div class="diff-header d-flex align-items-center mb-3" style="border-left: 6px solid ${level.color}; padding-left: 15px;">
                        <div>
                            <h4 class="fw-bold m-0" style="color: ${level.color}">${level.name}</h4>
                            <small class="text-muted">${level.desc}</small>
                        </div>
                    </div>
                    
                    <div class="challenge-vertical-list">
                        ${group.map(ch => `
                            <div class="challenge-list-item d-flex align-items-center justify-content-between p-3 mb-2 bg-white border rounded shadow-sm">
                                <div class="d-flex align-items-center gap-4">
                                    <div class="duration-box text-center">
                                        <span class="d-block small text-muted">기간</span>
                                        <strong class="h5 m-0">${ch.duration}일</strong>
                                    </div>
                                    <div class="info">
                                        <h6 class="fw-bold mb-1">${ch.name}</h6>
                                        <p class="small text-muted m-0">🔥 일일 목표: <strong>${ch.targetCalories}kcal</strong> 준수</p>
                                    </div>
                                </div>
                                <button class="btn btn-primary btn-sm px-4 rounded-pill fw-bold" 
                                        onclick="subscribeChallenge(${ch.id})">도전하기</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    });

    list.innerHTML = html || '<div class="text-center py-5 text-muted">해당 조건의 챌린지가 없습니다.</div>';
}

// 가로로 긴 '리스트형 카드' 렌더링
function renderListCard(ch) {
    return `
        <div class="challenge-list-item d-flex align-items-center justify-content-between p-3 mb-2 shadow-sm border rounded bg-white">
            <div class="item-main-info d-flex align-items-center gap-4">
                <div class="duration-badge text-center">
                    <span class="d-block small text-muted">기간</span>
                    <strong class="h5 m-0">${ch.duration}일</strong>
                </div>
                <div class="text-info-group">
                    <h6 class="fw-bold mb-1">${ch.name}</h6>
                    <p class="small text-muted m-0">
                        목표: 일일 <span class="text-primary fw-bold">${ch.targetCalories}kcal</span> 준수
                    </p>
                </div>
            </div>
            <div class="item-action">
                <button class="btn btn-primary btn-sm px-4 rounded-pill" onclick="subscribeChallenge(${ch.id})">
                    도전하기
                </button>
            </div>
        </div>
    `;
}

// 난이도별 배지 색상 결정
function getDiffBadgeClass(diff) {
    if (diff === 'easy') return 'bg-success';
    if (diff === 'medium') return 'bg-warning text-dark';
    return 'bg-danger';
}


function setupCreateHandlers() {
    document.getElementById('challengeDuration')?.addEventListener('change', e => generateMealPlanInputs(e.target.value));
    document.getElementById('createChallengeForm')?.addEventListener('submit', handleCreateChallenge);
    document.getElementById('targetCalories')?.addEventListener('input', updateRealTimeStats);
}

function setupFoodAutocomplete() {
    document.querySelectorAll('.meal-food').forEach(inp => {
        inp.oninput = (e) => showFoodSuggestions(e.target);
        inp.onblur = () => setTimeout(hideFoodSuggestions, 200);
    });
}

function setupRealTimeCalculator() {
    document.querySelectorAll('.meal-calorie').forEach(inp => {
        inp.oninput = () => updateRealTimeStats();
    });
}

function hideFoodSuggestions() { document.querySelectorAll('.autocomplete-suggestions').forEach(el => el.remove()); }
function loadChallenges() { challenges = JSON.parse(localStorage.getItem('challenges')) || []; }
function setupFilterHandlers() {
    const diffFilter = document.getElementById('filterDifficulty');
    const durFilter = document.getElementById('filterDuration');

    if (diffFilter) {
        diffFilter.addEventListener('change', () => {
            console.log("Difficulty Filter Changed:", diffFilter.value);
            renderExploreChallenges();
        });
    }

    if (durFilter) {
        durFilter.addEventListener('change', () => {
            console.log("Duration Filter Changed:", durFilter.value);
            renderExploreChallenges();
        });
    }
}


//-------------------------내 챌린지 탭 구현 -------------------------

// 내 챌린지 탭 렌더링 함수
function renderExploreChallenges() {
    const list = document.getElementById('challenges-list');
    if (!list) return;

    const diffFilter = document.getElementById('filterDifficulty').value;
    const durFilter = document.getElementById('filterDuration').value;

    const filtered = challenges.filter(ch => {
        const matchDiff = !diffFilter || ch.difficulty === diffFilter;
        const matchDur = !durFilter || String(ch.duration) === durFilter;
        return matchDiff && matchDur;
    });

    // 난이도별 테마 설정
    const diffConfigs = [
        { id: 'easy', name: 'Beginner: 가벼운 시작', color: '#BCCA8C', icon: '🌱' },
        { id: 'medium', name: 'Intermediate: 꾸준한 변화', color: '#68723D', icon: '🔥' },
        { id: 'hard', name: 'Advanced: 극한의 도전', color: '#4f572e', icon: '🏆' }
    ];

    let html = '';

    diffConfigs.forEach(conf => {
        const group = filtered.filter(ch => ch.difficulty === conf.id);
        if (group.length === 0) return;

        group.sort((a, b) => a.duration - b.duration);

        html += `
            <div class="explore-section mb-5">
                <div class="section-banner d-flex align-items-center mb-4" style="border-left: 8px solid ${conf.color}">
                    <div class="ms-3">
                        <h3 class="fw-bold mb-1" style="color: ${conf.color}">${conf.icon} ${conf.name}</h3>
                        <p class="text-muted small m-0">성공 시 최대 500P 적립 가능</p>
                    </div>
                </div>
                
                <div class="explore-list-stack">
                    ${group.map(ch => `
                        <div class="premium-list-item d-flex align-items-center justify-content-between">
                            <div class="d-flex align-items-center flex-grow-1">
                                <div class="duration-display">
                                    <span class="days">${ch.duration}</span>
                                    <span class="unit">DAYS</span>
                                </div>
                                <div class="challenge-details ms-4">
                                    <h5 class="fw-bold text-dark mb-1">${ch.name}</h5>
                                    <div class="meta-row d-flex gap-3 align-items-center">
                                        <span class="meta-tag kcal">⚡️ ${ch.targetCalories}kcal</span>
                                        <span class="meta-tag users">👥 1,240명 참여 중</span>
                                        <span class="meta-tag rate">📈 성공률 78%</span>
                                    </div>
                                </div>
                            </div>
                            <div class="action-zone">
                                <button class="btn btn-explore-start" onclick="subscribeChallenge(${ch.id})">
                                    도전 시작
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });

    list.innerHTML = html || '<div class="text-center py-5 text-muted">일치하는 챌린지가 없습니다.</div>';
}
function renderTodayMealSnippet(plan) {
    const hour = new Date().getHours();
    let type = 'breakfast';
    if (hour >= 11 && hour < 16) type = 'lunch';
    else if (hour >= 16) type = 'dinner';

    const meals = plan[type] || [];
    if (meals.length === 0) return "<li>지정된 식단 가이드가 없습니다.</li>";
    return meals.map(m => `<li>• ${m.name} (${m.kcal}kcal)</li>`).join('');
}

function getMealTimeName(hour) {
    if (hour < 11) return "아침";
    if (hour < 16) return "점심";
    return "저녁";
}

function renderMealDetails(plan, hour) {
    const mealType = hour < 11 ? 'breakfast' : hour < 16 ? 'lunch' : 'dinner';
    const meals = plan[mealType] || [];
    if (meals.length === 0) return "등록된 식단이 없습니다.";
    
    return meals.map(m => `
        <div class="d-flex justify-content-between small">
            <span>• ${m.name}</span>
            <span class="text-muted">${m.kcal} kcal</span>
        </div>
    `).join('') + `<hr><div class="text-end fw-bold text-success">총 ${plan.totalKcal} kcal</div>`;
}

// 1. 챌린지 구독 시 시작일 저장 로직 추가
function subscribeChallenge(id) {
    const challenge = challenges.find(ch => ch.id === id);
    if (!challenge) return;

    let mySubscribed = JSON.parse(localStorage.getItem('mySubscribed')) || [];
    
    if (mySubscribed.some(ch => ch.id === id)) {
        alert('이미 참여 중인 챌린지입니다!');
        switchChallengeTab('my-challenges'); // 이미 참여 중이면 바로 탭 이동
        return;
    }

    // 새 구독 데이터 객체 생성
    const newSub = {
        ...challenge,
        startDate: new Date().toISOString(), // 시작일 기록
        successDays: 0,
        missions: [
            { id: 1, name: "💧 물 2L 마시기", completed: false },
            { id: 2, name: "🥗 채소 한 접시", completed: false },
            { id: 3, name: "🚶 7,000보 걷기", completed: false }
        ]
    };

    mySubscribed.push(newSub);
    localStorage.setItem('mySubscribed', JSON.stringify(mySubscribed));
    
    alert(`'${challenge.name}' 구독 완료!`);
    
    // ⭐️ 중요: 탭 전환 후 데이터를 다시 그리도록 명시적 호출
    switchChallengeTab('my-challenges');
}

// 내 챌린지 리스트 렌더링
function renderMyChallenges() {
    const container = document.getElementById('my-challenges-list');
    if (!container) return;

    const mySubscribed = JSON.parse(localStorage.getItem('mySubscribed')) || [];
    
    if (mySubscribed.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5">
                <p class="text-muted">참여 중인 챌린지가 없습니다.</p>
                <button class="btn btn-sm btn-primary" onclick="switchChallengeTab('explore')">탐색하러 가기</button>
            </div>`;
        return;
    }

    const now = new Date();
    container.innerHTML = mySubscribed.map(ch => {
        // 일차 계산 로직 (오늘 - 시작일)
        const start = new Date(ch.startDate);
        const diffMs = now - start;
        const currentDay = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1);
        const displayDay = currentDay > ch.duration ? ch.duration : currentDay;

        // 현재 시간에 따른 식단 유형 결정
        const hour = now.getHours();
        let mealType = 'breakfast';
        if (hour >= 11 && hour < 16) mealType = 'lunch';
        else if (hour >= 16) mealType = 'dinner';

        // 오늘 일차의 식단 데이터 추출
        const todayPlan = ch.mealPlans.find(p => p.day === displayDay) || { breakfast: [], lunch: [], dinner: [] };
        const currentMeals = todayPlan[mealType] || [];

        return `
        <div class="my-challenge-card active mb-4 shadow-sm">
            <div class="card-header-custom p-3 d-flex justify-content-between align-items-center bg-light border-bottom">
                <div>
                    <h6 class="fw-bold m-0">${ch.name}</h6>
                    <small class="text-success">${displayDay}일차 / ${ch.duration}일</small>
                </div>
                <div class="streak-fire">🔥 ${ch.successDays}</div>
            </div>
            <div class="card-body-custom p-3">
                <div class="current-meal-guide p-3 rounded mb-3" style="background-color: #f1f8e9; border-left: 4px solid #4caf50;">
                    <p class="small fw-bold mb-2">🕒 현재 권장 식단 (${mealType === 'breakfast' ? '아침' : mealType === 'lunch' ? '점심' : '저녁'})</p>
                    <ul class="list-unstyled mb-0 small">
                        ${currentMeals.length > 0 ? 
                            currentMeals.map(m => `<li>• ${m.name} <span class="text-muted">(${m.kcal}kcal)</span></li>`).join('') : 
                            '<li>등록된 식단이 없습니다.</li>'}
                    </ul>
                </div>
                <div class="progress-info">
                    <div class="d-flex justify-content-between small mb-1">
                        <span>전체 진행률</span>
                        <span>${Math.round((displayDay / ch.duration) * 100)}%</span>
                    </div>
                    <div class="progress" style="height: 6px;">
                        <div class="progress-bar bg-primary" style="width: ${(displayDay / ch.duration) * 100}%"></div>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');
}

// 3. 미션 상태 변경 함수
function toggleMission(challengeId, missionId) {
    let mySubscribed = JSON.parse(localStorage.getItem('mySubscribed')) || [];
    const ch = mySubscribed.find(c => c.id === challengeId);
    if (ch) {
        const mission = ch.missions.find(m => m.id === missionId);
        if (mission) {
            mission.completed = !mission.completed;
            localStorage.setItem('mySubscribed', JSON.stringify(mySubscribed));
            renderMyChallenges(); // UI 즉시 갱신
        }
    }
}

// 헬퍼: 끼니별 칼로리 합산
function calculateMealKcal(meals) {
    return meals.reduce((sum, m) => sum + (m.kcal || 0), 0);
}


// 사이드바 정보 업데이트 함수
function updateSidebarInfo() {
    // 1. 날짜 설정
    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
    if(document.getElementById('side-today-date')) {
        document.getElementById('side-today-date').textContent = dateStr;
    }

    // 2. 미니 캘린더 생성 (현재 요일 기준 7일)
    const calendarContainer = document.getElementById('mini-calendar');
    if (calendarContainer) {
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        let calHtml = '';
        for (let i = -3; i <= 3; i++) {
            const d = new Date();
            d.setDate(now.getDate() + i);
            const isToday = i === 0 ? 'today' : '';
            calHtml += `
                <div class="calendar-day ${isToday}">
                    <div class="small opacity-75">${days[d.getDay()]}</div>
                    <div class="fw-bold">${d.getDate()}</div>
                    <div class="dot"></div>
                </div>
            `;
        }
        calendarContainer.innerHTML = calHtml;
    }

    // 3. 칼로리 그래프 업데이트 (기존 calculator 데이터 활용)
    const currentKcal = parseInt(document.getElementById('averageCalories')?.textContent.replace(/,/g, '')) || 0;
    const targetKcal = parseInt(document.getElementById('targetCalories')?.value) || 2000;
    
    if(document.getElementById('side-current-kcal')) {
        document.getElementById('side-current-kcal').textContent = currentKcal;
        document.getElementById('side-target-kcal').textContent = targetKcal;
        
        const rate = Math.min(Math.round((currentKcal / targetKcal) * 100), 100);
        document.getElementById('side-progress-bar').style.width = rate + '%';
        document.getElementById('side-calc-percent').textContent = rate + '%';
    }
}

// 미션 완료 버튼 이벤트
document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'btn-mission-complete') {
        e.target.classList.replace('btn-primary', 'btn-success');
        e.target.innerHTML = '<i class="bi bi-patch-check-fill me-2"></i> 오늘 달성 완료!';
        document.getElementById('mission-status-text').textContent = "참 잘했어요! 포인트 +10xp";
        
        // 여기에 로컬 스토리지 저장 로직을 추가하여 캘린더에 점(dot) 표시를 유지할 수 있습니다.
    }
});

// 페이지 로드 시 및 입력 시마다 업데이트
document.addEventListener('DOMContentLoaded', updateSidebarInfo);
// 챌린지 입력 값 변경 시 사이드바 그래프도 갱신되도록 리스너 연결
document.addEventListener('input', updateSidebarInfo);

function toggleMission(element) {
    // 1. 완료 상태 토글
    element.classList.toggle('completed');
    
    // 2. 사운드나 햅틱 효과 대신 가벼운 애니메이션
    if (element.classList.contains('completed')) {
        element.style.transform = "scale(0.98)";
        setTimeout(() => element.style.transform = "scale(1)", 100);
    }

    // 3. 올클리어 체크 로직
    checkAllMissions();
}

function checkAllMissions() {
    const total = document.querySelectorAll('.ritual-item').length;
    const completed = document.querySelectorAll('.ritual-item.completed').length;
    const rewardDiv = document.getElementById('final-mission-reward');
    const calendarToday = document.querySelector('.calendar-day.today .dot');

    // 캘린더 연동: 하나라도 성공하면 오늘 날짜 아래 점(dot) 표시
    if (completed > 0 && calendarToday) {
        calendarToday.style.background = "#20c997";
        calendarToday.style.opacity = "1";
    } else if (calendarToday) {
        calendarToday.style.opacity = "0";
    }

    // 올클리어 시 보너스 영역 노출
    if (total === completed && total > 0) {
        rewardDiv.classList.remove('d-none');
        // 여기서 실제 유저의 포인트/경험치 로직을 호출할 수 있습니다.
    } else {
        rewardDiv.classList.add('d-none');
    }
}


function stampTodaySuccess() {
    const btn = document.getElementById('btn-daily-stamp');
    
    // 이미 찍혔다면 중복 클릭 방지 (원하면 토글로 변경 가능)
    if (btn.classList.contains('stamped')) return;

    // 1. 버튼 상태 변경
    btn.classList.add('stamped');
    btn.innerHTML = `
        <div class="stamp-content">
            <i class="bi bi-check-all fs-1 mb-1"></i>
            <span>2026.03.06 성공!</span>
        </div>
    `;

    // 2. 캘린더 연동 (오늘 날짜 배경을 성공 색상으로 변경)
    const todayCircle = document.querySelector('.calendar-day.today');
    if (todayCircle) {
        todayCircle.style.background = "#00b894";
        todayCircle.innerHTML += '<i class="bi bi-check-circle-fill" style="position:absolute; top:-5px; right:-5px; color:#fff; font-size:10px;"></i>';
    }

    // 3. 축하 효과 (간단한 알림)
    alert('🎉 축하합니다! 오늘의 건강 도장이 찍혔습니다.');
    
    // 4. (선택사항) 진행도 바를 1단계 상승시키는 로직 호출 가능
    updateTotalProgress();
}

function updateTotalProgress() {
    // 실제 데이터와 연동 시: (현재일수 / 전체일수) * 100
    const currentProgress = 65; // 예시 데이터
    const progressBar = document.getElementById('main-challenge-bar');
    const progressText = document.getElementById('side-progress-percent');
    
    if (progressBar) {
        progressBar.style.width = currentProgress + '%';
        progressText.innerText = currentProgress;
    }
}

// 초기 로드 시 실행
document.addEventListener('DOMContentLoaded', () => {
    updateTotalProgress();
});


