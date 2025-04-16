import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt'; // Import bcrypt

const prisma = new PrismaClient();
const saltRounds = 10; // Standard salt rounds for bcrypt

async function main() {
  console.log(`Start seeding ...`);

  // --- Seed Users ---
  // Hash passwords using bcrypt
  const userPassword = 'password123'; // Example password for test user
  const adminPassword = 'password123'; // Password for admin user

  const userPasswordHash = await bcrypt.hash(userPassword, saltRounds);
  const adminPasswordHash = await bcrypt.hash(adminPassword, saltRounds);


  const user1 = await prisma.user.upsert({
    where: { email: 'testuser@example.com' },
    update: { passwordHash: userPasswordHash }, // Update hash if user exists
    create: {
      email: 'testuser@example.com',
      username: 'testuser',
      passwordHash: userPasswordHash, // Use hashed password
      role: 'user',
      usernameColor: '#818CF8', // Example color
    },
  });
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: { passwordHash: adminPasswordHash }, // Update hash if admin exists
    create: {
      email: 'admin@example.com',
      username: 'admin',
      passwordHash: adminPasswordHash, // Use hashed password
      role: 'admin',
    },
  });
  console.log(`Created users: ${user1.username}, ${adminUser.username}`);

  // --- Seed Novels ---
  const novel1 = await prisma.novel.upsert({
    where: { title: 'The Whispering Woods' },
    update: {},
    create: {
      title: 'The Whispering Woods',
      authorName: 'Eliza Thorne',
      description: 'A young adventurer gets lost in an ancient forest where the trees hold forgotten secrets and the shadows move on their own.',
      // coverImageUrl: 'url_to_image_1' // Optional
    },
  });
  const novel2 = await prisma.novel.upsert({
    where: { title: 'City of Endless Night' },
    update: {},
    create: {
      title: 'City of Endless Night',
      authorName: 'Marcus Cole',
      description: 'In a city perpetually shrouded in darkness, a detective uncovers a conspiracy that threatens to extinguish the last lights.',
      // coverImageUrl: 'url_to_image_2'
    },
  });
  const novel3 = await prisma.novel.upsert({
    where: { title: 'Chronicles of the Star Drifter' },
    update: {},
    create: {
      title: 'Chronicles of the Star Drifter',
      authorName: 'Jax Nebula',
      description: 'Traversing the cosmos in a ship held together by hope and salvaged parts, a lone pilot searches for the legendary Nexus Point.',
      // coverImageUrl: 'url_to_image_3'
    },
  });
  console.log(`Created novels: ${novel1.title}, ${novel2.title}, ${novel3.title}`);

  // --- Seed Chapters ---
  // Novel 1
  const chapter1_1 = await prisma.chapter.upsert({
    where: { novelId_chapterNumber: { novelId: novel1.id, chapterNumber: 1 } },
    update: {},
    create: { novelId: novel1.id, title: 'The Hidden Path', chapterNumber: 1 },
  });
  const chapter1_2 = await prisma.chapter.upsert({
    where: { novelId_chapterNumber: { novelId: novel1.id, chapterNumber: 2 } },
    update: {},
    create: { novelId: novel1.id, title: 'Echoes in the Mist', chapterNumber: 2 },
  });
  console.log(`Created chapters for ${novel1.title}`);

  // Novel 2 (No chapters/segments added yet)

  // Novel 3
  const chapter3_1 = await prisma.chapter.upsert({
    where: { novelId_chapterNumber: { novelId: novel3.id, chapterNumber: 1 } },
    update: {},
    create: { novelId: novel3.id, title: 'Orion\'s Belt Run', chapterNumber: 1 },
  });
  const chapter3_2 = await prisma.chapter.upsert({
    where: { novelId_chapterNumber: { novelId: novel3.id, chapterNumber: 2 } },
    update: {},
    create: { novelId: novel3.id, title: 'The Asteroid Graveyard', chapterNumber: 2 },
  });
  console.log(`Created chapters for ${novel3.title}`);


  // --- Seed Content Segments ---

  // Chapter 1_1 Segments
  const segmentsCh1_1 = [
    { segmentIndex: 1, textContent: 'The air grew heavy as Elara ventured deeper, the familiar sunlight replaced by an eerie green glow filtering through the dense canopy. Every snap of a twig echoed unnaturally loud.' },
    { segmentIndex: 2, textContent: 'She checked her compass again, the needle spinning uselessly. Panic began to set in. This wasn\'t the Sunken Grove trail anymore.' },
    { segmentIndex: 3, textContent: 'A low whisper seemed to slither through the trees, words just beyond understanding. Goosebumps prickled her arms despite the humid air.' },
    { segmentIndex: 4, textContent: '"Just the wind," she muttered, though her heart hammered against her ribs. But the wind didn\'t form near-words.' },
    { segmentIndex: 5, textContent: 'Pushing aside a curtain of thick vines, she stumbled into a small clearing. In the center stood a moss-covered stone, pulsing faintly with the same green light.' },
    { segmentIndex: 6, textContent: 'Intricate carvings covered the stone, depicting scenes she couldn\'t decipher – swirling patterns, strange creatures, and figures with too many limbs.' },
    { segmentIndex: 7, textContent: 'As her fingers brushed the cool surface, the whispering intensified, coalescing into a single, clear thought in her mind: *Turn back.*' },
    { segmentIndex: 8, textContent: 'Fear warred with curiosity. What secrets did this place hold? And why did it feel like the forest itself was watching her?' },
    { segmentIndex: 9, textContent: 'She noticed a barely visible path leading away from the stone, deeper into the woods. It wasn\'t marked on any map she knew.' },
    { segmentIndex: 10, textContent: 'Taking a deep breath, Elara ignored the warning in her head. The allure of the unknown was too strong. She stepped onto the hidden path.' },
    { segmentIndex: 11, textContent: 'The trees seemed to lean in closer here, their branches intertwining overhead, blocking out even the strange green light. Darkness enveloped her.' },
    { segmentIndex: 12, textContent: 'Strange fungi glowed with a soft, blue luminescence, casting shifting shadows that danced like specters at the edge of her vision.' },
    { segmentIndex: 13, textContent: 'The ground beneath her feet softened, becoming spongy and uneven. It felt less like soil and more like... something breathing.' },
    { segmentIndex: 14, textContent: 'A sudden rustle in the undergrowth nearby made her jump. She spun around, hand instinctively reaching for the small knife at her belt.' },
    { segmentIndex: 15, textContent: 'Nothing. Just the oppressive silence of the ancient woods, broken only by the frantic thumping of her own heart.' },
    { segmentIndex: 16, textContent: 'She pressed on, the path twisting and turning unpredictably. Time seemed to lose meaning in the perpetual twilight.' },
    { segmentIndex: 17, textContent: 'Hours might have passed, or perhaps only minutes. Her water supply was dwindling, and the initial thrill of discovery had long since faded, replaced by a gnawing unease.' },
    { segmentIndex: 18, textContent: 'The path abruptly ended at the edge of a stagnant, black pool of water. Ripples disturbed its surface, though there was no breeze.' },
    { segmentIndex: 19, textContent: 'Something large shifted beneath the murky depths. Elara took a hasty step back, her boots sinking slightly into the damp earth.' },
    { segmentIndex: 20, textContent: 'The whispering returned, louder now, swirling around her like a physical force. *It sees you. It knows you.* She had to get out.' },
  ];
  for (const segment of segmentsCh1_1) {
    await prisma.chapterContentSegment.upsert({
      where: { chapterId_segmentIndex: { chapterId: chapter1_1.id, segmentIndex: segment.segmentIndex } },
      update: { textContent: segment.textContent },
      create: { chapterId: chapter1_1.id, segmentIndex: segment.segmentIndex, textContent: segment.textContent },
    });
  }
  console.log(`Seeded segments for ${chapter1_1.title}`);

  // Chapter 1_2 Segments
  const segmentsCh1_2 = [
      { segmentIndex: 1, textContent: 'Retreating from the pool, Elara tried to retrace her steps, but the hidden path seemed to have vanished behind her. Mist began to curl around the tree trunks.' },
      { segmentIndex: 2, textContent: 'The mist was cold, unnaturally so, carrying with it the scent of damp earth and something else... something metallic, like old blood.' },
      { segmentIndex: 3, textContent: 'Shapes flickered within the swirling grey, half-seen figures that dissolved when she tried to focus on them. The whispering intensified, now coming from all directions.' },
      { segmentIndex: 4, textContent: 'Panic clawed at her throat. She broke into a run, stumbling over unseen roots, branches snagging at her clothes like grasping hands.' },
      { segmentIndex: 5, textContent: 'The forest floor gave way beneath her, and she tumbled down a short, steep incline, landing hard at the bottom.' },
      { segmentIndex: 6, textContent: 'Dazed, she looked up. The mist was thinner here, revealing ancient, crumbling ruins overgrown with vines – remnants of a forgotten civilization.' },
      { segmentIndex: 7, textContent: 'A broken archway stood nearby, leading into darkness. It felt like an invitation and a threat all at once.' },
      { segmentIndex: 8, textContent: 'She could hear something moving within the ruins, a soft, rhythmic scraping sound.' },
  ];
  for (const segment of segmentsCh1_2) {
    await prisma.chapterContentSegment.upsert({
      where: { chapterId_segmentIndex: { chapterId: chapter1_2.id, segmentIndex: segment.segmentIndex } },
      update: { textContent: segment.textContent },
      create: { chapterId: chapter1_2.id, segmentIndex: segment.segmentIndex, textContent: segment.textContent },
    });
  }
  console.log(`Seeded segments for ${chapter1_2.title}`);

  // Chapter 3_1 Segments
  const segmentsCh3_1 = [
      { segmentIndex: 1, textContent: 'The *Nomad* shuddered as Jax pushed the sublight engines past their safety limits. Red warning lights flashed across the worn console.' },
      { segmentIndex: 2, textContent: '"Easy girl," Jax murmured, patting the console. "Just a little further. We need to clear this patrol route before they scan us."' },
      { segmentIndex: 3, textContent: 'Outside the cockpit viewport, the nebulae of Orion painted the void in vibrant hues, a beautiful but dangerous stretch of space controlled by the Cygnus Combine.' },
      { segmentIndex: 4, textContent: 'A proximity alert blared. "Scanners detected," the ship\'s synthesized voice announced calmly. "Combine patrol vessel, closing fast."' },
      { segmentIndex: 5, textContent: '"Scrap!" Jax cursed, yanking the control stick hard to port, sending the *Nomad* into a tight spiral towards a dense cluster of asteroids.' },
  ];
   for (const segment of segmentsCh3_1) {
    await prisma.chapterContentSegment.upsert({
      where: { chapterId_segmentIndex: { chapterId: chapter3_1.id, segmentIndex: segment.segmentIndex } },
      update: { textContent: segment.textContent },
      create: { chapterId: chapter3_1.id, segmentIndex: segment.segmentIndex, textContent: segment.textContent },
    });
  }
  console.log(`Seeded segments for ${chapter3_1.title}`);

  // Chapter 3_2 Segments
  const segmentsCh3_2 = [
      { segmentIndex: 1, textContent: 'The asteroid field was a chaotic graveyard of rock and ice. Jax expertly weaved the *Nomad* through the debris, the Combine ship hot on his tail.' },
      { segmentIndex: 2, textContent: '"Shields at forty percent," the ship reported. An energy bolt sizzled past the viewport.' },
      { segmentIndex: 3, textContent: '"Need to lose them," Jax muttered, spotting the wreck of a massive freighter ahead. "Going dark."' },
      { segmentIndex: 4, textContent: 'He cut the main engines, diverting power to minimal life support and maneuvering thrusters, letting the *Nomad* drift silently towards the derelict ship.' },
      { segmentIndex: 5, textContent: 'The Combine patrol swept past, its searchlights cutting through the darkness, narrowly missing the *Nomad* hiding in the freighter\'s shadow.' },
  ];
   for (const segment of segmentsCh3_2) {
    await prisma.chapterContentSegment.upsert({
      where: { chapterId_segmentIndex: { chapterId: chapter3_2.id, segmentIndex: segment.segmentIndex } },
      update: { textContent: segment.textContent },
      create: { chapterId: chapter3_2.id, segmentIndex: segment.segmentIndex, textContent: segment.textContent },
    });
  }
  console.log(`Seeded segments for ${chapter3_2.title}`);


  // --- Seed Blog Posts ---
  const blogPost1 = await prisma.blogPost.upsert({
      where: { title: "Welcome to Kweezy!" },
      update: {},
      create: {
          title: "Welcome to Kweezy!",
          content: "This is the first official blog post for the Kweezy app. Stay tuned for updates on new features, upcoming novels, and community events. We're excited to have you on this reading journey!",
          authorId: adminUser.id,
          publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      }
  });
  const blogPost2 = await prisma.blogPost.upsert({
      where: { title: "Feature Update: Themes & Fonts" },
      update: {},
      create: {
          title: "Feature Update: Themes & Fonts",
          content: "We've just rolled out new themes (Dark, Light, OLED) and font size adjustments in the chapter reader! Customize your reading experience in the Settings menu or directly in the reader header.",
          authorId: adminUser.id,
          publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      }
  });
    const blogPost3 = await prisma.blogPost.upsert({
      where: { title: "New Novel Announcement!" },
      update: {},
      create: {
          title: "New Novel Announcement!",
          content: "Get ready to explore the cosmos! 'Chronicles of the Star Drifter' by Jax Nebula is coming soon to Kweezy. Prepare for thrilling space adventures and cosmic mysteries.",
          authorId: adminUser.id,
          publishedAt: new Date(), // Today
      }
  });
  console.log(`Created blog posts: ${blogPost1.title}, ${blogPost2.title}, ${blogPost3.title}`);


  console.log(`Seeding finished.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
