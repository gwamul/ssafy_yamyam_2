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
    document.getElementById('editBirthDate').value = user.profile.birthDate || '';
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
    const birthDate = document.getElementById('editBirthDate').value;
    const gender = document.querySelector('input[name="editGender"]:checked').value;
    const height = document.getElementById('editHeight').value;
    const weight = document.getElementById('editWeight').value;
    const disease = document.getElementById('editDisease').value || '없음';

    let users = JSON.parse(localStorage.getItem('yamyam_users') || '{}');
    
    // 프로필 업데이트
    users[userId].profile = {
        name, birthDate, gender, height, weight, disease
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
    const birthDate = document.getElementById('userBirthDate').value;
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
            name, birthDate, gender, height, weight, disease
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
function renderMyPage(targetUserId) {
    const myId = localStorage.getItem('yamyam_session');
    const users = JSON.parse(localStorage.getItem('yamyam_users') || '{}');
    const user = users[targetUserId];
    
    if (!user) {
        alert('사용자 정보를 찾을 수 없습니다.');
        return;
    }

    const isOthers = myId !== targetUserId;
    showAuthForm('mypage');
    
    const titleEl = document.getElementById('pageTitle');
    const subtitleEl = document.getElementById('pageSubtitle');
    
    if (titleEl) {
        titleEl.innerHTML = `
            <span class="header-eyebrow">${isOthers ? 'User Profile' : 'Member Profile'}</span>
            <h1 class="header-title">${user.profile.name}님의 프로필</h1>
        `;
    }
    if (subtitleEl) {
        subtitleEl.innerHTML = isOthers 
            ? `@${targetUserId} 사용자의 공개된 프로필 정보입니다.`
            : "개인 정보 및 건강 지표를 관리하세요.";
    }

    // 만나이 계산 함수
    const calculateAge = (birthDateStr) => {
        if (!birthDateStr) return '-';
        const birthDate = new Date(birthDateStr);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    const infoContent = document.getElementById('userInfoContent');
    const profileImgHtml = user.profile.image 
        ? `<img src="${user.profile.image}" class="avatar-img" alt="Profile">` 
        : user.profile.name[0];

    const followerCount = (user.followers || []).length;

    // 타인 프로필일 경우의 스타일 클래스
    const cardClass = isOthers ? 'profile-main-card others-profile' : 'profile-main-card';

    infoContent.innerHTML = `
        <div class="col-12">
            <div class="${cardClass}">
                ${isOthers ? `
                    <div class="others-badge">타인 프로필</div>
                    <button class="btn-back-to-my" onclick="renderMyPage('${myId}')">← 내 프로필로 돌아가기</button>
                ` : ''}
                <div class="profile-top-right">
                    <button class="follower-manage-btn" onclick="openFollowerModal('${targetUserId}')">
                        <span class="btn-label">Followers</span>
                        <span class="btn-count">${followerCount}</span>
                    </button>
                </div>
                <div class="profile-header-group">
                    <div class="profile-avatar-wrapper">
                        <div class="profile-avatar" id="profileAvatarDisplay">
                            ${profileImgHtml}
                        </div>
                        ${!isOthers ? `
                            <button class="avatar-edit-btn" onclick="document.getElementById('avatarInput').click()">
                                <span class="edit-icon">📸</span>
                            </button>
                            <input type="file" id="avatarInput" class="d-none" accept="image/*" onchange="handleAvatarUpload(event)">
                        ` : ''}
                    </div>
                    <div class="profile-title-info">
                        <h2>${user.profile.name}</h2>
                        <span class="user-id-tag">@${targetUserId}</span>
                    </div>
                </div>
                
                <div class="profile-stats-grid">
                    <div class="stat-box">
                        <span class="stat-label">성별</span>
                        <span class="stat-value">${user.profile.gender === 'male' ? '남성' : '여성'}</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label">생년월일(만나이)</span>
                        <span class="stat-value" style="font-size: 16px;">
                            ${user.profile.birthDate || '-'}<br>
                            <small class="text-primary" style="font-size: 18px; font-weight: 700;">(${calculateAge(user.profile.birthDate)}세)</small>
                        </span>
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

    // 타인 정보일 때는 관리 버튼들을 숨김
    const actionBtns = document.querySelector('.card .d-flex.gap-2');
    const deleteSection = document.querySelector('.mt-5.pt-4.border-top');
    if (isOthers) {
        if (actionBtns) actionBtns.classList.add('d-none');
        if (deleteSection) deleteSection.classList.add('d-none');
    } else {
        if (actionBtns) actionBtns.classList.remove('d-none');
        if (deleteSection) deleteSection.classList.remove('d-none');
    }
}

// 팔로워 모달 열기 및 렌더링
window.openFollowerModal = function(targetUserId) {
    renderFollowerList(targetUserId);
    const modal = new bootstrap.Modal(document.getElementById('followerModal'));
    modal.show();
};

// 팔로워 목록 렌더링
function renderFollowerList(ownerId) {
    const myId = localStorage.getItem('yamyam_session');
    const users = JSON.parse(localStorage.getItem('yamyam_users') || '{}');
    const user = users[ownerId];
    const followers = user.followers || [];
    const listContainer = document.getElementById('followerList');

    if (followers.length === 0) {
        listContainer.innerHTML = '<div class="text-center py-4 text-muted">팔로워가 없습니다.</div>';
        return;
    }

    listContainer.innerHTML = followers.map(fId => {
        const fUser = users[fId];
        const fName = fUser ? fUser.profile.name : '알 수 없는 사용자';
        const fImg = fUser && fUser.profile.image 
            ? `<img src="${fUser.profile.image}" class="follower-avatar">` 
            : `<div class="follower-avatar-placeholder">${fName[0]}</div>`;

        return `
            <div class="list-group-item d-flex justify-content-between align-items-center border-0 px-0 py-3">
                <div class="d-flex align-items-center gap-3 cursor-pointer" onclick="handleFollowerClick('${fId}')" style="cursor: pointer;">
                    ${fImg}
                    <div>
                        <div class="fw-bold follower-name-link" style="font-size: 0.95rem;">${fName}</div>
                        <div class="text-muted" style="font-size: 0.85rem;">@${fId}</div>
                    </div>
                </div>
                ${ownerId === myId ? `
                    <button class="btn btn-sm btn-outline-danger rounded-pill px-3" onclick="handleRemoveFollower('${fId}')">삭제</button>
                ` : ''}
            </div>
        `;
    }).join('');
}

// 팔로워 클릭 처리 (해당 유저 프로필로 이동)
window.handleFollowerClick = function(fId) {
    const modalEl = document.getElementById('followerModal');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();
    
    renderMyPage(fId);
};

// 팔로워 추가 처리
window.handleAddFollower = function() {
    const input = document.getElementById('newFollowerId');
    const targetId = input.value.trim();
    const myId = localStorage.getItem('yamyam_session');

    if (!targetId) return;
    if (targetId === myId) {
        alert('본인은 팔로우할 수 없습니다.');
        return;
    }

    let users = JSON.parse(localStorage.getItem('yamyam_users') || '{}');

    // 존재 여부 확인
    if (!users[targetId]) {
        alert(`'${targetId}' 아이디를 가진 사용자가 존재하지 않습니다.`);
        return;
    }

    // 이미 팔로우 중인지 확인
    if (!users[myId].followers) users[myId].followers = [];
    if (users[myId].followers.includes(targetId)) {
        alert('이미 추가된 팔로워입니다.');
        return;
    }

    // 추가
    users[myId].followers.push(targetId);
    localStorage.setItem('yamyam_users', JSON.stringify(users));
    
    input.value = '';
    renderFollowerList();
    renderMyPage(myId);
    alert('팔로워가 추가되었습니다.');
};

// 팔로워 삭제 처리
window.handleRemoveFollower = function(targetId) {
    if (!confirm('정말로 이 팔로워를 삭제하시겠습니까?')) return;

    const myId = localStorage.getItem('yamyam_session');
    let users = JSON.parse(localStorage.getItem('yamyam_users') || '{}');

    users[myId].followers = users[myId].followers.filter(id => id !== targetId);
    localStorage.setItem('yamyam_users', JSON.stringify(users));

    renderFollowerList();
    renderMyPage(myId);
};

// 프로필 사진 업로드 처리
window.handleAvatarUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    // 이미지 파일 여부 및 용량 체크 (localStorage 제한 고려)
    if (!file.type.startsWith('image/')) {
        alert('이미지 파일만 업로드 가능합니다.');
        return;
    }
    if (file.size > 1024 * 1024) { // 1MB 제한
        alert('이미지 용량이 너무 큽니다. 1MB 이하의 파일을 선택해주세요.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const base64Image = e.target.result;
        const userId = localStorage.getItem('yamyam_session');
        let users = JSON.parse(localStorage.getItem('yamyam_users') || '{}');
        
        if (users[userId]) {
            users[userId].profile.image = base64Image;
            localStorage.setItem('yamyam_users', JSON.stringify(users));
            
            // UI 즉시 업데이트
            const avatarDisplay = document.getElementById('profileAvatarDisplay');
            avatarDisplay.innerHTML = `<img src="${base64Image}" class="avatar-img" alt="Profile">`;
            alert('프로필 사진이 변경되었습니다.');
        }
    };
    reader.readAsDataURL(file);
};

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