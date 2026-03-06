let dietList = [];
let foodDB = [];
let currentFoods = [];
let editId = null;
let selectedDate = new Date(); // 현재 선택된 날짜 (기본 오늘)

// -----------------------------
// 음식 이미지 URL 생성 헬퍼
// source.unsplash.com/400x400/?{영어이름},food 형식 사용
// 식품명에서 카테고리(언더바_앞)와 특수문자를 제거 후 영어로 변환
// -----------------------------
function getFoodImgUrl(foodName, engName = "") {
    // 영어 이름이 있으면 영어 사용
    let name = engName || foodName;
    // 언더바 처리
    if (name.includes('_')) {
        name = name.split('_').pop();
    }
    // 괄호 제거
    name = name.replace(/\(.*?\)/g, '').trim();
    // 수식어 외 특수문자 제거 (타비에 어움리는 단어만)
    name = name.replace(/[^\w\s가-힣]/g, ' ').trim();
    // URL 인코딩
    const encoded = encodeURIComponent(name);
    // 더 나은 건강식품 기반 Unsplash 모득 지원
    return `https://source.unsplash.com/100x100/?${encoded},korean,food`;
}

// -----------------------------
// 더미 데이터 생성 함수
// -----------------------------
function generateDummyData() {
    const todayStr = selectedDate.toISOString().split('T')[0];
    return [
        {
            "식단ID": 10001,
            "날짜": todayStr,
            "식사구분": "아침",
            "음식": [
                { "식품코드": "TEST1", "식품명": "불고기 덮밥", "에너지": 600, "탄수화물": 80, "단백질": 20, "지방": 15, "식품중량": "400g" }
            ]
        },
        {
            "식단ID": 10002,
            "날짜": todayStr,
            "식사구분": "점심",
            "음식": [
                { "식품코드": "TEST2", "식품명": "김치 찌개", "에너지": 500, "탄수화물": 60, "단백질": 15, "지방": 10, "식품중량": "350g" },
                { "식품코드": "TEST3", "식품명": "공기밥", "에너지": 300, "탄수화물": 65, "단백질": 5, "지방": 1, "식품중량": "200g" }
            ]
        },
        {
            "식단ID": 10003,
            "날짜": todayStr,
            "식사구분": "저녁",
            "음식": [
                { "식품코드": "TEST4", "식품명": "된장 찌개", "에너지": 400, "탄수화물": 50, "단백질": 15, "지방": 8, "식품중량": "300g" }
            ]
        }
    ];
}

// -----------------------------
// 초기 실행
// -----------------------------
window.onload = async function () {
    // 1. 기존 식단 데이터 로딩 (JSON)
    try {
        const resJSON = await fetch("./data/식단데이터.json"); // 경로 주의
        if (resJSON.ok) {
            dietList = await resJSON.json();
        }
    } catch (e) {
        console.error("식단데이터 로드 실패", e);
    }

    // 오늘 날짜 데이터가 없으면 더미 데이터 삽입
    const todayStr = selectedDate.toISOString().split('T')[0];
    if (!dietList.some(d => d["날짜"] === todayStr)) {
        dietList.push(...generateDummyData());
    }

    // 2. 전체 음식 DB 로딩 (CSV)
    try {
        const resCSV = await fetch("./data/음식DB.csv");
        if (resCSV.ok) {
            const csvText = await resCSV.text();
            parseFoodCSV(csvText); // foodDB 배열에 저장
        }
    } catch (e) {
        console.error("음식DB 로드 실패", e);
    }

    // 날짜 기본값 설정 (오늘)
    const dateInput = document.getElementById("currentDateDisplay");
    dateInput.valueAsDate = selectedDate;

    // 사이드바 렌더링
    renderDietSidebar();

    // 이벤트 리스너 등록
    dateInput.addEventListener("change", function (e) {
        selectedDate = e.target.valueAsDate || new Date();
        renderDietSidebar();
    });

    // 어제 / 내일 이동 버튼
    document.getElementById("btnPrevDay").addEventListener("click", () => {
        selectedDate.setDate(selectedDate.getDate() - 1);
        dateInput.valueAsDate = selectedDate;
        dateInput.dispatchEvent(new Event('change'));
    });

    document.getElementById("btnNextDay").addEventListener("click", () => {
        selectedDate.setDate(selectedDate.getDate() + 1);
        dateInput.valueAsDate = selectedDate;
        dateInput.dispatchEvent(new Event('change'));
    });

    document.getElementById("btnFoodSearch").addEventListener("click", searchFood);
    document.getElementById("foodSearch").addEventListener("keypress", function (e) {
        if (e.key === 'Enter') searchFood();
    });
    document.getElementById("btnSaveDiet").addEventListener("click", saveDiet);

    // 음식 추가하기 버튼 (모달 열기)
    document.getElementById("btnAddNewMeal").addEventListener("click", function () {
        editId = null;
        document.getElementById("addDietModalLabel").innerText = "새 식단 기록하기";
        document.getElementById("btnSaveDiet").innerText = "이 식단 기록하기";
        currentFoods = [];
        renderSelectedFoods();

        const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('addDietModal'));
        modal.show();

        setTimeout(() => { document.getElementById("foodSearch").focus(); }, 500);
    });
}

// -----------------------------
// CSV 파싱
// -----------------------------
function parseFoodCSV(csvText) {
    const lines = csvText.split('\n');
    if (lines.length < 2) return;

    // 헤더 파싱 (식품코드,식품명,식품대분류명,영양성분함량기준량,에너지(kcal),단백질(g),지방(g),탄수화물(g),당류(g),나트륨(mg),포화지방산(g),트랜스지방산(g),식품중량)
    // CSV 파일에 있을 수 있는 \uFEFF (BOM) 제거
    const headerLine = lines[0].replace(/^\uFEFF/, '');
    const headers = headerLine.split(',').map(h => h.trim());

    foodDB = [];
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue; // 빈 줄 건너뛰기
        // 따옴표로 묶인 CSV 처리 (간단 버전)
        const currentline = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);

        let obj = {};
        for (let j = 0; j < headers.length; j++) {
            obj[headers[j]] = currentline[j] ? currentline[j].replace(/^"|"$/g, '').trim() : "";
        }

        // 요구사항 형태에 맞춰 필드 매핑
        foodDB.push({
            "식품코드": obj["식품코드"],
            "식품명": obj["식품명"] || "",
            "에너지": parseFloat(obj["에너지(kcal)"] || 0),
            "탄수화물": parseFloat(obj["탄수화물(g)"] || 0),
            "단백질": parseFloat(obj["단백질(g)"] || 0),
            "지방": parseFloat(obj["지방(g)"] || 0),
            "식품중량": obj["식품중량"] || obj["영양성분함량기준량"] || "100g"
        });
    }
    console.log(`로드된 음식 수: ${foodDB.length}`);
}


// -----------------------------
// 음식 검색
// -----------------------------
function searchFood() {
    const keyword = document.getElementById("foodSearch").value.trim();
    if (!keyword) return;

    // 키워드가 포함된 항목 필터링 (최대 50개까지만 렌더링하여 성능 저하 방지)
    const result = foodDB.filter(food => food.식품명.includes(keyword)).slice(0, 50);

    const list = document.getElementById("foodResult");
    list.innerHTML = "";

    if (result.length === 0) {
        list.innerHTML = `<li class="list-group-item text-center text-muted">검색 결과가 없습니다.</li>`;
        return;
    }

    result.forEach(food => {
        const foodStr = encodeURIComponent(JSON.stringify(food));
        const imgUrl = getFoodImgUrl(food.식품명);
        list.innerHTML += `
        <li class="list-group-item food-item-card align-items-center">
            <img src="${imgUrl}" class="food-item-img" alt="${food.식품명}" onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&h=100&fit=crop'">
            <div class="food-item-content">
                <div class="food-title">${food.식품명}</div>
                <div class="food-meta">${food.에너지}kcal | 탄 ${food.탄수화물}g | 단 ${food.단백질}g | 지 ${food.지방}g</div>
                <button class="btn btn-sm btn-outline-success w-100 mt-1" onclick="addFood('${foodStr}')">추가</button>
            </div>
        </li>`;
    });
}


// -----------------------------
// 음식 추가 (Staging Area)
// -----------------------------
function addFood(foodStr) {
    const food = JSON.parse(decodeURIComponent(foodStr));
    currentFoods.push(food);
    renderSelectedFoods();
}

// -----------------------------
// 선택 음식 렌더링 (Staging Area)
// -----------------------------
function renderSelectedFoods() {
    const list = document.getElementById("selectedFoods");
    const nutInfo = document.getElementById("stagingNutrition");

    if (currentFoods.length === 0) {
        list.innerHTML = `<li class="list-group-item text-center text-muted py-4 shadow-sm my-2 rounded">선택된 음식이 없습니다. 좌측에서 추가해주세요.</li>`;
        nutInfo.classList.add("d-none");
        return;
    }

    list.innerHTML = "";

    let tEn = 0, tCarb = 0, tPro = 0, tFat = 0;

    currentFoods.forEach((food, index) => {
        tEn += (food.에너지 || 0);
        tCarb += (food.탄수화물 || 0);
        tPro += (food.단백질 || 0);
        tFat += (food.지방 || 0);

        const imgUrl = food._imgOverride || getFoodImgUrl(food.식품명);
        const isEditMode = editId !== null;
        const photoBtn = isEditMode
            ? `<button class="btn btn-xs btn-outline-secondary" style="font-size:10px; padding:2px 6px; position:absolute; bottom:0; right:0; border-radius:0 0 6px 0;" onclick="editFoodPhoto(${index})" title="사진 변경">📷</button>`
            : '';

        list.innerHTML += `
        <li class="list-group-item py-2 px-2 mb-1 border rounded shadow-sm" style="display:grid; grid-template-columns:56px 1fr auto; gap:8px; align-items:center;">
            <div style="position:relative;">
                <img src="${imgUrl}" style="width:56px; height:56px; object-fit:cover; border-radius:6px;" alt="${food.식품명}" onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&h=100&fit=crop'">
                ${photoBtn}
            </div>
            <div>
                <span class="d-block fw-bold small">${food.식품명} <span class="badge bg-light text-dark fw-normal">${food.식품중량}</span></span>
                <span class="small text-success">${food.에너지} kcal</span>
            </div>
            <button class="btn btn-sm btn-outline-danger" onclick="removeFood(${index})">✕</button>
        </li>
        `;
    });

    // 합계 표시
    nutInfo.classList.remove("d-none");
    nutInfo.innerHTML = `
        <div class="row text-center small">
            <div class="col-3"><strong>열량</strong><br><span class="text-primary">${Math.round(tEn)}</span> kcal</div>
            <div class="col-3"><strong>탄수화물</strong><br>${Math.round(tCarb)} g</div>
            <div class="col-3"><strong>단백질</strong><br>${Math.round(tPro)} g</div>
            <div class="col-3"><strong>지방</strong><br>${Math.round(tFat)} g</div>
        </div>
    `;
}


// -----------------------------
// 음식 삭제
// -----------------------------
function removeFood(index) {
    currentFoods.splice(index, 1);
    renderSelectedFoods();
}

// -----------------------------
// 음식 사진 수정 (편집 모드에서 개별 아이템)
// -----------------------------
function editFoodPhoto(index) {
    // hidden file input이 없으면 생성
    let fileInput = document.getElementById('_foodPhotoInput');
    if (!fileInput) {
        fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = '_foodPhotoInput';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);
    }

    // 기존 핸들러 제거 후 새 핸들러 등록
    fileInput.onchange = null;
    fileInput.value = '';
    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            currentFoods[index]._imgOverride = ev.target.result; // base64 저장
            renderSelectedFoods(); // 썸네일 즉시 업데이트
        };
        reader.readAsDataURL(file);
    };
    fileInput.click();
}


// -----------------------------
// 식단 저장 (CREATE / UPDATE)
// -----------------------------
async function saveDiet() {
    const dateStr = selectedDate.toISOString().split('T')[0];
    const type = document.getElementById("dietType").value;

    if (!dateStr) { alert("날짜를 선택하세요"); return; }
    if (currentFoods.length === 0) { alert("음식을 추가하세요"); return; }

    const wasEdit = !!editId;

    if (editId) {
        // ① 수정 모드: 해당 식단을 글로벌 리스트에서 업데이트
        const diet = { "식단ID": editId, "날짜": dateStr, "식사구분": type, "음식": [...currentFoods] };
        const idx = dietList.findIndex(d => d["식단ID"] === editId);
        if (idx > -1) dietList[idx] = diet;

        try {
            await fetch("http://localhost:3000/api/diet", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify(diet)
            });
        } catch (e) { console.warn("백엔드 없음, 로컈 저장만."); }

        editId = null;
        viewDiet(diet["식단ID"]);
    } else {
        // ② 추가 모드: 같은 날짜 + 식사구분 식단이 있으면 합치는 싛소, 없으면 새로 생성
        const existing = dietList.find(d => d["날짜"] === dateStr && d["식사구분"] === type);

        if (existing) {
            // 기존 식단에 음식 함치기
            existing["음식"] = [...existing["음식"], ...currentFoods];

            try {
                await fetch("http://localhost:3000/api/diet", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(existing)
                });
            } catch (e) { console.warn("백엔드 없음"); }

            viewDiet(existing["식단ID"]);
        } else {
            // 새 식단 생성
            const diet = { "식단ID": Date.now(), "날짜": dateStr, "식사구분": type, "음식": [...currentFoods] };
            dietList.push(diet);

            try {
                await fetch("http://localhost:3000/api/diet", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(diet)
                });
            } catch (e) { console.warn("백엔드 없음"); }

            viewDiet(diet["식단ID"]);
        }
    }

    // 초기화
    currentFoods = [];
    renderSelectedFoods();
    renderDietSidebar();

    // 모달 닫기
    const modalEl = document.getElementById('addDietModal');
    const modalInstance = bootstrap.Modal.getInstance(modalEl);
    if (modalInstance) modalInstance.hide();
}


// -----------------------------
// 좌측 사이드바 렌더링 (Read - Sidebar)
// -----------------------------
function renderDietSidebar() {
    const container = document.getElementById("mealBlocksContainer");
    const totalCalEl = document.getElementById("dailyTotalCalories");
    container.innerHTML = "";

    const targetDateStr = selectedDate.toISOString().split('T')[0];

    // 선택된 날짜의 식단만 필터링
    const todaysDiets = dietList.filter(d => d["날짜"] === targetDateStr);

    if (todaysDiets.length === 0) {
        container.innerHTML = `<div class="text-center text-muted small mt-4">저장된 식단이 없습니다.</div>`;
        totalCalEl.innerText = "0";
        document.getElementById("viewDietContent").innerHTML = `
            <div style="font-size: 3rem; margin-bottom: 1rem;">🥗</div>
            <h5>식단을 선택해주세요</h5>
        `;
        return;
    }

    let dailyTotal = 0;

    todaysDiets.forEach(diet => {
        let dietTotal = 0;
        let foodNames = [];

        diet["음식"].forEach(food => {
            dietTotal += Number(food["에너지"] || 0);
            foodNames.push(food["식품명"]);
        });

        dailyTotal += dietTotal;

        // 배지 색상 결정
        let badgeClass = "bg-secondary";
        if (diet["식사구분"] === "아침") badgeClass = "bg-primary text-dark";
        else if (diet["식사구분"] === "점심") badgeClass = "bg-primary text-dark";
        else if (diet["식사구분"] === "저녁") badgeClass = "bg-primary text-white";
        else if (diet["식사구분"] === "간식") badgeClass = "bg-primary text-white";

        const foodNamesStr = foodNames.join(", ");
        const dummyImgUrl = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&h=100&fit=crop";

        container.innerHTML += `
        <div class="meal-block" id="meal-block-${diet["식단ID"]}" onclick="viewDiet(${diet["식단ID"]})">
            <img src="${dummyImgUrl}" class="meal-block-img" alt="Meal">
            <div class="meal-block-content">
                <div class="meal-block-header">
                    <div>
                        <span class="badge ${badgeClass} me-1">${diet["식사구분"]}</span>
                        <span class="meal-block-calories">${Math.round(dietTotal)} kcal</span>
                    </div>
                </div>
                <div class="meal-block-title mb-1">${foodNames[0]} ${foodNames.length > 1 ? `외 ${foodNames.length - 1}건` : ''}</div>
                <div class="meal-block-items">${foodNamesStr}</div>
            </div>
        </div>
        `;
    });

    totalCalEl.innerText = Math.round(dailyTotal).toLocaleString();

    // 첫 번째 식단을 자동으로 표시
    if (todaysDiets.length > 0) {
        viewDiet(todaysDiets[0]["식단ID"]);
    }
}

// -----------------------------
// 식단 상세 조회 (Read - Detail Panel)
// -----------------------------
function viewDiet(id) {
    const diet = dietList.find(d => d["식단ID"] === id);
    if (!diet) return;

    // 활성 블록 스타일 적용
    document.querySelectorAll('.meal-block').forEach(el => el.classList.remove('active'));
    const block = document.getElementById(`meal-block-${id}`);
    if (block) block.classList.add('active');

    const viewContent = document.getElementById("viewDietContent");

    let totalEnergy = 0, totalCarb = 0, totalPro = 0, totalFat = 0;
    let foodHTML = "";

    diet["음식"].forEach(food => {
        totalEnergy += Number(food["에너지"] || 0);
        totalCarb += Number(food["탄수화물"] || 0);
        totalPro += Number(food["단백질"] || 0);
        totalFat += Number(food["지방"] || 0);

        const imgUrl = getFoodImgUrl(food["식품명"]);

        foodHTML += `
        <li class="list-group-item py-3 px-3" style="display:grid; grid-template-columns:64px 1fr auto; gap:12px; align-items:center;">
            <img src="${imgUrl}" style="width:64px; height:64px; object-fit:cover; border-radius:8px; box-shadow:0 2px 6px rgba(0,0,0,.1)" alt="${food['식품명']}" onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&h=100&fit=crop'">
            <div>
                <div class="fw-bold text-dark mb-1">${food["식품명"]} <span class="badge bg-light text-dark fw-normal ms-1">${food["식품중량"]}</span></div>
                <div class="small text-muted">탄수화물 ${food["탄수화물"]}g | 단백질 ${food["단백질"]}g | 지방 ${food["지방"]}g</div>
            </div>
            <div class="text-end">
                <div class="fs-5 fw-bold">${food["에너지"]}</div>
                <div class="small text-muted">kcal</div>
            </div>
        </li>
        `;
    });

    viewContent.innerHTML = `
        <div class="card border-0 shadow-sm w-100 h-100 d-flex flex-column">
            <div class="card-header bg-white border-bottom-0 pt-4 pb-2 d-flex justify-content-between align-items-center">
                <div>
                    <span class="badge bg-secondary fs-6 px-3 py-2 me-2">${diet["식사구분"]}</span>
                    <span class="text-muted fw-bold">${diet["날짜"]}</span>
                </div>
                <div>
                    <button class="btn btn-sm btn-outline-secondary me-1 px-3" onclick="editDiet(${diet["식단ID"]})">수정</button>
                    <button class="btn btn-sm px-3" onclick="deleteDiet(${diet["식단ID"]})">삭제</button>
                </div>
            </div>
            
            <div class="card-body d-flex flex-column">
                <div class="nutrition-totals p-4 mb-4 text-center rounded bg-light border">
                    <h6 class="text-muted fw-bold mb-3">식단 총 영양 정보</h6>
                    <div class="row">
                        <div class="col-3">
                            <div class="small text-muted mb-1">총 열량</div>
                            <div class="fs-4 fw-bold text-primary"><span id="happy">${Math.round(totalEnergy)}</span><span class="fs-6 fw-normal text-dark">kcal</span></div>
                        </div>
                        <div class="col-3">
                            <div class="small text-muted mb-1">탄수화물</div>
                            <div class="fs-5 fw-bold">${Math.round(totalCarb)}<span class="fs-6 fw-normal text-muted">g</span></div>
                        </div>
                        <div class="col-3">
                            <div class="small text-muted mb-1">단백질</div>
                            <div class="fs-5 fw-bold">${Math.round(totalPro)}<span class="fs-6 fw-normal text-muted">g</span></div>
                        </div>
                        <div class="col-3">
                            <div class="small text-muted mb-1">지방</div>
                            <div class="fs-5 fw-bold">${Math.round(totalFat)}<span class="fs-6 fw-normal text-muted">g</span></div>
                        </div>
                    </div>
                </div>

                <h6 class="fw-bold mb-3 text-dark">음식 (<span class="text-primary">${diet["음식"].length}</span>)</h6>
                <ul class="list-group list-group-flush border rounded flex-grow-1 overflow-auto">
                    ${foodHTML}
                </ul>
            </div>
        </div>
    `;

    // 약간의 페이드인 효과
    const panel = document.getElementById("viewDietPanel");
    panel.style.opacity = 0;
    setTimeout(() => { panel.style.opacity = 1; }, 50);
}


// -----------------------------
// 식단 수정
// -----------------------------
// -----------------------------
// 식단 수정 (Update)
// -----------------------------
function editDiet(id) {
    const diet = dietList.find(d => d["식단ID"] === id);
    if (!diet) return;

    // 마스터 날짜 동기화
    selectedDate = new Date(diet["날짜"]);
    document.getElementById("currentDateDisplay").value = diet["날짜"];
    renderDietSidebar();

    document.getElementById("dietType").value = diet["식사구분"];

    currentFoods = [...diet["음식"]];
    renderSelectedFoods();

    editId = id;

    document.getElementById("addDietModalLabel").innerText = "식단 수정하기";
    document.getElementById("btnSaveDiet").innerText = "수정 내용 저장하기";

    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('addDietModal'));
    modal.show();
}

// -----------------------------
// 식단 삭제 (Delete)
// -----------------------------
async function deleteDiet(id) {
    if (confirm("이 식단 기록을 정말 삭제하시겠습니까?")) {
        dietList = dietList.filter(d => d["식단ID"] !== id);
        renderDietSidebar();

        // 상세 패널 닫기 (플레이스홀더 표시)
        document.getElementById("viewDietContent").innerHTML = `
            <div style="font-size: 3rem; margin-bottom: 1rem;">🥗</div>
            <h5>식단을 선택해주세요</h5>
        `;

        // 서버 삭제 비동기 요청
        try {
            await fetch(`http://localhost:3000/api/diet/${id}`, { method: "DELETE" });
        } catch (e) {
            console.warn("Backend not running, deleted only locally. Run 'python server.py' to save actual files.");
        }
    }
}
