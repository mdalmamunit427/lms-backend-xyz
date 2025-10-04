# LMS Backend - Postman Test Data

## Base URL
```
http://localhost:8000/api/v1
```

## Authentication
You'll need to get a JWT token first. Use the login endpoint and copy the `accessToken` from the response.

---

## 1. USER AUTHENTICATION

### Register User
```http
POST /user/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "password": "password123"
}
```

### Login User
```http
POST /user/login
Content-Type: application/json

{
  "email": "john.doe@example.com",
  "password": "password123"
}
```

### Login Admin (if you have one)
```http
POST /user/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "admin123"
}
```

---

## 2. COURSES MODULE

### Create Course (Instructor/Admin only)
```http
POST /courses/create
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "title": "Complete React Development Course",
  "description": "Learn React from beginner to advanced level with real-world projects and best practices. This comprehensive course covers everything you need to know about React development.",
  "category": "Web Development",
  "price": 99.99,
  "discount": 20,
  "thumbnail": "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=1280",
  "stacks": ["React", "JavaScript", "HTML", "CSS"],
  "level": "beginner",
  "requirements": [
    "Basic knowledge of HTML and CSS",
    "Familiarity with JavaScript fundamentals",
    "Code editor (VS Code recommended)"
  ],
  "whatYouWillLearn": [
    "React fundamentals and core concepts",
    "Component lifecycle and state management",
    "React Hooks (useState, useEffect, useContext)",
    "Routing with React Router",
    "State management with Redux",
    "Testing React applications",
    "Deployment strategies"
  ]
}
```

### Create Another Course
```http
POST /courses/create
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "title": "Advanced Node.js Backend Development",
  "description": "Master Node.js backend development with Express, MongoDB, authentication, and deployment. Build scalable and secure REST APIs.",
  "category": "Backend Development",
  "price": 149.99,
  "discount": 15,
  "thumbnail": "https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=1280",
  "stacks": ["Node.js", "Express", "MongoDB", "JWT"],
  "level": "intermediate",
  "requirements": [
    "JavaScript ES6+ knowledge",
    "Basic understanding of HTTP",
    "Node.js installed on your machine"
  ],
  "whatYouWillLearn": [
    "Express.js framework and middleware",
    "MongoDB database design and queries",
    "JWT authentication and authorization",
    "API design and documentation",
    "Error handling and validation",
    "Testing with Jest",
    "Deployment with Docker"
  ]
}
```

### Get All Courses (Public)
```http
GET /courses?page=1&limit=10&category=Web Development&search=React
```

### Get Featured Courses (Public)
```http
GET /courses/featured
```

### Get Single Course (Public)
```http
GET /courses/COURSE_ID_HERE
```

### Update Course (Owner/Admin only)
```http
PUT /courses/COURSE_ID_HERE
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "title": "Complete React Development Course - Updated",
  "description": "Updated description with more details about the course content and learning outcomes.",
  "price": 89.99,
  "discount": 25,
  "status": "published"
}
```

---

## 3. CHAPTERS MODULE

### Create Chapter
```http
POST /chapters
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "title": "Introduction to React",
  "course": "COURSE_ID_HERE",
  "order": 1
}
```

### Create Chapter with Lectures (Transactional)
```http
POST /chapters/with-lectures
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "chapter": {
    "title": "React Components and JSX",
    "course": "COURSE_ID_HERE",
    "order": 2
  },
  "lectures": [
    {
      "title": "Understanding JSX",
      "videoUrl": "https://example.com/video1.mp4",
      "duration": 1200,
      "isPreview": true,
      "resources": "https://example.com/resources1.pdf"
    },
    {
      "title": "Creating Your First Component",
      "videoUrl": "https://example.com/video2.mp4",
      "duration": 1800,
      "isPreview": false,
      "resources": "https://example.com/resources2.pdf"
    },
    {
      "title": "Props and State",
      "videoUrl": "https://example.com/video3.mp4",
      "duration": 2100,
      "isPreview": true
    }
  ]
}
```

### Get Chapters by Course
```http
GET /chapters/course/COURSE_ID_HERE
Authorization: Bearer YOUR_JWT_TOKEN
```

### Get Single Chapter
```http
GET /chapters/CHAPTER_ID_HERE
Authorization: Bearer YOUR_JWT_TOKEN
```

### Update Chapter
```http
PATCH /chapters/CHAPTER_ID_HERE
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "title": "Advanced React Components",
  "order": 3
}
```

### Reorder Chapters with Lectures
```http
POST /chapters/reorder-with-lectures
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "courseId": "COURSE_ID_HERE",
  "order": [
    {
      "chapterId": "CHAPTER_ID_1",
      "order": 1,
      "lectures": [
        {
          "lectureId": "LECTURE_ID_1",
          "order": 1
        },
        {
          "lectureId": "LECTURE_ID_2",
          "order": 2
        }
      ]
    },
    {
      "chapterId": "CHAPTER_ID_2",
      "order": 2,
      "lectures": [
        {
          "lectureId": "LECTURE_ID_3",
          "order": 1
        }
      ]
    }
  ]
}
```

---

## 4. LECTURES MODULE

### Create Lecture
```http
POST /lectures
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "title": "React Hooks Deep Dive",
  "course": "COURSE_ID_HERE",
  "chapter": "CHAPTER_ID_HERE",
  "videoUrl": "https://example.com/hooks-video.mp4",
  "duration": 2400,
  "isPreview": true,
  "resources": "https://example.com/hooks-resources.pdf"
}
```

### Update Lecture
```http
PATCH /lectures/LECTURE_ID_HERE
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "title": "React Hooks Deep Dive - Updated",
  "duration": 2600,
  "isPreview": false
}
```

---

## 5. QUIZZES MODULE

### Create Quiz
```http
POST /quizes
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "title": "React Fundamentals Quiz",
  "course": "COURSE_ID_HERE",
  "chapter": "CHAPTER_ID_HERE",
  "questions": [
    {
      "question": "What is JSX?",
      "options": [
        "A JavaScript extension",
        "A templating language",
        "A preprocessor",
        "A build tool"
      ],
      "correctAnswer": 0,
      "explanation": "JSX is a JavaScript extension that allows you to write HTML-like syntax in JavaScript."
    },
    {
      "question": "Which hook is used for side effects?",
      "options": [
        "useState",
        "useEffect",
        "useContext",
        "useReducer"
      ],
      "correctAnswer": 1,
      "explanation": "useEffect is used for side effects like data fetching, subscriptions, and DOM manipulation."
    }
  ],
  "timeLimit": 600,
  "passingScore": 70
}
```

### Submit Quiz Attempt
```http
POST /quizes/QUIZ_ID_HERE/submit
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "answers": [
    {
      "questionId": "QUESTION_ID_1",
      "selectedAnswer": 0
    },
    {
      "questionId": "QUESTION_ID_2",
      "selectedAnswer": 1
    }
  ]
}
```

---

## 6. REVIEWS MODULE

### Create Review
```http
POST /reviews
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "course": "COURSE_ID_HERE",
  "rating": 5,
  "comment": "Excellent course! Very well structured and easy to follow. The instructor explains concepts clearly and provides great examples."
}
```

### Get Course Reviews
```http
GET /reviews/course/COURSE_ID_HERE?page=1&limit=10
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 7. PROGRESS MODULE

### Update Lecture Progress
```http
POST /progress/lecture/LECTURE_ID_HERE
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "progress": 100,
  "timeSpent": 2400,
  "completedAt": "2024-01-15T10:30:00Z"
}
```

---

## 8. DISCUSSIONS MODULE

### Create Discussion
```http
POST /discussions
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "lecture": "LECTURE_ID_HERE",
  "title": "Question about React Hooks",
  "content": "I'm having trouble understanding the useEffect dependency array. Can someone explain when to include variables in it?"
}
```

### Answer Discussion
```http
POST /discussions/DISCUSSION_ID_HERE/answer
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "content": "Great question! The dependency array in useEffect tells React when to re-run the effect. You should include any values from component scope that are used inside the effect."
}
```

---

## 9. ENROLLMENTS MODULE

### Enroll in Course
```http
POST /enrollment/enroll
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "courseId": "COURSE_ID_HERE",
  "paymentMethod": "card",
  "couponCode": "DISCOUNT10"
}
```

---

## 10. COUPONS MODULE

### Validate Coupon
```http
POST /coupon/validate/COUPON_ID_HERE
Content-Type: application/json

{
  "courseId": "COURSE_ID_HERE"
}
```

---

## Test Data IDs (Replace these with actual IDs from your responses)

### Course IDs (get these from course creation responses)
- `COURSE_ID_HERE` - Replace with actual course ID
- `COURSE_ID_2` - Replace with actual course ID

### Chapter IDs (get these from chapter creation responses)
- `CHAPTER_ID_HERE` - Replace with actual chapter ID
- `CHAPTER_ID_1` - Replace with actual chapter ID
- `CHAPTER_ID_2` - Replace with actual chapter ID

### Lecture IDs (get these from lecture creation responses)
- `LECTURE_ID_HERE` - Replace with actual lecture ID
- `LECTURE_ID_1` - Replace with actual lecture ID
- `LECTURE_ID_2` - Replace with actual lecture ID
- `LECTURE_ID_3` - Replace with actual lecture ID

### Quiz IDs (get these from quiz creation responses)
- `QUIZ_ID_HERE` - Replace with actual quiz ID
- `QUESTION_ID_1` - Replace with actual question ID
- `QUESTION_ID_2` - Replace with actual question ID

### Discussion IDs (get these from discussion creation responses)
- `DISCUSSION_ID_HERE` - Replace with actual discussion ID

### Coupon IDs (get these from coupon creation responses)
- `COUPON_ID_HERE` - Replace with actual coupon ID

---

## Testing Workflow

1. **Start with Authentication**: Register/login to get JWT token
2. **Create Course**: Use the course creation endpoint
3. **Create Chapters**: Add chapters to your course
4. **Create Lectures**: Add lectures to chapters
5. **Create Quizzes**: Add quizzes to chapters
6. **Test Reviews**: Create reviews for courses
7. **Test Progress**: Update lecture progress
8. **Test Discussions**: Create discussions and answers
9. **Test Enrollments**: Enroll in courses

## Error Testing

Test these scenarios to verify error handling:
- Invalid JWT tokens
- Missing required fields
- Invalid ObjectId formats
- Unauthorized access attempts
- Duplicate resource creation
- Invalid enum values

## Notes

- Replace `YOUR_JWT_TOKEN` with the actual token from login response
- Replace placeholder IDs with actual IDs from creation responses
- Test with both valid and invalid data to verify validation
- Use different user roles (admin, instructor, student) for comprehensive testing
- Test pagination with different page and limit values
