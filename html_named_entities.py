import requests
import os
import re
import spacy
from bs4 import BeautifulSoup

def extract_named_entities(text, nlp):
    named_entities = set()
    text_blocks = [text[i:i + 15000] for i in range(0, len(text), 15000)]
    for block in text_blocks:
        doc = nlp(block)
        for ent in doc.ents:
            if ent.label_ == "PERSON":
                named_entities.add(ent.text)
    return named_entities

def save_html(html, output_path):
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html)

url = "https://yuinoid.neocities.org/txt/my_dsns_timeline"

response = requests.get(url)

if response.status_code == 200:
    text = response.text
else:
    print(f"Error: Unable to fetch data from {url}")

soup = BeautifulSoup(text, "html.parser")

# Remove scripts and styles
for script in soup(["script", "style"]):
    script.decompose()

text = soup.get_text()

# Remove extra newlines and spaces
text = re.sub(r'\n+', '\n', text).strip()

nlp = spacy.load("ja_core_news_sm")
named_entities = extract_named_entities(text, nlp)

html_index = '<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><title>Named Entities</title></head><body><h1>Named Entities</h1><ul>'

for ne in sorted(named_entities):
    html_index += f'<li>{ne}</li>'

html_index += '</ul></body></html>'

output_path = "D:/web/100percent-health/named_entities_index.html"

save_html(html_index, output_path)
