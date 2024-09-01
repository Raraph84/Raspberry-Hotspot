#!/bin/bash
cd /home/pi/hotspot

while true; do
    echo "[$(date +"%d/%m/%Y %H:%M:%S")] Démarrage..." | tee -a logs.txt
    node index.js 2>&1 | tee -a logs.txt
    sleep 3
done
