// test-quiz-complete-blocking.js - Test complete quiz access blocking

const axios = require('axios');

const BASE_URL = 'http://localhost:8000/api/v1';

async function testQuizCompleteBlocking() {
  console.log('🔒 Testing Complete Quiz Access Blocking');
  console.log('=========================================');
  
  // Test with a mock token (simulating non-enrolled student)
  const mockToken = 'mock-token-for-non-enrolled-student';
  
  const quizId = '68e0d686c1db07a028329f61';
  const chapterId = '68e0cc96dedcbc1a7ca3761e';
  const courseId = '68e0c8bbb2d5d9e0814f27cf';
  
  console.log('\n1️⃣ Testing single quiz access with mock token...');
  
  try {
    const response = await axios.get(`${BASE_URL}/quizzes/${quizId}`, {
      headers: {
        'Authorization': `Bearer ${mockToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    // If we get here, it means the quiz is accessible (BAD!)
    console.log('❌ SECURITY BREACH: Non-enrolled user can access quiz!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✅ Authentication required (401)');
    } else if (error.response?.status === 403) {
      console.log('✅ Access denied (403) - Enrollment required');
    } else if (error.response?.data?.success === false && error.response.data.message === 'Access denied') {
      console.log('✅ Access blocked - Enrollment required');
      console.log('Message:', error.response.data.message);
    } else {
      console.log('⚠️  Unexpected error:', error.response?.status, error.response?.data);
    }
  }
  
  console.log('\n2️⃣ Testing chapter quizzes access...');
  
  try {
    const response = await axios.get(`${BASE_URL}/quizzes/chapter/${chapterId}`, {
      headers: {
        'Authorization': `Bearer ${mockToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('❌ SECURITY BREACH: Non-enrolled user can access chapter quizzes!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    if (error.response?.data?.success === false && error.response.data.message === 'Access denied') {
      console.log('✅ Chapter quizzes access blocked - Enrollment required');
    } else {
      console.log('⚠️  Unexpected error:', error.response?.status, error.response?.data);
    }
  }
  
  console.log('\n3️⃣ Testing course quizzes access...');
  
  try {
    const response = await axios.get(`${BASE_URL}/quizzes/course/${courseId}`, {
      headers: {
        'Authorization': `Bearer ${mockToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('❌ SECURITY BREACH: Non-enrolled user can access course quizzes!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    if (error.response?.data?.success === false && error.response.data.message === 'Access denied') {
      console.log('✅ Course quizzes access blocked - Enrollment required');
    } else {
      console.log('⚠️  Unexpected error:', error.response?.status, error.response?.data);
    }
  }
  
  console.log('\n🎉 Quiz complete blocking tests completed!');
  console.log('===========================================');
  console.log('\n📋 Expected Results:');
  console.log('✅ Non-enrolled users should get "Access denied"');
  console.log('✅ No quiz questions should be visible to non-enrolled users');
  console.log('✅ No quiz content should be accessible without enrollment');
  console.log('✅ Proper error messages should be returned');
}

testQuizCompleteBlocking().catch(console.error);
