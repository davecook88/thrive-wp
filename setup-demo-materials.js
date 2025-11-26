#!/usr/bin/env node

/**
 * Script to create demo course materials
 * Run with: node setup-demo-materials.js
 */

const baseUrl = 'http://localhost:3000';

async function login(email, password) {
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.statusText}`);
  }

  // Get session cookie
  const cookies = response.headers.get('set-cookie');
  return cookies;
}

async function createCourse(cookies) {
  const response = await fetch(`${baseUrl}/admin/course-programs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookies
    },
    body: JSON.stringify({
      code: 'DEMO',
      title: 'Demo Course: Somatic Experiencing Fundamentals',
      description: 'Learn the foundations of somatic experiencing and body-centered therapy',
      isActive: true,
      levelIds: []
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Create course failed: ${error}`);
  }

  return await response.json();
}

async function createStep(cookies, courseProgramId, stepOrder, label, title) {
  const response = await fetch(`${baseUrl}/course-steps`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookies
    },
    body: JSON.stringify({
      courseProgramId,
      stepOrder,
      label,
      title,
      description: `Learning materials for ${title}`,
      isRequired: true
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Create step failed: ${error}`);
  }

  return await response.json();
}

async function createMaterial(cookies, courseStepId, title, type, content, order, question = null) {
  const payload = {
    courseStepId,
    title,
    description: `${type} material for learning`,
    type,
    content,
    order
  };

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
  try {
    console.log('🔐 Logging in as admin...');
    const cookies = await login('admin@thrive.com', 'thrive_test_123');

    console.log('✅ Logged in successfully');

    console.log('\n📚 Creating demo course...');
    const course = await createCourse(cookies);
    console.log(`✅ Created course: ${course.title} (ID: ${course.id})`);

    console.log('\n📝 Creating course steps...');
    const step1 = await createStep(cookies, course.id, 1, 'DEMO-1', 'Introduction to Somatic Experiencing');
    console.log(`✅ Created step: ${step1.label}`);

    const step2 = await createStep(cookies, course.id, 2, 'DEMO-2', 'Body Awareness Practices');
    console.log(`✅ Created step: ${step2.label}`);

    const step3 = await createStep(cookies, course.id, 3, 'DEMO-3', 'Trauma and the Nervous System');
    console.log(`✅ Created step: ${step3.label}`);

    console.log('\n📄 Creating materials for Step 1...');
    await createMaterial(cookies, step1.id, 'Welcome to the Course', 'rich_text',
      '<h2>Welcome to Somatic Experiencing Fundamentals</h2><p>In this course, you will learn the foundational principles of somatic experiencing and how our bodies hold and process trauma. This journey will help you develop a deeper understanding of the mind-body connection and practical tools for healing.</p><p>What you\'ll learn:</p><ul><li>The nervous system\'s role in trauma</li><li>Body awareness techniques</li><li>Pendulation and titration practices</li><li>Self-regulation skills</li></ul>',
      1);

    await createMaterial(cookies, step1.id, 'Introduction Video', 'video_embed',
      'https://www.youtube.com/watch?v=nmJDkzDMllc',
      2);

    await createMaterial(cookies, step1.id, 'Course Syllabus', 'file',
      'https://example.com/demo-syllabus.pdf',
      3);

    console.log('\n📄 Creating materials for Step 2...');
    await createMaterial(cookies, step2.id, 'Body Scan Exercise', 'rich_text',
      '<h3>Body Scan Meditation</h3><p>Find a comfortable position, either sitting or lying down. Close your eyes and begin to notice your breath. Starting with the top of your head, slowly bring awareness to each part of your body, moving downward...</p><p>Notice any sensations without judgment. Simply observe and breathe.</p>',
      1);

    await createMaterial(cookies, step2.id, 'Grounding Techniques Video', 'video_embed',
      'https://www.youtube.com/watch?v=c1Ndym-IsQg',
      2);

    await createMaterial(cookies, step2.id, 'Reflection Exercise', 'question',
      null,
      3,
      {
        questionText: 'Describe your experience with the body scan exercise. What sensations did you notice? Were there any areas of tension or ease?',
        questionType: 'long_text'
      });

    console.log('\n📄 Creating materials for Step 3...');
    await createMaterial(cookies, step3.id, 'The Window of Tolerance', 'rich_text',
      '<h3>Understanding Your Window of Tolerance</h3><p>The window of tolerance is the optimal zone of arousal in which we can function most effectively. When we are within this window, we can process information, relate to others, and manage our emotions.</p><p><strong>Hyperarousal</strong> (above the window): anxiety, panic, rage, hypervigilance</p><p><strong>Hypoarousal</strong> (below the window): numbness, depression, disconnection, collapse</p>',
      1);

    await createMaterial(cookies, step3.id, 'Polyvagal Theory Explained', 'video_embed',
      'https://www.youtube.com/watch?v=br8-qebjIgs',
      2);

    await createMaterial(cookies, step3.id, 'Knowledge Check', 'question',
      null,
      3,
      {
        questionText: 'What are the two states outside the window of tolerance?',
        questionType: 'multiple_choice',
        options: {
          option_1: { text: 'Hyperarousal and hypoarousal', correct: true },
          option_2: { text: 'Fight and flight', correct: false },
          option_3: { text: 'Anxiety and depression', correct: false },
          option_4: { text: 'Activation and shutdown', correct: false }
        }
      });

    await createMaterial(cookies, step3.id, 'Personal Reflection', 'question',
      null,
      4,
      {
        questionText: 'Think about a recent stressful situation. Can you identify if you moved outside your window of tolerance? If so, which direction (hyper or hypo)?',
        questionType: 'long_text'
      });

    console.log('\n✨ Demo materials created successfully!');
    console.log('\n📋 Summary:');
    console.log(`   Course: ${course.title}`);
    console.log(`   Steps: 3`);
    console.log(`   Total Materials: 11`);
    console.log('\n🌐 View as student at:');
    console.log(`   http://localhost:8080/course-materials/?course_id=${course.id}`);
    console.log('\n👨‍💼 View in admin at:');
    console.log(`   http://localhost:8080/wp-admin/admin.php?page=thrive-courses`);
    console.log('   Then click "Materials" on the Demo Course card');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
