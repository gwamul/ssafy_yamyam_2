import csv
import urllib.parse
import urllib.request
import json
import re
import time

input_csv = "./data/음식DB.csv"
output_csv = "./data/food_with_image.csv"


# 무료 번역 API (MyMemory)
def translate(text):
    try:
        url = "https://api.mymemory.translated.net/get?q=" + urllib.parse.quote(text) + "&langpair=ko|en"
        response = urllib.request.urlopen(url)
        data = json.loads(response.read().decode("utf-8"))

        translated = data["responseData"]["translatedText"]
        return translated
    except:
        return text


foods = set()

# CSV 읽기
with open(input_csv, encoding="utf-8-sig") as f:
    reader = csv.DictReader(f)

    for row in reader:
        name = row["식품명"]

        # 괄호 제거
        name = re.sub(r"\(.*?\)", "", name)

        # 언더바 뒤쪽만 사용
        if "_" in name:
            name = name.split("_")[-1]

        name = name.strip()

        foods.add(name)

print("음식 수:", len(foods))


with open(output_csv, "w", newline="", encoding="utf-8-sig") as f:
    writer = csv.writer(f)
    writer.writerow(["food_kr", "food_en", "image_url"])

    for food in foods:
        en = translate(food)

        query = urllib.parse.quote(en)
        image_url = f"https://source.unsplash.com/400x400/?{query},food"

        writer.writerow([food, en, image_url])

        print(food, "→", en)

        time.sleep(0.2)

print("완료")
