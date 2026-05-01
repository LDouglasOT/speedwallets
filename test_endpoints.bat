@echo off  
curl -s -o nul -w "%%{http_code}" http://localhost:3000/api/staff/lookup-rfid?rfid=TEST123  
