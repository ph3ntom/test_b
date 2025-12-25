-- Add test answers for question 6
INSERT INTO answers (content, votes, accepted, question_id, user_id, createdAt, updatedAt) VALUES 
(
    '이 SignalR 문제를 해결하려면 다음 단계를 시도해보세요:\n\n1. **CORS 설정 확인**: ASP.NET Core에서 CORS가 올바르게 설정되어 있는지 확인하세요.\n2. **포트 및 URL 확인**: https://127.0.0.1:63349/downloadHub에서 서버가 실제로 실행되고 있는지 확인하세요.\n3. **WebSocket 전송 방식**: SignalR 구성에서 WebSocket을 명시적으로 활성화했는지 확인하세요.\n4. **브라우저 개발자 도구**: Network 탭에서 WebSocket 연결 상태를 확인해보세요.',
    2, 
    1, 
    6, 
    18, 
    NOW(), 
    NOW()
),
(
    'Angular v19와 SignalR를 함께 사용할 때 자주 발생하는 문제입니다. 다음 해결책을 시도해보세요:\n\n```typescript\n// hub connection 설정시 다음 옵션 추가\nconst connection = new HubConnectionBuilder()\n  .withUrl(''/downloadHub'', {\n    skipNegotiation: true,\n    transport: HttpTransportType.WebSockets\n  })\n  .build();\n```\n\n또한 서버에서 다음 설정을 확인하세요:\n- UseHttpsRedirection() 전에 SignalR 설정\n- CORS 정책에서 SignalR Hub 포함',
    1, 
    0, 
    6, 
    19, 
    NOW(), 
    NOW()
);

-- Update question 6 answer count
UPDATE questions SET answers = 2 WHERE id = 6;