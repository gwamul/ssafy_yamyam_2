from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, Request, Query, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
from openai import OpenAI
import numpy as np
from pathlib import Path
import chromadb
import pypdf
import io
import shutil
import pandas as pd # CSV 처리를 위해 추가
from typing import Optional, List, Dict # 세션 관리를 위해 추가

# ==========================================
# [설정 영역] 사용자 환경에 맞게 수정하세요.
# ==========================================
OPENAI_API_KEY = ""

DATA_DIR = Path("./data")
DATA_DIR.mkdir(parents=True, exist_ok=True)

RAG_MODEL_NAME = 'paraphrase-multilingual-MiniLM-L12-v2'
SIMILARITY_THRESHOLD = 0.45
CHROMA_DB_PATH = "./chroma_data" 

# [전역 변수]
DB = []                     
DB_EMBEDDINGS = None        
rag_model = None            
openai_client = None        
collection = None           
chat_sessions: Dict[str, List[Dict]] = {} 

# ==========================================
# [핵심 로직] 대용량 처리를 위한 보완 함수
# ==========================================

def normalize(vecs):
    arr = np.asarray(vecs, dtype=np.float32)
    if arr.ndim == 1:
        denom = np.linalg.norm(arr) + 1e-12
        return arr / denom
    denom = np.linalg.norm(arr, axis=1, keepdims=True) + 1e-12
    return arr / denom

def add_to_db(chunks, source):
    """청크들을 DB와 ChromaDB에 추가합니다."""
    global DB, DB_EMBEDDINGS
    start_id = len(DB)
    new_items = [{"id": str(start_id + i), "text": c, "source": source} for i, c in enumerate(chunks)]
    DB.extend(new_items)

    new_embeddings = rag_model.encode([item["text"] for item in new_items])
    new_embeddings = normalize(new_embeddings)

    if DB_EMBEDDINGS is None or len(DB_EMBEDDINGS) == 0:
        DB_EMBEDDINGS = new_embeddings
    else:
        DB_EMBEDDINGS = np.vstack([DB_EMBEDDINGS, new_embeddings])

    collection.add(
        documents=[item["text"] for item in new_items],
        embeddings=new_embeddings.tolist(),
        metadatas=[{"source": item["source"]} for item in new_items],
        ids=[item["id"] for item in new_items]
    )
    return len(new_items)

def process_csv_to_db(file_path: Path):
    """6만 건의 데이터를 고려한 배치(Batch) 처리 로직"""
    print(f">>> [CSV 처리 시작] {file_path.name} (대용량 모드)")
    
    # 인코딩 확인
    df = None
    for enc in ['utf-8', 'cp949', 'euc-kr']:
        try:
            df = pd.read_csv(file_path, encoding=enc)
            print(f"    - 인코딩 확인: {enc}")
            break
        except: continue
    
    if df is None: return 0

    category = file_path.stem
    batch_size = 500  # 500개씩 끊어서 임베딩 (메모리 보호)
    total_rows = len(df)
    total_added = 0

    for i in range(0, total_rows, batch_size):
        batch_df = df.iloc[i : i + batch_size]
        row_texts = []
        for _, row in batch_df.iterrows():
            # 영양 성분 데이터 특화 정제 (비어있는 값 제외)
            content = ", ".join([f"{col}: {val}" for col, val in row.items() if pd.notna(val)])
            row_texts.append(f"[{category}] {content}")
        
        total_added += add_to_db(row_texts, file_path.name)
        print(f"    - [{min(i + batch_size, total_rows)}/{total_rows}] 데이터 인덱싱 중...")
    
    return total_added

def extract_text(file_path=None, content=None, file_ext=None):
    def read_pdf(reader: pypdf.PdfReader) -> str:
        return "\n".join([p.extract_text() or "" for p in reader.pages])

    if file_path:
        ext = file_path.suffix.lower()
        if ext == ".pdf": return read_pdf(pypdf.PdfReader(file_path))
        return file_path.read_text(encoding="utf-8", errors="ignore")
    return ""

def chunk_text(text, size=1000, overlap=100):
    chunks = []
    start = 0
    while start < len(text):
        end = start + size
        chunks.append(text[start:end])
        start += size - overlap
    return chunks

# ==========================================
# [서버 수명주기] 영속성(Persistence) 강화
# ==========================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    global DB, DB_EMBEDDINGS, rag_model, openai_client, collection

    print("-" * 50)
    print("1. AI 모델 및 클라이언트 초기화 중...")
    openai_client = OpenAI(api_key=OPENAI_API_KEY)
    rag_model = SentenceTransformer(RAG_MODEL_NAME)

    # 🛑 대용량 데이터이므로 reset_chroma_db()는 필요할 때만 수동으로 하세요.
    # reset_chroma_db() 

    chroma_client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
    collection = chroma_client.get_or_create_collection(
        name="health_care_db", 
        metadata={"hnsw:space": "cosine"}
    )

    # DB가 비어있는 경우에만 데이터 로딩 (6만 건 재작업 방지)
    current_count = collection.count()
    if current_count > 0:
        print(f"2. DB 로드 완료: 기존에 저장된 {current_count}개의 데이터를 사용합니다.")
    else:
        print(f"2. DB가 비어있습니다. [{DATA_DIR}]에서 파일 로딩을 시작합니다.")
        for f in DATA_DIR.glob("*"):
            if not f.is_file(): continue
            try:
                if f.suffix.lower() == ".csv":
                    process_csv_to_db(f)
                else:
                    text = extract_text(file_path=f)
                    if text.strip(): add_to_db(chunk_text(text), f.name)
                print(f"   - [로딩 완료] {f.name}")
            except Exception as e:
                print(f"   - [실패] {f.name}: {e}")

    print(f"3. 준비 완료! (총 {collection.count()}개 데이터 사용 가능)")
    print("-" * 50)
    yield
    print("서버가 종료됩니다.")

app = FastAPI(lifespan=lifespan)
# main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 모든 도메인 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ==========================================
# [API 엔드포인트]
# ==========================================
class ChatReq(BaseModel): 
    message: str
    session_id: Optional[str] = "default"

@app.post("/integrated-chat")
def integrated_chat(req: ChatReq, n_results: int = Query(3)):
    # 세션 관리 (대화 문맥 유지)
    if req.session_id not in chat_sessions:
        chat_sessions[req.session_id] = []
    history = chat_sessions[req.session_id][-4:] 

    # RAG 검색
    q = normalize(rag_model.encode([req.message]))
    results = collection.query(query_embeddings=q.tolist(), n_results=n_results)

    docs = results.get("documents", [[]])[0]
    metas = results.get("metadatas", [[]])[0]
    dists = results.get("distances", [[]])[0]

    picked = []
    for doc, meta, dist in zip(docs, metas, dists):
        sim = 1.0 - float(dist)
        if sim >= SIMILARITY_THRESHOLD:
            picked.append(f"[출처: {meta.get('source')}]\n{doc}")

    context = "\n\n".join(picked) if picked else "(참고 문서에 정확한 정보 없음)"
    
    # 전문가용 프롬프트
    prompt = f"""
당신은 전문 'AI 영양사'입니다. [참고문서]를 바탕으로 사용자의 식단 및 건강 질문에 답하세요.
문서에 숫자가 있다면(에너지, 단백질 등) 정확하게 인용하세요.
이 때, 제품명에 상표가 포함되어 있거나, 브랜드가 포함된 이름일 경우, 이름만
답변 끝에는 반드시 "※ 본 답변은 참고용이며 전문가와 상담하세요."를 포함하세요.
 
## 출력 형식 규칙 (반드시 준수)
- 모든 답변은 **마크다운(Markdown) 형식**으로 작성하세요.
- 제목은 `##`, 소제목은 `###`을 사용하세요.
- 수치 데이터(영양 성분 등)는 **굵게** 강조하거나 표(`| 항목 | 값 |`)로 정리하세요.
- 목록이 있을 경우 `-` 또는 `1.` 형식의 리스트를 사용하세요.
- 단순한 한 줄 답변도 마크다운 문법을 유지하세요.
 
[참고문서]
{context}
""".strip()

    messages = [{"role": "system", "content": prompt}]
    messages.extend(history)
    messages.append({"role": "user", "content": req.message})

    res = openai_client.chat.completions.create(model=GPT_MODEL, messages=messages)
    answer = res.choices[0].message.content

    # 히스토리 업데이트
    chat_sessions[req.session_id].append({"role": "user", "content": req.message})
    chat_sessions[req.session_id].append({"role": "assistant", "content": answer})

    return {
    "answer": res.choices[0].message.content, # 클라이언트가 이 'answer'를 찾습니다.
    "source": list(set([m['source'] for m in metas])) if picked else ["일반 지식"]
    }
@app.post("/upload")
async def upload_file(request: Request, file: UploadFile = File(...)):
    # 기존 업로드 로직 유지 (실시간 추가 가능)
    content = await file.read()
    save_path = DATA_DIR / file.filename
    with open(save_path, "wb") as f: f.write(content)
    
    if Path(file.filename).suffix.lower() == ".csv":
        added = process_csv_to_db(save_path)
    else:
        text = extract_text(content=content, file_ext=Path(file.filename).suffix.lower())
        added = add_to_db(chunk_text(text), file.filename)
    
    return {"success": True, "added": added}

# 기타 기존 엔드포인트(simpleparam 등)는 그대로 유지하여 사용하시면 됩니다.

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)