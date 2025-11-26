#!/usr/bin/env node

const baseUrl = 'http://localhost:3000';
const step1Id = 9;
const step2Id = 10;
const step3Id = 11;

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
    description: `${type} learning material`,
    type,
    order: parseInt(order)
  };

  if (content !== null && content !== undefined) {
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
    console.error(`Failed to create "${title}":`, error);
    throw new Error(`Create material failed`);
  }

  return await response.json();
}

async function main() {
  console.log('🔐 Logging in...');
  const cookies = await login();
  console.log('✅ Logged in\n');

  console.log('📄 Adding materials to Step 1: Introduction to Somatic Experiencing...');

  await createMaterial(cookies, step1Id, 'Welcome to the Course', 'rich_text',
    '<h2>Welcome to Somatic Experiencing Fundamentals</h2><p>In this course, you will learn the foundational principles of somatic experiencing and how our bodies hold and process trauma. This journey will help you develop a deeper understanding of the mind-body connection and practical tools for healing.</p><p><strong>What you will learn:</strong></p><ul><li>The nervous system\'s role in trauma</li><li>Body awareness techniques</li><li>Pendulation and titration practices</li><li>Self-regulation skills</li></ul>',
    1);

  await createMaterial(cookies, step1Id, 'Introduction Video', 'video_embed',
    'https://www.youtube.com/watch?v=nmJDkzDMllc',
    2);

  await createMaterial(cookies, step1Id, 'Course Syllabus (PDF)', 'file',
    'https://example.com/demo-syllabus.pdf',
    3);

  console.log('  ✓ 3 materials added\n');

  console.log('📄 Adding materials to Step 2: Body Awareness Practices...');

  await createMaterial(cookies, step2Id, 'Body Scan Exercise', 'rich_text',
    '<h3>Body Scan Meditation</h3><p>Find a comfortable position, either sitting or lying down. Close your eyes and begin to notice your breath. Starting with the top of your head, slowly bring awareness to each part of your body, moving downward...</p><p>As you scan each area, simply notice any sensations without judgment. You might feel warmth, coolness, tension, ease, tingling, or nothing at all. All experiences are valid.</p><p>Take your time, spending about 30 seconds on each major body area. If your mind wanders, gently bring it back to the body part you\'re focusing on.</p>',
    1);

  await createMaterial(cookies, step2Id, 'Grounding Techniques Video', 'video_embed',
    'https://www.youtube.com/watch?v=c1Ndym-IsQg',
    2);

  await createMaterial(cookies, step2Id, 'Reflection: Your Body Scan Experience', 'question',
    undefined,
    3,
    {
      questionText: 'Describe your experience with the body scan exercise. What sensations did you notice? Were there any areas of tension or ease? How did you feel before and after the practice?',
      questionType: 'long_text'
    });

  console.log('  ✓ 3 materials added\n');

  console.log('📄 Adding materials to Step 3: Trauma and the Nervous System...');

  await createMaterial(cookies, step3Id, 'The Window of Tolerance', 'rich_text',
    '<h3>Understanding Your Window of Tolerance</h3><p>The window of tolerance is the optimal zone of arousal in which we can function most effectively. When we are within this window, we can process information, relate to others, and manage our emotions with relative ease.</p><p><strong>Hyperarousal</strong> (above the window):</p><ul><li>Anxiety and panic</li><li>Rage and irritability</li><li>Hypervigilance</li><li>Racing thoughts</li></ul><p><strong>Hypoarousal</strong> (below the window):</p><ul><li>Numbness</li><li>Depression</li><li>Disconnection</li><li>Shutdown/collapse</li></ul><p>Learning to recognize when you\'re outside your window and developing skills to return to it is a core aspect of trauma healing.</p>',
    1);

  await createMaterial(cookies, step3Id, 'Polyvagal Theory Explained', 'video_embed',
    'https://www.youtube.com/watch?v=br8-qebjIgs',
    2);

  await createMaterial(cookies, step3Id, 'Knowledge Check: Window of Tolerance', 'question',
    undefined,
    3,
    {
      questionText: 'What are the two states outside the window of tolerance called?',
      questionType: 'multiple_choice',
      options: {
        option_1: { text: 'Hyperarousal and hypoarousal', correct: true },
        option_2: { text: 'Fight and flight', correct: false },
        option_3: { text: 'Anxiety and depression', correct: false },
        option_4: { text: 'Activation and shutdown', correct: false }
      }
    });

  await createMaterial(cookies, step3Id, 'Personal Reflection', 'question',
    undefined,
    4,
    {
      questionText: 'Think about a recent stressful situation. Can you identify if you moved outside your window of tolerance? If so, which direction (hyperarousal or hypoarousal)? What sensations or thoughts did you notice?',
      questionType: 'long_text'
    });

  console.log('  ✓ 4 materials added\n');

  console.log('✨ All materials created successfully!\n');
  console.log('📋 Summary:');
  console.log('   Course: Demo Course: Somatic Experiencing Fundamentals');
  console.log('   Step 1: 3 materials');
  console.log('   Step 2: 3 materials');
  console.log('   Step 3: 4 materials');
  console.log('   Total: 10 materials\n');
  console.log('👨‍💼 View in admin at:');
  console.log('   http://localhost:8080/wp-admin/admin.php?page=thrive-courses');
  console.log('   Click "Materials" button on the Demo Course card\n');
  console.log('🌐 Student view URL (requires enrollment):');
  console.log('   http://localhost:8080/course-materials/?course_id=31\n');
}

main().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
