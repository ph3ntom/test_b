# 프론트엔드-백엔드 서버 통신 설정 가이드

## 환경 구성

- **프론트엔드 서버**: Ubuntu (VMware) - 192.168.60.135:80
  - Nginx + Next.js
- **백엔드 서버**: Rocky OS (VMware) - 192.168.60.138:3001
  - NestJS
- **네트워크**: VMware NAT 모드, 고정 IP

---

## 1. VMware NAT 네트워크 고정 IP 설정

### 1.1 VMware 네트워크 설정

1. **VMware Workstation 열기** → `Edit` → `Virtual Network Editor`
2. **관리자 권한으로 변경** (Change Settings 버튼 클릭)
3. **VMnet8 (NAT)** 선택
4. **Subnet IP 확인** (예: 192.168.60.0)
5. **NAT Settings** 클릭 → Gateway IP 확인 (일반적으로 192.168.60.2)
6. **DHCP Settings** 클릭
   - DHCP 범위 확인 (예: 192.168.60.128 ~ 192.168.60.254)
   - 고정 IP는 이 범위 밖에서 설정 권장 (예: 192.168.60.135, 192.168.60.138)

### 1.2 Ubuntu (프론트엔드) 고정 IP 설정

**Netplan 방식 (Ubuntu 18.04 이상)**

```bash
# 네트워크 설정 파일 편집
sudo nano /etc/netplan/00-installer-config.yaml
```

설정 내용:
```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    ens33:  # 네트워크 인터페이스 이름 확인 (ip a 명령어로 확인)
      dhcp4: no
      addresses:
        - 192.168.60.135/24
      gateway4: 192.168.60.2
      nameservers:
        addresses:
          - 8.8.8.8
          - 8.8.4.4
```

적용:
```bash
sudo netplan apply

# IP 확인
ip a
```

### 1.3 Rocky OS (백엔드) 고정 IP 설정

**NetworkManager 방식**

```bash
# 네트워크 인터페이스 확인
ip a
# 또는
nmcli device status

# 네트워크 설정 파일 편집 (ens33은 인터페이스 이름)
sudo vi /etc/sysconfig/network-scripts/ifcfg-ens33
```

설정 내용:
```ini
TYPE=Ethernet
BOOTPROTO=static
NAME=ens33
DEVICE=ens33
ONBOOT=yes
IPADDR=192.168.60.138
NETMASK=255.255.255.0
GATEWAY=192.168.60.2
DNS1=8.8.8.8
DNS2=8.8.4.4
```

적용:
```bash
# NetworkManager 재시작
sudo systemctl restart NetworkManager

# 또는 네트워크 재시작
sudo nmcli connection down ens33
sudo nmcli connection up ens33

# IP 확인
ip a
```

---

## 2. Rocky OS (백엔드) 방화벽 설정

### 2.1 Firewalld 설정

```bash
# 방화벽 상태 확인
sudo systemctl status firewalld

# 방화벽이 비활성화되어 있다면 시작
sudo systemctl start firewalld
sudo systemctl enable firewalld

# 3001 포트 열기 (NestJS)
sudo firewall-cmd --permanent --add-port=3001/tcp

# 설정 적용
sudo firewall-cmd --reload

# 열린 포트 확인
sudo firewall-cmd --list-ports

# 특정 IP에서만 접근 허용 (선택사항 - 보안 강화)
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="192.168.60.135" port protocol="tcp" port="3001" accept'
sudo firewall-cmd --reload
```

### 2.2 SELinux 설정 (Rocky OS의 경우)

```bash
# SELinux 상태 확인
getenforce

# SELinux가 Enforcing 모드인 경우, 포트 허용
sudo semanage port -a -t http_port_t -p tcp 3001

# semanage 명령어가 없는 경우 설치
sudo yum install -y policycoreutils-python-utils
```

---

## 3. Ubuntu (프론트엔드) 방화벽 설정

### 3.1 UFW 방화벽 설정

```bash
# 방화벽 상태 확인
sudo ufw status

# 방화벽이 비활성화되어 있다면 활성화
sudo ufw enable

# SSH 포트 먼저 열기 (원격 접속이 끊기지 않도록)
sudo ufw allow 22/tcp

# HTTP/HTTPS 포트 열기
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 백엔드 서버로의 아웃바운드 연결 허용 (기본적으로 허용됨)
# 추가 설정이 필요한 경우:
sudo ufw allow out to 192.168.60.138 port 3001

# 설정 확인
sudo ufw status verbose
```

---

## 4. Nginx 설정 (프론트엔드 서버)

### 4.1 Next.js API 프록시 설정

Next.js 프론트엔드에서 백엔드 API로 요청을 프록시하는 Nginx 설정:

```bash
# Nginx 설정 파일 편집
sudo nano /etc/nginx/sites-available/default
# 또는
sudo nano /etc/nginx/nginx.conf
```

**Nginx 설정 예시:**

```nginx
server {
    listen 80;
    server_name 192.168.60.135;  # 또는 도메인 이름

    # Next.js 프론트엔드
    location / {
        proxy_pass http://localhost:3000;  # Next.js 기본 포트
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 백엔드 API 프록시
    location /api/ {
        # /api/ 경로를 백엔드로 프록시
        proxy_pass http://192.168.60.138:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # CORS 헤더
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, PATCH, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-Requested-With' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;

        # Preflight 요청 처리
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, PATCH, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-Requested-With' always;
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain charset=UTF-8';
            add_header 'Content-Length' 0;
            return 204;
        }

        # 실제 IP 전달
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**설정 적용:**

```bash
# Nginx 설정 테스트
sudo nginx -t

# Nginx 재시작
sudo systemctl restart nginx

# Nginx 상태 확인
sudo systemctl status nginx
```

### 4.2 직접 연결 방식 (프록시 미사용)

만약 프론트엔드에서 백엔드로 직접 연결하려면:

```nginx
server {
    listen 80;
    server_name 192.168.60.135;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # CORS 헤더만 추가 (백엔드 직접 호출용)
    location ~* \.(json)$ {
        add_header 'Access-Control-Allow-Origin' 'http://192.168.60.138:3001' always;
    }
}
```

---

## 5. NestJS CORS 설정 (백엔드 서버)

### 5.1 main.ts CORS 설정

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS 설정
  app.enableCors({
    origin: [
      'http://192.168.60.135',      // 프론트엔드 서버
      'http://192.168.60.135:80',
      'http://192.168.60.135:3000', // Next.js 개발 서버
      'http://localhost:3000',       // 로컬 테스트
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
  });

  // 모든 IP에서 접근 허용 (0.0.0.0)
  await app.listen(3001, '0.0.0.0');

  console.log(`Application is running on: http://192.168.60.138:3001`);
}
bootstrap();
```

### 5.2 환경변수 설정

```bash
# Rocky OS에서 .env 파일 수정
vi .env.dev
```

```env
# 기존 설정
DB_HOST=localhost
DB_PORT=3306
DB_NAME=node
DB_USERNAME=phantom
DB_PASSWORD=ehy1123?

# 추가 설정
FRONTEND_URL=http://192.168.60.135
BACKEND_URL=http://192.168.60.138:3001
PORT=3001
HOST=0.0.0.0
```

---

## 6. 연결 테스트

### 6.1 네트워크 연결 테스트

**프론트엔드 서버 (Ubuntu)에서:**

```bash
# 백엔드 서버 Ping 테스트
ping 192.168.60.138

# 백엔드 포트 연결 테스트
curl http://192.168.60.138:3001

# 또는 telnet
telnet 192.168.60.138 3001

# nc (netcat) 사용
nc -zv 192.168.60.138 3001
```

**백엔드 서버 (Rocky OS)에서:**

```bash
# 프론트엔드 서버 Ping 테스트
ping 192.168.60.135

# 백엔드 서비스가 올바른 인터페이스에서 리스닝하는지 확인
ss -tlnp | grep 3001
# 또는
netstat -tlnp | grep 3001

# 결과: 0.0.0.0:3001 또는 :::3001 이어야 함 (모든 IP에서 접근 가능)
```

### 6.2 API 연결 테스트

**프론트엔드 서버에서 백엔드 API 호출:**

```bash
# Ubuntu 서버에서
curl -X GET http://192.168.60.138:3001/api/questions

# CORS 테스트
curl -H "Origin: http://192.168.60.135" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     http://192.168.60.138:3001/api/questions -v
```

**브라우저에서 테스트:**

1. 프론트엔드 접속: `http://192.168.60.135`
2. 브라우저 개발자 도구 (F12) → Console 탭
3. API 호출 테스트:

```javascript
// 직접 호출
fetch('http://192.168.60.138:3001/api/questions')
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));

// 프록시 통과
fetch('/api/questions')
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));
```

### 6.3 방화벽 로그 확인

**Rocky OS (백엔드):**

```bash
# 방화벽 로그 확인
sudo journalctl -u firewalld -f

# 실시간 연결 모니터링
sudo tcpdump -i ens33 port 3001
```

**Ubuntu (프론트엔드):**

```bash
# UFW 로그 확인
sudo tail -f /var/log/ufw.log

# Nginx 로그 확인
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## 7. 문제 해결 (Troubleshooting)

### 7.1 연결이 안 될 때 체크리스트

1. **네트워크 연결 확인**
   ```bash
   ping 192.168.60.138  # 프론트에서 백엔드로
   ping 192.168.60.135  # 백엔드에서 프론트로
   ```

2. **방화벽 상태 확인**
   ```bash
   # Rocky OS
   sudo firewall-cmd --list-all

   # Ubuntu
   sudo ufw status verbose
   ```

3. **서비스 실행 확인**
   ```bash
   # Rocky OS - NestJS
   ss -tlnp | grep 3001

   # Ubuntu - Nginx
   sudo systemctl status nginx

   # Ubuntu - Next.js
   ps aux | grep next
   ```

4. **포트 리스닝 확인**
   ```bash
   # 백엔드가 0.0.0.0:3001에서 리스닝해야 함
   # 127.0.0.1:3001만 리스닝하면 외부 접근 불가
   sudo ss -tlnp | grep 3001
   ```

### 7.2 CORS 에러 해결

**증상:** 브라우저 콘솔에 "Access to fetch has been blocked by CORS policy"

**해결방법:**

1. NestJS main.ts의 CORS origin에 프론트엔드 주소 추가
2. Nginx에 CORS 헤더 추가
3. Preflight OPTIONS 요청 처리 확인

### 7.3 Connection Refused 에러

**증상:** `curl: (7) Failed to connect to 192.168.60.138 port 3001: Connection refused`

**해결방법:**

1. 백엔드 서비스 실행 확인: `ss -tlnp | grep 3001`
2. 방화벽 포트 열기: `sudo firewall-cmd --add-port=3001/tcp --permanent`
3. NestJS가 0.0.0.0에서 리스닝하는지 확인: `await app.listen(3001, '0.0.0.0')`

### 7.4 SELinux 문제 (Rocky OS)

**증상:** 포트는 열렸지만 여전히 연결 안 됨

```bash
# SELinux 모드 확인
getenforce

# 일시적으로 Permissive 모드로 전환 (테스트용)
sudo setenforce 0

# 연결되면 SELinux 정책 추가
sudo semanage port -a -t http_port_t -p tcp 3001

# 다시 Enforcing 모드로
sudo setenforce 1
```

---

## 8. 보안 권장사항

### 8.1 방화벽 규칙 강화

```bash
# Rocky OS - 프론트엔드에서만 접근 허용
sudo firewall-cmd --permanent --remove-port=3001/tcp
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="192.168.60.135" port protocol="tcp" port="3001" accept'
sudo firewall-cmd --reload
```

### 8.2 HTTPS 설정 (권장)

프로덕션 환경에서는 SSL/TLS 인증서 사용 권장

```bash
# Ubuntu - Let's Encrypt 인증서 (도메인이 있는 경우)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

### 8.3 Rate Limiting

```nginx
# Nginx에 Rate Limiting 추가
http {
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

    server {
        location /api/ {
            limit_req zone=api_limit burst=20 nodelay;
            proxy_pass http://192.168.60.138:3001/;
        }
    }
}
```

---

## 9. 최종 확인 사항

- [ ] VMware NAT 네트워크 설정 완료
- [ ] 프론트엔드 고정 IP 설정 (192.168.60.135)
- [ ] 백엔드 고정 IP 설정 (192.168.60.138)
- [ ] Rocky OS 방화벽 3001 포트 오픈
- [ ] Ubuntu 방화벽 80 포트 오픈
- [ ] Nginx 프록시 설정 또는 CORS 헤더 설정
- [ ] NestJS CORS 설정 (origin에 프론트 IP 추가)
- [ ] NestJS 0.0.0.0:3001에서 리스닝
- [ ] ping 연결 테스트 성공
- [ ] curl API 호출 테스트 성공
- [ ] 브라우저에서 API 호출 테스트 성공

---

## 참고 명령어 모음

```bash
# 네트워크 인터페이스 확인
ip a
nmcli device status

# 포트 리스닝 확인
ss -tlnp
netstat -tlnp

# 방화벽 상태
sudo firewall-cmd --list-all  # Rocky OS
sudo ufw status verbose        # Ubuntu

# 서비스 재시작
sudo systemctl restart nginx
sudo systemctl restart NetworkManager
sudo firewall-cmd --reload

# 로그 확인
sudo journalctl -u nginx -f
sudo tail -f /var/log/nginx/error.log
```

---

이 문서를 따라 설정하시면 프론트엔드와 백엔드가 정상적으로 통신할 수 있습니다.
문제가 발생하면 "7. 문제 해결" 섹션을 참고하세요.
