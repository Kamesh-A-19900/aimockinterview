const { query } = require('../config/database');

/**
 * Cleanup script to remove all abandoned "in_progress" interviews
 * Run this once to clean up existing abandoned interviews in the database
 */
async function cleanupAbandonedInterviews() {
  try {
    console.log('🧹 Starting cleanup of abandoned interviews...');

    // Find all in_progress interviews
    const abandonedResult = await query(
      `SELECT id, user_id, started_at 
       FROM interview_sessions 
       WHERE status = 'in_progress'
       ORDER BY started_at DESC`
    );

    const abandonedCount = abandonedResult.rows.length;

    if (abandonedCount === 0) {
      console.log('✅ No abandoned interviews found. Database is clean!');
      process.exit(0);
    }

    console.log(`📊 Found ${abandonedCount} abandoned interview(s)`);

    // Delete each abandoned interview
    for (const session of abandonedResult.rows) {
      console.log(`   Deleting interview ${session.id} (user: ${session.user_id}, started: ${session.started_at})`);
      
      // Delete assessments (if any)
      await query('DELETE FROM assessments WHERE session_id = $1', [session.id]);
      
      // Delete Q&A pairs
      await query('DELETE FROM qa_pairs WHERE session_id = $1', [session.id]);
      
      // Delete session
      await query('DELETE FROM interview_sessions WHERE id = $1', [session.id]);
    }

    console.log(`✅ Successfully deleted ${abandonedCount} abandoned interview(s)`);
    console.log('🎉 Database cleanup complete!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

// Run cleanup
cleanupAbandonedInterviews();
