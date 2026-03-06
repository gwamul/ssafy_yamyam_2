let dietList = []
let foodDB = []
let currentFoods = []
let editId = null


// -----------------------------
// 초기 실행
// -----------------------------
window.onload = async function(){

    const res = await fetch("data/food.json")
    foodDB = await res.json()

    renderDietList(dietList)

}


// -----------------------------
// 음식 검색
// -----------------------------
function searchFood(){

    const keyword = document.getElementById("foodSearch").value

    const result = foodDB.filter(food =>
        food.식품명.includes(keyword)
    )

    const list = document.getElementById("foodResult")

    list.innerHTML = ""

    result.forEach(food =>{

        list.innerHTML += `
        <li class="list-group-item d-flex justify-content-between">
            ${food.식품명}
            <button class="btn btn-sm btn-primary"
                onclick='addFood(${JSON.stringify(food)})'>
                추가
            </button>
        </li>
        `

    })

}


// -----------------------------
// 음식 추가
// -----------------------------
function addFood(food){

    currentFoods.push(food)

    renderSelectedFoods()

}


// -----------------------------
// 선택 음식 렌더링
// -----------------------------
function renderSelectedFoods(){

    const list = document.getElementById("selectedFoods")

    list.innerHTML = ""

    currentFoods.forEach((food,index)=>{

        list.innerHTML += `
        <li class="list-group-item d-flex justify-content-between">
            ${food.식품명} (${food.식품중량})
            <button class="btn btn-sm btn-danger"
                onclick="removeFood(${index})">
                삭제
            </button>
        </li>
        `
    })

}


// -----------------------------
// 음식 삭제
// -----------------------------
function removeFood(index){

    currentFoods.splice(index,1)

    renderSelectedFoods()

}


// -----------------------------
// 식단 저장 (CREATE / UPDATE)
// -----------------------------
function saveDiet(){

    const date = document.getElementById("dietDate").value
    const type = document.getElementById("dietType").value

    if(currentFoods.length === 0){
        alert("음식을 추가하세요")
        return
    }

    const diet = {
        dietId : editId ? editId : Date.now(),
        date : date,
        type : type,
        foods : currentFoods
    }

    if(editId){

        const index = dietList.findIndex(d=>d.dietId === editId)

        dietList[index] = diet

        editId = null

    }else{

        dietList.push(diet)

    }

    currentFoods = []

    renderSelectedFoods()

    renderDietList(dietList)

}


// -----------------------------
// 식단 조회
// -----------------------------
function searchDiet(){

    const date = document.getElementById("searchDate").value
    const type = document.getElementById("searchType").value

    const result = dietList.filter(diet =>{

        return (
            (date === "" || diet.date === date) &&
            (type === "all" || diet.type === type)
        )

    })

    renderDietList(result)

}


// -----------------------------
// 식단 리스트 출력
// -----------------------------
function renderDietList(list){

    const mealList = document.getElementById("mealList")

    mealList.innerHTML = ""

    list.forEach(diet=>{

        let totalEnergy = 0

        diet.foods.forEach(food=>{
            totalEnergy += Number(food.에너지)
        })

        let foodHTML = ""

        diet.foods.forEach(food=>{

            foodHTML += `
            <li class="list-group-item d-flex justify-content-between">
                <span>${food.식품명} (${food.식품중량})</span>
                <span class="text-primary">${food.에너지} kcal</span>
            </li>
            `
        })


        mealList.innerHTML += `
        <div class="col-12">

            <div class="card diet-card">

                <div class="card-header d-flex justify-content-between align-items-center">

                    <span class="badge bg-info text-dark">${diet.type}</span>

                    <span class="date text-muted">${diet.date}</span>

                    <div>
                        <button class="btn btn-sm btn-outline-secondary"
                            onclick="editDiet(${diet.dietId})">
                            수정
                        </button>

                        <button class="btn btn-sm btn-outline-danger"
                            onclick="deleteDiet(${diet.dietId})">
                            삭제
                        </button>
                    </div>

                </div>

                <div class="card-body">

                    <h5 class="card-title">
                        총 에너지 : ${totalEnergy.toFixed(2)} kcal
                    </h5>

                    <ul class="list-group list-group-flush">

                        ${foodHTML}

                    </ul>

                </div>

            </div>

        </div>
        `
    })

}


// -----------------------------
// 식단 수정
// -----------------------------
function editDiet(id){

    const diet = dietList.find(d=>d.dietId === id)

    document.getElementById("dietDate").value = diet.date
    document.getElementById("dietType").value = diet.type

    currentFoods = [...diet.foods]

    renderSelectedFoods()

    editId = id

}


// -----------------------------
// 식단 삭제
// -----------------------------
function deleteDiet(id){

    dietList = dietList.filter(d=>d.dietId !== id)

    renderDietList(dietList)

}
