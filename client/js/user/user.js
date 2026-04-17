// User 인증 및 정보 관리를 위한 JS (Server API 연동 버전)

const USER_API_URL = "http://localhost:3001/api";

document.addEventListener("DOMContentLoaded", () => {
  checkLoginSession();
  initAuthForms();
});

// 섹션 전환 함수 (글로벌 접근 가능하도록)
window.showAuthForm = function (type) {
  const sections = [
    "authChoiceAction",
    "loginFormSection",
    "registerFormSection",
    "myPageSection",
    "editProfileSection",
  ];
  sections.forEach((s) => {
    const el = document.getElementById(s);
    if (el) el.classList.add("d-none");
  });

  if (type === "login") {
    document.getElementById("loginFormSection").classList.remove("d-none");
  } else if (type === "register") {
    document.getElementById("registerFormSection").classList.remove("d-none");
  } else if (type === "main") {
    document.getElementById("authChoiceAction").classList.remove("d-none");
  } else if (type === "mypage") {
    document.getElementById("myPageSection").classList.remove("d-none");
  } else if (type === "edit") {
    document.getElementById("editProfileSection").classList.remove("d-none");
    initEditForm();
  }
};

// 인증 폼 초기화
function initAuthForms() {
  const regForm = document.getElementById("userRegistrationForm");
  regForm.addEventListener("submit", (e) => {
    e.preventDefault();
    handleRegistration();
  });

  const loginForm = document.getElementById("loginForm");
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    handleLogin();
  });

  const editForm = document.getElementById("editProfileForm");
  editForm.addEventListener("submit", (e) => {
    e.preventDefault();
    handleUpdateProfile();
  });

  document.getElementById("logoutBtn").addEventListener("click", handleLogout);
  document
    .getElementById("deleteAccountBtn")
    .addEventListener("click", handleDeleteAccount);
  document.getElementById("editProfileBtn").addEventListener("click", () => {
    showAuthForm("edit");
  });
}

// 회원 탈퇴 처리
async function handleDeleteAccount() {
  const userId = localStorage.getItem("yamyam_session");
  if (!userId) return;

  if (
    confirm(
      "정말로 탈퇴하시겠습니까?\n탈퇴 시 모든 데이터가 삭제되며 복구할 수 없습니다.",
    )
  ) {
    if (confirm("마지막 확인입니다. 정말로 계정을 삭제하시겠습니까?")) {
      try {
        const response = await fetch(`${USER_API_URL}/user/${userId}`, {
          method: "DELETE",
        });
        if (response.ok) {
          localStorage.removeItem("yamyam_session");
          alert(
            "그동안 얌얌을 이용해주셔서 감사합니다. 계정이 삭제되었습니다.",
          );
          location.reload();
        } else {
          alert("탈퇴 처리 중 오류가 발생했습니다.");
        }
      } catch (error) {
        console.error("Delete error:", error);
      }
    }
  }
}

// 정보 수정 폼 초기값 설정
async function initEditForm() {
  const userId = localStorage.getItem("yamyam_session");
  try {
    const response = await fetch(`${USER_API_URL}/user/${userId}`);
    const user = await response.json();

    if (user) {
      document.getElementById("editId").value = userId;
      document.getElementById("editName").value = user.profile.name;
      document.getElementById("editBirthDate").value =
        user.profile.birthDate || "";
      document.getElementById("editHeight").value = user.profile.height;
      document.getElementById("editWeight").value = user.profile.weight;
      document.getElementById("editDisease").value = user.profile.disease;

      if (user.profile.gender === "male") {
        document.getElementById("editMale").checked = true;
      } else {
        document.getElementById("editFemale").checked = true;
      }
    }
  } catch (error) {
    console.error("Fetch user error:", error);
  }
}

// 정보 수정 처리
async function handleUpdateProfile() {
  const userId = localStorage.getItem("yamyam_session");
  const pw = document.getElementById("editPw").value;
  const name = document.getElementById("editName").value;
  const birthDate = document.getElementById("editBirthDate").value;
  const gender = document.querySelector(
    'input[name="editGender"]:checked',
  ).value;
  const height = document.getElementById("editHeight").value;
  const weight = document.getElementById("editWeight").value;
  const disease = document.getElementById("editDisease").value || "없음";

  const updateData = {
    id: userId,
    profile: { name, birthDate, gender, height, weight, disease },
  };

  if (pw.trim() !== "") {
    updateData.pw = pw;
  }

  try {
    const response = await fetch(`${USER_API_URL}/user/update`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updateData),
    });

    if (response.ok) {
      alert("회원 정보가 수정되었습니다.");
      renderMyPage(userId);
    } else {
      alert("수정 실패하였습니다.");
    }
  } catch (error) {
    console.error("Update profile error:", error);
  }
}

// 회원가입 처리
async function handleRegistration() {
  const id = document.getElementById("regId").value;
  const pw = document.getElementById("regPw").value;
  const name = document.getElementById("userName").value;
  const birthDate = document.getElementById("userBirthDate").value;
  const gender = document.querySelector('input[name="gender"]:checked').value;
  const height = document.getElementById("userHeight").value;
  const weight = document.getElementById("userWeight").value;
  const disease = document.getElementById("userDisease").value || "없음";

  const newUser = {
    id,
    pw,
    profile: { name, birthDate, gender, height, weight, disease },
  };

  try {
    const response = await fetch(`${USER_API_URL}/user/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUser),
    });

    const result = await response.json();
    if (response.ok) {
      alert("회원가입이 완료되었습니다! 로그인해주세요.");
      showAuthForm("login");
    } else {
      alert(result.message || "회원가입 실패");
    }
  } catch (error) {
    console.error("Registration error:", error);
  }
}

// 로그인 처리
async function handleLogin() {
  const id = document.getElementById("loginId").value;
  const pw = document.getElementById("loginPw").value;

  try {
    const response = await fetch(`${USER_API_URL}/user/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, pw }),
    });

    const result = await response.json();
    if (response.ok) {
      localStorage.setItem("yamyam_session", id);
      alert(`${result.profile.name}님, 환영합니다!`);
      renderMyPage(id);
    } else {
      alert(result.message || "로그인 실패");
    }
  } catch (error) {
    console.error("Login error:", error);
  }
}

// 로그아웃 처리
function handleLogout() {
  localStorage.removeItem("yamyam_session");
  location.reload();
}

// 로그인 세션 확인
function checkLoginSession() {
  const sessionId = localStorage.getItem("yamyam_session");
  if (sessionId) {
    renderMyPage(sessionId);
  } else {
    showAuthForm("main");
  }
}

// 탭 인디케이터 이동 및 전환 함수는 UI 로직이므로 유지
function moveTabIndicator(targetEl) {
  const indicator = document.querySelector(".tab-indicator");
  if (!indicator || !targetEl) return;
  indicator.style.width = `${targetEl.offsetWidth}px`;
  indicator.style.left = `${targetEl.offsetLeft}px`;
}

window.switchUserTab = function (tabName) {
  const target = event
    ? event.currentTarget
    : document.querySelector(`.tab-item[onclick*="${tabName}"]`);
  const tabs = document.querySelectorAll(".tab-item");
  tabs.forEach((t) => t.classList.remove("active"));
  if (target) {
    target.classList.add("active");
    moveTabIndicator(target);
  }
  const contents = ["profileTabContent", "challengesTabContent"];
  contents.forEach((c) => {
    const el = document.getElementById(c);
    if (el) el.classList.add("d-none");
  });
  const activeContent = document.getElementById(`${tabName}TabContent`);
  if (activeContent) {
    activeContent.classList.remove("d-none");
    activeContent.classList.add("active");
  }
  if (tabName === "challenges") renderSubscribedChallenges();
};

// 마이페이지 렌더링
async function renderMyPage(targetUserId) {
  const myId = localStorage.getItem("yamyam_session");

  try {
    const response = await fetch(`${USER_API_URL}/user/${targetUserId}`);
    if (!response.ok) {
      alert("사용자 정보를 찾을 수 없습니다.");
      return;
    }
    const user = await response.json();

    const isOthers = myId !== targetUserId;
    showAuthForm("mypage");

    const titleEl = document.getElementById("pageTitle");
    const subtitleEl = document.getElementById("pageSubtitle");

    if (titleEl) {
      titleEl.innerHTML = `
                <span class="header-eyebrow">${isOthers ? "User Profile" : "Member Profile"}</span>
                <h1 class="header-title">${user.profile.name}님의 프로필</h1>
            `;
    }
    if (subtitleEl) {
      subtitleEl.innerHTML = isOthers
        ? `@${targetUserId} 사용자의 공개된 프로필 정보입니다.`
        : "개인 정보 및 건강 지표를 관리하세요.";
    }

    const calculateAge = (birthDateStr) => {
      if (!birthDateStr) return "-";
      const birthDate = new Date(birthDateStr);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
      return age;
    };

    const infoContent = document.getElementById("userInfoContent");
    const profileImgHtml = user.profile.image
      ? `<img src="${user.profile.image}" class="avatar-img" alt="Profile">`
      : user.profile.name[0];

    const followerCount = (user.followers || []).length;
    const cardClass = isOthers
      ? "profile-main-card others-profile"
      : "profile-main-card";

    infoContent.innerHTML = `
            <div class="col-12">
                <div class="${cardClass}">
                    ${
                      isOthers
                        ? `
                        <div class="others-badge">타인 프로필</div>
                        <button class="btn-back-to-my" onclick="renderMyPage('${myId}')">← 내 프로필로 돌아가기</button>
                    `
                        : ""
                    }
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
                            ${
                              !isOthers
                                ? `
                                <button class="avatar-edit-btn" onclick="document.getElementById('avatarInput').click()">
                                    <span class="edit-icon">📸</span>
                                </button>
                                <input type="file" id="avatarInput" class="d-none" accept="image/*" onchange="handleAvatarUpload(event)">
                            `
                                : ""
                            }
                        </div>
                        <div class="profile-title-info">
                            <h2>${user.profile.name}</h2>
                            <span class="user-id-tag">@${targetUserId}</span>
                        </div>
                    </div>
                    <div class="profile-stats-grid">
                        <div class="stat-box">
                            <span class="stat-label">성별</span>
                            <span class="stat-value">${user.profile.gender === "male" ? "남성" : "여성"}</span>
                        </div>
                        <div class="stat-box">
                            <span class="stat-label">생년월일(만나이)</span>
                            <span class="stat-value" style="font-size: 16px;">
                                ${user.profile.birthDate || "-"}<br>
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
                            <span class="stat-value">${(user.profile.weight / (user.profile.height / 100) ** 2).toFixed(1)}</span>
                        </div>
                    </div>
                    <div class="profile-footer-info">
                        <div class="info-row">
                            <span class="info-label">보유 질환</span>
                            <span class="info-value">${user.profile.disease}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

    const actionBtns = document.querySelector(".card .d-flex.gap-2");
    const deleteSection = document.querySelector(".mt-5.pt-4.border-top");
    if (isOthers) {
      if (actionBtns) actionBtns.classList.add("d-none");
      if (deleteSection) deleteSection.classList.add("d-none");
    } else {
      if (actionBtns) actionBtns.classList.remove("d-none");
      if (deleteSection) deleteSection.classList.remove("d-none");
    }

    setTimeout(() => {
      const activeTab = document.querySelector(".tab-item.active");
      if (activeTab) moveTabIndicator(activeTab);
    }, 50);
  } catch (error) {
    console.error("Render mypage error:", error);
  }
}

// 팔로워 관련 함수들도 API 기반으로 수정
window.openFollowerModal = function (targetUserId) {
  renderFollowerList(targetUserId);
  const modal = new bootstrap.Modal(document.getElementById("followerModal"));
  modal.show();
};

async function renderFollowerList(ownerId) {
  const myId = localStorage.getItem("yamyam_session");
  try {
    // 소유자 정보 가져오기
    const response = await fetch(`${USER_API_URL}/user/${ownerId}`);
    const user = await response.json();
    const followers = user.followers || [];

    // 모든 유저 정보 가져오기 (이름 매칭용 - 학습용이므로 단순화)
    const allRes = await fetch(`${USER_API_URL}/users`);
    const allUsers = await allRes.json();

    const listContainer = document.getElementById("followerList");
    if (followers.length === 0) {
      listContainer.innerHTML =
        '<div class="text-center py-4 text-muted">팔로워가 없습니다.</div>';
      return;
    }

    listContainer.innerHTML = followers
      .map((fId) => {
        const fUser = allUsers[fId];
        const fName = fUser ? fUser.profile.name : "알 수 없는 사용자";
        const fImg =
          fUser && fUser.profile.image
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
                    ${
                      ownerId === myId
                        ? `
                        <button class="btn btn-sm btn-outline-danger rounded-pill px-3" onclick="handleRemoveFollower('${fId}')">삭제</button>
                    `
                        : ""
                    }
                </div>
            `;
      })
      .join("");
  } catch (error) {
    console.error("Render follower list error:", error);
  }
}

window.handleFollowerClick = function (fId) {
  const modalEl = document.getElementById("followerModal");
  const modal = bootstrap.Modal.getInstance(modalEl);
  if (modal) modal.hide();
  renderMyPage(fId);
};

window.handleAddFollower = async function () {
  const input = document.getElementById("newFollowerId");
  const targetId = input.value.trim();
  const myId = localStorage.getItem("yamyam_session");

  if (!targetId || targetId === myId) {
    alert(
      targetId === myId
        ? "본인은 팔로우할 수 없습니다."
        : "아이디를 입력하세요.",
    );
    return;
  }

  try {
    const response = await fetch(`${USER_API_URL}/user/follower/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ myId, targetId }),
    });

    if (response.ok) {
      input.value = "";
      renderFollowerList(myId);
      renderMyPage(myId);
      alert("팔로워가 추가되었습니다.");
    } else {
      const res = await response.json();
      alert(res.message || "팔로우 실패");
    }
  } catch (error) {
    console.error("Add follower error:", error);
  }
};

window.handleRemoveFollower = async function (targetId) {
  if (!confirm("정말로 이 팔로워를 삭제하시겠습니까?")) return;
  const myId = localStorage.getItem("yamyam_session");

  try {
    const response = await fetch(`${USER_API_URL}/user/follower/remove`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ myId, targetId }),
    });

    if (response.ok) {
      renderFollowerList(myId);
      renderMyPage(myId);
    }
  } catch (error) {
    console.error("Remove follower error:", error);
  }
};

window.handleAvatarUpload = function (event) {
  const file = event.target.files[0];
  if (!file || !file.type.startsWith("image/")) return;
  if (file.size > 1024 * 1024) {
    alert("1MB 이하 파일만 가능합니다.");
    return;
  }

  const reader = new FileReader();
  reader.onload = async function (e) {
    const base64Image = e.target.result;
    const userId = localStorage.getItem("yamyam_session");

    try {
      // 정보 수정을 통해 이미지 업데이트
      const res = await fetch(`${USER_API_URL}/user/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, profile: { image: base64Image } }),
      });
      if (res.ok) {
        document.getElementById("profileAvatarDisplay").innerHTML =
          `<img src="${base64Image}" class="avatar-img" alt="Profile">`;
        alert("프로필 사진이 변경되었습니다.");
      }
    } catch (error) {
      console.error("Avatar upload error:", error);
    }
  };
  reader.readAsDataURL(file);
};

// 식단 렌더링 (구독 챌린지는 localStorage 유지 - 요구사항 범위 밖)
function renderSubscribedChallenges() {
  const listContainer = document.getElementById("subscribedChallengesList");
  const mySubscribed = JSON.parse(localStorage.getItem("mySubscribed")) || [];
  if (mySubscribed.length === 0) {
    listContainer.innerHTML =
      '<div class="col-12 text-center py-5"><p class="text-muted">참여 중인 챌린지가 없습니다.</p></div>';
    return;
  }
  listContainer.innerHTML = mySubscribed
    .map((challenge) => {
      const themeColor =
        challenge.difficulty === "hard"
          ? "#ff3b30"
          : challenge.difficulty === "medium"
            ? "#ff9500"
            : "#34c759";
      return `<div class="col-md-6 col-lg-4"><div class="challenge-mini-card shadow-sm border-0 rounded-4 p-4 bg-white"><h4 class="challenge-title fw-bold mb-3">${challenge.title || challenge.name}</h4><button class="btn btn-link text-danger btn-sm p-0 text-decoration-none" onclick="cancelChallenge(${challenge.id})">포기</button></div></div>`;
    })
    .join("");
}
