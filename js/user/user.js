// User 인증 및 정보 관리를 위한 JS

document.addEventListener('DOMContentLoaded', () => {
    checkLoginSession();
    initAuthForms();
});

// 섹션 전환 함수 (글로벌 접근 가능하도록)
window.showAuthForm = function(type) {
    const sections = ['authChoiceAction', 'loginFormSection', 'registerFormSection', 'myPageSection', 'editProfileSection'];
    sections.forEach(s => {
        const el = document.getElementById(s);
        if (el) el.classList.add('d-none');
    });

    if (type === 'login') {
        document.getElementById('loginFormSection').classList.remove('d-none');
    } else if (type === 'register') {
        document.getElementById('registerFormSection').classList.remove('d-none');
    } else if (type === 'main') {
        document.getElementById('authChoiceAction').classList.remove('d-none');
    } else if (type === 'mypage') {
        document.getElementById('myPageSection').classList.remove('d-none');
    } else if (type === 'edit') {
        document.getElementById('editProfileSection').classList.remove('d-none');
        initEditForm();
    }
};

// 인증 폼 초기화
function initAuthForms() {
    // 회원가입 폼 제출
    const regForm = document.getElementById('userRegistrationForm');
    regForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleRegistration();
    });

    // 로그인 폼 제출
    const loginForm = document.getElementById('loginForm');
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleLogin();
    });

    // 정보 수정 폼 제출
    const editForm = document.getElementById('editProfileForm');
    editForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleUpdateProfile();
    });

    // 로그아웃 버튼
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // 탈퇴 버튼
    document.getElementById('deleteAccountBtn').addEventListener('click', handleDeleteAccount);

    // 수정 버튼 클릭 시
    document.getElementById('editProfileBtn').addEventListener('click', () => {
        showAuthForm('edit');
    });
}

// 회원 탈퇴 처리
function handleDeleteAccount() {
    const userId = localStorage.getItem('yamyam_session');
    if (!userId) return;

    if (confirm('정말로 탈퇴하시겠습니까?\n탈퇴 시 모든 데이터가 삭제되며 복구할 수 없습니다.')) {
        if (confirm('마지막 확인입니다. 정말로 계정을 삭제하시겠습니까?')) {
            let users = JSON.parse(localStorage.getItem('yamyam_users') || '{}');
            
            // 유저 삭제
            delete users[userId];
            
            localStorage.setItem('yamyam_users', JSON.stringify(users));
            localStorage.removeItem('yamyam_session');
            
            alert('그동안 얌얌을 이용해주셔서 감사합니다. 계정이 삭제되었습니다.');
            location.reload();
        }
    }
}

// 정보 수정 폼 초기값 설정
function initEditForm() {
    const userId = localStorage.getItem('yamyam_session');
    const users = JSON.parse(localStorage.getItem('yamyam_users') || '{}');
    const user = users[userId];

    if (!user) return;

    document.getElementById('editId').value = userId;
    document.getElementById('editName').value = user.profile.name;
    document.getElementById('editHeight').value = user.profile.height;
    document.getElementById('editWeight').value = user.profile.weight;
    document.getElementById('editDisease').value = user.profile.disease;
    
    if (user.profile.gender === 'male') {
        document.getElementById('editMale').checked = true;
    } else {
        document.getElementById('editFemale').checked = true;
    }
}

// 정보 수정 처리
function handleUpdateProfile() {
    const userId = localStorage.getItem('yamyam_session');
    const pw = document.getElementById('editPw').value;
    const name = document.getElementById('editName').value;
    const gender = document.querySelector('input[name="editGender"]:checked').value;
    const height = document.getElementById('editHeight').value;
    const weight = document.getElementById('editWeight').value;
    const disease = document.getElementById('editDisease').value || '없음';

    let users = JSON.parse(localStorage.getItem('yamyam_users') || '{}');
    
    // 프로필 업데이트
    users[userId].profile = {
        name, gender, height, weight, disease
    };

    // 비밀번호 입력 시에만 비밀번호 업데이트
    if (pw.trim() !== "") {
        users[userId].pw = pw;
    }

    localStorage.setItem('yamyam_users', JSON.stringify(users));
    alert('회원 정보가 수정되었습니다.');
    renderMyPage(userId);
}

// 회원가입 처리
function handleRegistration() {
    const id = document.getElementById('regId').value;
    const pw = document.getElementById('regPw').value;
    const name = document.getElementById('userName').value;
    const gender = document.querySelector('input[name="gender"]:checked').value;
    const height = document.getElementById('userHeight').value;
    const weight = document.getElementById('userWeight').value;
    const disease = document.getElementById('userDisease').value || '없음';

    // 기존 유저 데이터 확인
    let users = JSON.parse(localStorage.getItem('yamyam_users') || '{}');

    if (users[id]) {
        alert('이미 존재하는 아이디입니다.');
        return;
    }

    // 신규 유저 생성 (식단은 빈 배열로 시작)
    users[id] = {
        pw: pw,
        profile: {
            name, gender, height, weight, disease
        },
        diets: [] // 초기 식단은 비어있음
    };

    localStorage.setItem('yamyam_users', JSON.stringify(users));
    alert('회원가입이 완료되었습니다! 로그인해주세요.');
    showAuthForm('login');
}

// 로그인 처리
function handleLogin() {
    const id = document.getElementById('loginId').value;
    const pw = document.getElementById('loginPw').value;

    const users = JSON.parse(localStorage.getItem('yamyam_users') || '{}');

    if (users[id] && users[id].pw === pw) {
        // 세션 저장 (간단히 ID만 저장)
        localStorage.setItem('yamyam_session', id);
        alert(`${users[id].profile.name}님, 환영합니다!`);
        renderMyPage(id);
    } else {
        alert('아이디 또는 비밀번호가 일치하지 않습니다.');
    }
}

// 로그아웃 처리
function handleLogout() {
    localStorage.removeItem('yamyam_session');
    location.reload();
}

// 로그인 세션 확인
function checkLoginSession() {
    const sessionId = localStorage.getItem('yamyam_session');
    if (sessionId) {
        renderMyPage(sessionId);
    } else {
        showAuthForm('main');
    }
}

// 탭 전환 함수
window.switchUserTab = function(tabName) {
    // 탭 버튼 상태 변경
    const tabs = document.querySelectorAll('.tab-item');
    tabs.forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');

    // 탭 내용 전환
    const contents = ['profileTabContent', 'challengesTabContent'];
    contents.forEach(c => document.getElementById(c).classList.add('d-none'));
    
    const activeContent = document.getElementById(`${tabName}TabContent`);
    if (activeContent) activeContent.classList.remove('d-none');

    if (tabName === 'challenges') {
        renderSubscribedChallenges();
    }
};

// 구독 챌린지 렌더링 (더미 데이터)
function renderSubscribedChallenges() {
    const listContainer = document.getElementById('subscribedChallengesList');
    
    // 더미 챌린지 데이터
    const dummyChallenges = [
        {
            title: "30일 물 마시기 습관",
            category: "Habit",
            progress: 65,
            daysLeft: 12,
            icon: "💧",
            color: "#007aff"
        },
        {
            title: "주 3회 고단백 식단",
            category: "Diet",
            progress: 40,
            daysLeft: 5,
            icon: "🥩",
            color: "#ff9500"
        },
        {
            title: "밀가루 끊기 챌린지",
            category: "Health",
            progress: 90,
            daysLeft: 2,
            icon: "🥖",
            color: "#ff3b30"
        }
    ];

    listContainer.innerHTML = dummyChallenges.map(challenge => `
        <div class="col-md-6 col-lg-4">
            <div class="challenge-mini-card">
                <div class="challenge-card-header">
                    <span class="challenge-icon" style="background: ${challenge.color}15; color: ${challenge.color}">${challenge.icon}</span>
                    <span class="challenge-category">${challenge.category}</span>
                </div>
                <h4 class="challenge-title">${challenge.title}</h4>
                <div class="challenge-progress-area">
                    <div class="d-flex justify-content-between mb-2">
                        <span class="progress-label">진행률</span>
                        <span class="progress-value">${challenge.progress}%</span>
                    </div>
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill" style="width: ${challenge.progress}%; background: ${challenge.color}"></div>
                    </div>
                </div>
                <div class="challenge-footer">
                    <span class="days-left">남은 기간: <strong>${challenge.daysLeft}일</strong></span>
                </div>
            </div>
        </div>
    `).join('');
}

// 마이페이지 렌더링
function renderMyPage(userId) {
    const users = JSON.parse(localStorage.getItem('yamyam_users') || '{}');
    const user = users[userId];
    if (!user) return;

    showAuthForm('mypage');
    
    const titleEl = document.getElementById('pageTitle');
    const subtitleEl = document.getElementById('pageSubtitle');
    
    if (titleEl) {
        titleEl.innerHTML = `
            <span class="header-eyebrow">Member Profile</span>
            <h1 class="header-title">${user.profile.name}님의 프로필</h1>
        `;
    }
    if (subtitleEl) {
        subtitleEl.innerHTML = "개인 정보 및 건강 지표를 관리하세요.";
    }

    const infoContent = document.getElementById('userInfoContent');
    infoContent.innerHTML = `
        <div class="col-12">
            <div class="profile-main-card">
                <div class="profile-header-group">
                    <div class="profile-avatar">${user.profile.name[0]}</div>
                    <div class="profile-title-info">
                        <h2>${user.profile.name}</h2>
                        <span class="user-id-tag">@${userId}</span>
                    </div>
                </div>
                
                <div class="profile-stats-grid">
                    <div class="stat-box">
                        <span class="stat-label">성별</span>
                        <span class="stat-value">${user.profile.gender === 'male' ? '남성' : '여성'}</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label">키</span>
                        <span class="stat-value">${user.profile.height}<small>cm</small></span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label">몸무게</span>
                        <span class="stat-value">${user.profile.weight}<small>kg</small></span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label">BMI</span>
                        <span class="stat-value">${(user.profile.weight / ((user.profile.height/100)**2)).toFixed(1)}</span>
                    </div>
                </div>

                <div class="profile-footer-info">
                    <div class="info-row">
                        <span class="info-label">보유 질환</span>
                        <span class="info-value">${user.profile.disease}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">가입일</span>
                        <span class="info-value">${new Date().toLocaleDateString()}</span>
                    </div>
                </div>
            </div>
        </div>
    `;

    // renderDiets(userId);
}

// 식단 정보 렌더링
function renderDiets(userId) {
    const users = JSON.parse(localStorage.getItem('yamyam_users') || '{}');
    const user = users[userId];
    const dietDisplay = document.getElementById('userDietDisplay');
    const testAction = document.getElementById('testDietAction');

    if (user.diets && user.diets.length > 0) {
        dietDisplay.innerHTML = '<ul class="list-group text-start">' + 
            user.diets.map(d => `<li class="list-group-item">${d.날짜} - ${d.식사구분}: ${d.음식.map(f => f.식품명).join(', ')}</li>`).join('') + 
            '</ul>';
    } else {
        dietDisplay.innerHTML = '<p class="text-muted py-4">기록된 식단 정보가 없습니다.</p>';
        
        // 테스트용 데이터 로드 버튼 추가
        testAction.innerHTML = '<button class="btn btn-sm btn-light text-secondary" onclick="loadTestData()">테스트 데이터 로드(DEBUG)</button>';
    }
}

/**
 * [테스트용] 식단데이터.json 로드하여 유저에게 할당하는 기능
 * 유저 피드백에 따라 테스트용 주석 코드로 구현됨
 */
window.loadTestData = async function() {
    const userId = localStorage.getItem('yamyam_session');
    if (!userId) return;

    try {
        const response = await fetch('data/식단데이터.json');
        const testData = await response.json();
        
        // 상위 3개 데이터만 테스트로 추가
        const sampleDiets = testData.slice(0, 3);
        
        let users = JSON.parse(localStorage.getItem('yamyam_users'));
        users[userId].diets = sampleDiets;
        
        localStorage.setItem('yamyam_users', JSON.stringify(users));
        alert('테스트용 식단 데이터가 로드되었습니다.');
        renderDiets(userId);
        
    } catch (error) {
        console.error('테스트 데이터 로드 실패:', error);
    }
};


// 식단데이터.json을 참고하여 수동으로 데이터를 추가하고 싶을 때 사용 가능한 코드 조각
async function manuallyAddDiet() {
    const response = await fetch('data/식단데이터.json');
    const allDiets = await response.json();
    const selected = allDiets.find(d => d.식단ID === 1);
}

/**
 * [API] 식단 데이터 입력
 * 유저 아이디와 식단 객체를 받아 해당 유저의 데이터베이스(localStorage)에 추가합니다.
 * @param {string} userId - 데이터를 추가할 유저의 ID
 * @param {object} dietEntry - 추가할 식단 정보 (날짜, 식사구분, 음식 배열 등 포함)
 * @returns {boolean} 성공 여부
 */
window.apiAddDietData = function(userId, dietEntry) {
    let users = JSON.parse(localStorage.getItem('yamyam_users') || '{}');
    if (!users[userId]) {
        console.error(`API Error: '${userId}' 유저를 찾을 수 없습니다.`);
        return false;
    }
    
    if (!users[userId].diets) users[userId].diets = [];
    
    // 고유 식단 ID 생성 로직 (현재 유저의 식단 중 최대 ID + 1)
    const maxId = users[userId].diets.reduce((max, d) => Math.max(max, d.식단ID || 0), 0);
    const newDiet = {
        ...dietEntry,
        식단ID: maxId + 1,
        createdAt: new Date().toISOString()
    };
    
    users[userId].diets.push(newDiet);
    localStorage.setItem('yamyam_users', JSON.stringify(users));
    console.log(`API Success: '${userId}' 유저에게 새로운 식단이 추가되었습니다.`);
    return true;
};
/*
  사용 예시 (apiAddDietData):
  const newDiet = {
      날짜: "2024-05-20",
      식사구분: "점심",
      음식: [
          { 식품명: "닭가슴살 샐러드", 에너지: 350, 단백질: 30, 탄수화물: 10, 지방: 5 }
      ]
  };
  apiAddDietData('ssafy123', newDiet);
*/

/**
 * [API] 유저 식단 정보 내보내기 (날짜순 정렬)
 * 특정 유저의 모든 식단 데이터를 가져와 날짜순(오름차순)으로 정렬하여 반환합니다.
 * @param {string} userId - 데이터를 조회할 유저의 ID
 * @returns {Array} 날짜순으로 정렬된 식단 객체 배열
 */
window.apiGetSortedDiets = function(userId) {
    const users = JSON.parse(localStorage.getItem('yamyam_users') || '{}');
    if (!users[userId] || !users[userId].diets) {
        console.warn(`API Warning: '${userId}' 유저의 식단 데이터가 없습니다.`);
        return [];
    }
    
    // 원본 데이터를 복사하여 날짜순 정렬 (오름차순: 과거 -> 미래)
    const sortedDiets = [...users[userId].diets].sort((a, b) => {
        return new Date(a.날짜) - new Date(b.날짜);
    });
    
    console.log(`API Success: '${userId}' 유저의 식단 데이터를 날짜순으로 정렬하여 내보냅니다.`);
    return sortedDiets;
};
/*
  사용 예시 (apiGetSortedDiets):
  const myDiets = apiGetSortedDiets('ssafy123');
  console.log(myDiets); // 날짜별로 정렬된 식단 배열 출력
*/