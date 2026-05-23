import google.generativeai as genai

# ใส่ Key ใหม่ของคุณที่นี่
genai.configure(api_key="AIzaSyBeFQiQYPW-aSpnNBUuwhkkg6Bzgpc8enA")

try:
    model = genai.GenerativeModel('gemini-2.5-flash')
    response = model.generate_content("สวัสดี ทดสอบการทำงาน")
    print("✅ สำเร็จ! คำตอบจาก AI:", response.text)
except Exception as e:
    print("❌ ล้มเหลว! สาเหตุเกิดจาก:", str(e))
