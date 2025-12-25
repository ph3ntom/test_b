#!/usr/bin/env node

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const API_BASE = 'http://localhost:3001/api/migration';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function makeRequest(endpoint, method = 'GET') {
  const url = `${API_BASE}${endpoint}`;
  const command = method === 'GET' ? `curl -s "${url}"` : `curl -s -X ${method} "${url}"`;
  
  try {
    const { stdout } = await execAsync(command);
    return JSON.parse(stdout);
  } catch (error) {
    console.error(`❌ Request failed: ${endpoint}`, error.message);
    return { success: false, error: error.message };
  }
}

async function testMigrationSystem() {
  console.log('🚀 Starting Migration System Test\n');

  try {
    // 1. 데이터베이스 초기화 테스트
    console.log('1️⃣ Testing database initialization...');
    const initResult = await makeRequest('/init', 'POST');
    console.log(initResult.success ? '✅ Database initialized' : '❌ Database initialization failed');
    
    if (!initResult.success) {
      console.log('   Error:', initResult.error);
    }
    
    await delay(2000); // 2초 대기

    // 2. 마이그레이션 상태 확인
    console.log('\n2️⃣ Checking migration status...');
    const statusResult = await makeRequest('/migrations');
    if (statusResult.success) {
      console.log('✅ Migration status retrieved');
      console.log(`   Executed: ${statusResult.data.executed.length}`);
      console.log(`   Pending: ${statusResult.data.pending.length}`);
    } else {
      console.log('❌ Migration status check failed');
    }

    // 3. 마이그레이션 실행 테스트
    console.log('\n3️⃣ Testing migration execution...');
    const migrationTest = await makeRequest('/test', 'POST');
    if (migrationTest.success) {
      console.log('✅ Migration test completed');
      console.log(`   Total: ${migrationTest.data.summary.total}`);
      console.log(`   Executed: ${migrationTest.data.summary.executed}`);
      console.log(`   Failed: ${migrationTest.data.summary.failed}`);
      console.log(`   Skipped: ${migrationTest.data.summary.skipped}`);
    } else {
      console.log('❌ Migration test failed');
      console.log('   Error:', migrationTest.error);
    }

    await delay(1000);

    // 4. 사용자 데이터 검증
    console.log('\n4️⃣ Validating user data...');
    const validationResult = await makeRequest('/validate-users');
    if (validationResult.success) {
      console.log('✅ User data validation passed');
      console.log(`   Total Users: ${validationResult.data.totalUsers}`);
      console.log(`   Admin Users: ${validationResult.data.adminUsers}`);
      console.log(`   Regular Users: ${validationResult.data.regularUsers}`);
      console.log(`   Test Users: ${validationResult.data.testUsers.join(', ')}`);
    } else {
      console.log('❌ User data validation failed');
      if (validationResult.data && validationResult.data.errors) {
        validationResult.data.errors.forEach(error => {
          console.log(`   - ${error}`);
        });
      }
    }

    // 5. 전체 테스트 실행
    console.log('\n5️⃣ Running full database test...');
    const fullTestResult = await makeRequest('/full-test', 'POST');
    if (fullTestResult.success) {
      console.log('✅ Full database test passed');
      console.log('   All components working correctly');
    } else {
      console.log('❌ Full database test failed');
      console.log('   Error:', fullTestResult.error);
    }

    // 6. 데이터베이스 상태 최종 확인
    console.log('\n6️⃣ Final database status check...');
    const finalStatus = await makeRequest('/status');
    if (finalStatus.success) {
      console.log('✅ Database is healthy');
      console.log(`   Connected: ${finalStatus.data.database.isConnected}`);
      console.log(`   Pending Migrations: ${finalStatus.data.database.pendingMigrations}`);
      console.log(`   Last Migration: ${finalStatus.data.database.lastMigration || 'None'}`);
    } else {
      console.log('❌ Database status check failed');
    }

    console.log('\n🎉 Migration system test completed!\n');

  } catch (error) {
    console.error('\n💥 Test execution failed:', error.message);
    process.exit(1);
  }
}

// 서버가 실행 중인지 확인
async function checkServer() {
  try {
    const { stdout } = await execAsync('curl -s http://localhost:3001/api/migration/status 2>/dev/null || echo "Server not running"');
    if (stdout.includes('Server not running') || stdout.includes('Connection refused')) {
      console.log('❌ Server is not running. Please start the server first:');
      console.log('   npm run start:dev');
      process.exit(1);
    }
  } catch (error) {
    console.log('❌ Cannot connect to server. Please start the server first:');
    console.log('   npm run start:dev');
    process.exit(1);
  }
}

// 메인 실행
async function main() {
  console.log('🔍 Checking if server is running...');
  await checkServer();
  console.log('✅ Server is running\n');
  
  await testMigrationSystem();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testMigrationSystem, makeRequest };