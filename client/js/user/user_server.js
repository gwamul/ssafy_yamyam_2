const http = require("http");
const bcrypt = require("bcryptjs");

const PORT = 3001;

// 메모리 DB (Key: UserId, Value: UserData)
const userDb = new Map();

// CORS 헤더 설정
const setCORSHeaders = (res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "OPTIONS, GET, POST, DELETE, PUT",
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
};

const server = http.createServer((req, res) => {
  setCORSHeaders(res);

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
  });
  req.on("end", async () => {
    try {
      const data = body ? JSON.parse(body) : {};

      // 1. 회원가입
      if (req.url === "/api/user/register" && req.method === "POST") {
        if (userDb.has(data.id)) {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(
            JSON.stringify({ message: "이미 존재하는 아이디입니다." }),
          );
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(data.pw, salt);
        userDb.set(data.id, {
          pw: hashedPassword,
          profile: data.profile,
          diets: [],
          followers: [],
        });
        res.writeHead(201, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ message: "회원가입 성공" }));
      }

      // 2. 로그인
      if (req.url === "/api/user/login" && req.method === "POST") {
        const user = userDb.get(data.id);
        if (!user || !(await bcrypt.compare(data.pw, user.pw))) {
          res.writeHead(401, { "Content-Type": "application/json" });
          return res.end(
            JSON.stringify({ message: "아이디 또는 비밀번호가 틀립니다." }),
          );
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ id: data.id, profile: user.profile }));
      }

      // 3. 사용자 정보 조회
      if (req.url.startsWith("/api/user/") && req.method === "GET") {
        const userId = req.url.split("/").pop();
        const user = userDb.get(userId);
        if (!user) {
          res.writeHead(404, { "Content-Type": "application/json" });
          return res.end(
            JSON.stringify({ message: "사용자를 찾을 수 없습니다." }),
          );
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(
          JSON.stringify({
            id: userId,
            profile: user.profile,
            followers: user.followers,
          }),
        );
      }

      // 4. 정보 수정
      if (req.url === "/api/user/update" && req.method === "PUT") {
        const user = userDb.get(data.id);
        if (!user) {
          res.writeHead(404, { "Content-Type": "application/json" });
          return res.end(
            JSON.stringify({ message: "사용자를 찾을 수 없습니다." }),
          );
        }
        if (data.pw) {
          const salt = await bcrypt.genSalt(10);
          user.pw = await bcrypt.hash(data.pw, salt);
        }
        user.profile = { ...user.profile, ...data.profile };
        userDb.set(data.id, user);
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ message: "수정 성공" }));
      }

      // 5. 회원 탈퇴
      if (
        req.url.startsWith("/api/user/") &&
        req.method === "DELETE" &&
        !req.url.includes("/follower/")
      ) {
        const userId = req.url.split("/").pop();
        if (userDb.delete(userId)) {
          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ message: "탈퇴 성공" }));
        }
      }

      // 6. 팔로워 추가/삭제 및 7. 모든 유저 조회 (학습용 생략 가능하나 기능 유지를 위해 포함)
      if (req.url === "/api/user/follower/add" && req.method === "POST") {
        const { myId, targetId } = data;
        const me = userDb.get(myId);
        if (me && userDb.has(targetId)) {
          if (!me.followers) me.followers = [];
          if (!me.followers.includes(targetId)) me.followers.push(targetId);
          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(
            JSON.stringify({ message: "추가 성공", followers: me.followers }),
          );
        }
      }
      if (req.url === "/api/user/follower/remove" && req.method === "DELETE") {
        const { myId, targetId } = data;
        const me = userDb.get(myId);
        if (me && me.followers) {
          me.followers = me.followers.filter((id) => id !== targetId);
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(
          JSON.stringify({
            message: "삭제 성공",
            followers: me ? me.followers : [],
          }),
        );
      }
      if (req.url === "/api/users" && req.method === "GET") {
        const users = {};
        userDb.forEach((val, key) => {
          users[key] = {
            pw: val.pw, // 암호화된 비밀번호 추가
            profile: val.profile,
            followers: val.followers,
          };
        });
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify(users));
      }

      res.writeHead(404);
      res.end();
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`User DB Server (Node.js) is running on port ${PORT}`);
});
