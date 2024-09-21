# Setup

## Install dependencies
```
sudo apt install -y curl
curl -fsSL https://deb.nodesource.com/setup_lts.x -o nodesource_setup.sh
sudo bash nodesource_setup.sh
rm nodesource_setup.sh
sudo apt install -y nodejs screen git apache2 mariadb-server hostapd dnsmasq vnstat ipset
```

## Create database
```
mysql -u root -p

CREATE USER 'hotspot'@'localhost' IDENTIFIED BY 'yourPassword'; # Change with a random password
CREATE DATABASE hotspot;
GRANT ALL PRIVILEGES ON hotspot.* TO 'hotspot'@'localhost' WITH GRANT OPTION;
use hotspot;
source ./database.sql;
exit
```

## Configure dnsmasq, hostapd and dhcpcd
Add to /etc/dhcpcd.conf
```
interface wlan0
nohook wpa_supplicant
static ip_address=192.168.2.1/24
```
And run
```
sudo nano /etc/sysctl.conf # Uncomment net.ipv4.ip_forward=1

sudo mv /etc/dnsmasq.conf /etc/dnsmasq.conf.save
sudo cp dnsmasq.conf /etc/dnsmasq.conf
echo "nameserver 1.0.0.1" | sudo tee /etc/dnsmasq-dns.conf # Change with the nameservers you want

sudo cp hostapd.conf /etc/hostapd/hostapd.conf
echo "DAEMON_CONF=\"/etc/hostapd/hostapd.conf\"" | sudo tee -a /etc/default/hostapd
sudo systemctl unmask hostapd.service
sudo systemctl disable hostapd.service # Disable run on startup since it is started by the worker 
sudo update-alternatives --set cyfmac43455-sdio.bin /lib/firmware/cypress/cyfmac43455-sdio-minimal.bin # Use a minimal version of the Raspberry Pi Wifi chip to increase maximum connected clients
```

## Configure apache2
Run
```
git clone https://github.com/Raraph84/Raspberry-Hotspot-Panel.git
git clone https://github.com/Raraph84/Raspberry-Hotspot-Portal.git
sudo cp -r Raspberry-Hotspot-Panel/www /var/www/panel
sudo cp -r Raspberry-Hotspot-Portal/www /var/www/portal

sudo 

sudo a2dissite 000-default
sudo a2ensite panel.lan portal.lan
sudo a2enmod rewrite ssl
sudo rm /var/www/html/* /etc/apache2/sites-available/default-ssl.conf /etc/apache2/sites-available/000-default.conf
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /etc/ssl/private/apache-selfsigned.key -out /etc/ssl/certs/apache-selfsigned.crt

sudo sed -i -e "s/ServerSignature On/ServerSignature Off/" /etc/apache2/conf-available/security.conf
sudo sed -i -e "s/ServerTokens OS/ServerTokens Prod/" /etc/apache2/conf-available/security.conf
```
And change `AllowOverride None` to `AllowOverride All` in `/etc/apache2/apache2.conf` after `<Directory /var/www/>`

## Install worker
```
git clone https://github.com/Raraph84/Raspberry-Hotspot.git ~/hotspot
cd ~/hotspot
npm install --omit=dev
chmod +x start.sh updateSets.sh
sudo nano /etc/rc.local # Add `screen -dmS hotspot /home/pi/hotspot/start.sh` before `exit 0`
cp config.example.json config.json
nano config.json # Configure the worker
sudo reboot
```
