const { query } = require('../config/database');
const { getResumeService } = require('../services/resumeService');
const fs = require('fs').promises;

/**
 * Upload and process resume
 */
exports.uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const userId = req.user.userId;
    const filePath = req.file.path;

    console.log(`📄 Processing resume for user ${userId}`);

    // Process resume
    const resumeService = getResumeService();
    const extractedData = await resumeService.processResume(filePath);

    console.log(`✅ Resume processed successfully for user ${userId}`);

    // Store in database
    const result = await query(
      `INSERT INTO resumes (user_id, file_path, extracted_data, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id, created_at`,
      [userId, filePath, JSON.stringify(extractedData)]
    );

    console.log(`✅ Resume saved to database with ID ${result.rows[0].id}`);

    // Delete the PDF file after successful extraction (save disk space)
    try {
      await fs.unlink(filePath);
      console.log(`🗑️  Deleted PDF file: ${filePath}`);
    } catch (unlinkError) {
      console.error('⚠️  Failed to delete PDF file:', unlinkError.message);
      // Don't fail the request if file deletion fails
    }

    res.json({
      success: true,
      message: 'Resume processed successfully',
      resume: {
        id: result.rows[0].id,
        data: extractedData,
        uploadedAt: result.rows[0].created_at,
        processingTime: extractedData.processing_time_ms
      }
    });
  } catch (error) {
    console.error('❌ Resume upload error:', error);
    console.error('   Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail
    });
    
    // Clean up file if processing failed
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
        console.log('🗑️  Cleaned up uploaded file');
      } catch (unlinkError) {
        console.error('Failed to delete file:', unlinkError);
      }
    }

    // Provide more specific error messages
    if (error.code === '23503') {
      return res.status(401).json({
        success: false,
        message: 'User authentication error. Please login again.'
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process resume'
    });
  }
};

/**
 * Get resume by ID
 */
exports.getResume = async (req, res) => {
  try {
    const userId = req.user.userId;
    const resumeId = req.params.id;

    const result = await query(
      `SELECT id, file_path, extracted_data, created_at
       FROM resumes
       WHERE id = $1 AND user_id = $2`,
      [resumeId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found'
      });
    }

    const resume = result.rows[0];

    res.json({
      success: true,
      resume: {
        id: resume.id,
        data: resume.extracted_data,
        uploadedAt: resume.created_at
      }
    });
  } catch (error) {
    console.error('Get resume error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve resume'
    });
  }
};


