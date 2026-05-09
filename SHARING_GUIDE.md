# CA Management System - Sharing Guide

## 🎯 How to Share with Colleagues/Friends

### **Easiest Method: ZIP Folder**

**Step 1: Share the ZIP File**
- File: `CA_Management_System_Portable.zip` (बड़ा होगा ~500MB-1GB)
- Share via: Google Drive, WeTransfer, USB Drive, WhatsApp Web

**Step 2: Recipient के लिए Instructions**

```
आपको क्या करना है:

1️⃣  ZIP को extract करो (किसी भी folder में)
   - Right-click → Extract All
   - या 7-Zip/WinRAR से extract करो

2️⃣  Node.js install करो (अगर नहीं है)
   - Download करो: https://nodejs.org/ (v18+ LTS)
   - Install करो (restart करना)

3️⃣  Folder खोलो और run करो
   - Command Prompt खोलो
   - cd C:\Users\<YourName>\CA_Management_System  (या जहाँ extract किया)
   - npm run dev
   
4️⃣  Done! ✅
   - Application खुद से open हो जाएगा
   - Login करो: admin / admin123
   - Data save होगा उनके own computer पर

```

---

## 🔒 Data Privacy
- ✅ हर computer का अपना अलग database
- ✅ कोई data cloud पर नहीं जाता
- ✅ सब कुछ locally save होता है
- ✅ Backup: `data/ca_system.db` file को copy कर सकते हो

---

## 🔧 Troubleshooting (अगर problem आए)

**Problem: "npm: command not found"**
- Solution: Node.js properly install नहीं हुआ। Restart computer करो।

**Problem: "Port 3000/3001 already in use"**
- Solution: `npm run dev` को stop करो (Ctrl+C), फिर फिर से चलाओ

**Problem: "npm install fails"**
- Solution: Folder delete करो और ZIP फिर से extract करो

---

## 📱 Admin Login Credentials
```
Username: admin
Password: admin123

Staff Login (optional):
Username: staff
Password: staff123
```

---

## 💾 Backing up Data
Database file location:
```
CA_Management_System\data\ca_system.db
```
सिर्फ यह file को USB या Cloud Drive पर copy कर सकते हो।

---

**Any questions? Contact करो!**
