#!/usr/bin/env node

const baseUrl = 'http://localhost:3000';

async function login() {
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@thrive.com', password: 'thrive_test_123' })
  });

  if (!response.ok) throw new Error('Login failed');
  return response.headers.get('set-cookie');
}

async function createMaterial(cookies, courseStepId, title, type, content, order, question = null) {
  const payload = {
    courseStepId: parseInt(courseStepId),
    title,
    description: `${type} material`,
    type,
    order: parseInt(order)
  };

  // Only add content if it's not null (for question types)
  if (content !== null) {
    payload.content = content;
  }

  if (question) {
    payload.question = question;
  }

  const response = await fetch(`${baseUrl}/course-materials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookies
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Create material failed: ${error}`);
  }

  return await response.json();
}

async function main() {
  console.log('🔐 Logging in...');
  const cookies = await login();
  console.log('✅ Logged in\n');

  console.log('📄 Adding materials...');

  // Step 1 (id: 9) materials
  await createMaterial(cookies, 9, 'Welcome to the Course', 'rich_text',
    '<h2>Welcome to Somatic Experiencing Fundamentals</h2><p>In this course, you will learn the foundational principles of somatic experiencing and how our bodies hold and process trauma.</p>', 1);
  await createMaterial(cookies, 9, 'Introduction Video', 'video_embed',
    'https://www.youtube.com/watch?v=nmJDkzDMllc', 2);
  await createMaterial(cookies, 9, 'Course Syllabus', 'file',
    'https://example.com/demo-syllabus.pdf', 3);
  console.log('  ✓ Step 1: 3 materials added');

  // Step 2 (id: 10) materials
  await createMaterial(cookies, 10, 'Body Scan Exercise', 'rich_text',
    '<h3>Body Scan Meditation</h3><p>Find a comfortable position. Close your eyes and begin to notice your breath. Starting with the top of your head, slowly bring awareness to each part of your body...</p>', 1);
  await createMaterial(cookies, 10, 'Grounding Techniques Video', 'video_embed',
    'https://www.youtube.com/watch?v=c1Ndym-IsQg', 2);
  await createMaterial(cookies, 10, 'Reflection Exercise', 'question', null, 3,
    {
      questionText: 'Describe your experience with the body scan exercise. What sensations did you notice?',
      questionType: 'long_text'
    });
  console.log('  ✓ Step 2: 3 materials added');

  // Step 3 (id: 11) materials
  await createMaterial(cookies, 11, 'The Window of Tolerance', 'rich_text',
    '<h3>Understanding Your Window of Tolerance</h3><p>The window of tolerance is the optimal zone of arousal in which we can function most effectively.</p>', 1);
  await createMaterial(cookies, 11, 'Polyvagal Theory Explained', 'video_embed',
    'https://www.youtube.com/watch?v=br8-qebjIgs', 2);
  await createMaterial(cookies, 11, 'Knowledge Check', 'question', null, 3,
    {
      questionText: 'What are the two states outside the window of tolerance?',
      questionType: 'multiple_choice',
      options: {
        option_1: { text: 'Hyperarousal and hypoarousal', correct: true },
        option_2: { text: 'Fight and flight', correct: false },
        option_3: { text: 'Anxiety and depression', correct: false }
      }
    });
  console.log('  ✓ Step 3: 3 materials added\n');

  console.log('✨ All materials created successfully!\n');
  console.log('📋 Summary:');
  console.log('   Course: Demo Course: Somatic Experiencing Fundamentals');
  console.log('   Steps: 3');
  console.log('   Total Materials: 9\n');
  console.log('🌐 View as student (you\'ll need to be enrolled):');
  console.log('   http://localhost:8080/course-materials/?course_id=31\n');
  console.log('👨‍💼 View in admin:');
  console.log('   http://localhost:8080/wp-admin/admin.php?page=thrive-courses');
  console.log('   Click "Materials" on the Demo Course card\n');
}

main().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
