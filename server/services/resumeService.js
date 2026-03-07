const pdfParse = require('pdf-parse');
const fs = require('fs').promises;
const { getGroqService } = require('./groqService');

class ResumeService {
  /**
   * Process resume PDF: extract text and parse to structured data
   * Target: Complete in <5 seconds
   * @param {string} filePath - Path to uploaded PDF
   * @returns {Promise<Object>} Structured resume data
   */
  async processResume(filePath) {
    const startTime = Date.now();
    
    try {
      // Step 1: Validate PDF (max 3 pages)
      const validation = await this.validatePDF(filePath);
      if (!validation.valid) {
        throw new Error(validation.error);
      }
      
      // Step 2: Extract text from PDF
      const text = await this.extractTextFromPDF(filePath);
      if (!text || text.length < 100) {
        throw new Error('PDF contains insufficient text. Please upload a valid resume.');
      }
      
      // Step 3: Extract structured data using LLM (PRIMARY)
      let extractedData;
      try {
        const groq = getGroqService();
        extractedData = await groq.extractResumeData(text);
        console.log('✅ Used Groq extraction (primary method)');
      } catch (llmError) {
        console.warn('⚠️  Groq extraction failed, falling back to regex:', llmError.message);
        // Fallback to regex extraction
        extractedData = await this.extractWithRegex(text);
        console.log('✅ Used regex extraction (fallback method)');
      }
      
      // Step 4: Validate extracted data
      if (!extractedData.name) {
        throw new Error('Could not extract candidate name from resume');
      }
      
      const duration = Date.now() - startTime;
      console.log(`✅ Resume processing completed in ${duration}ms`);
      
      if (duration > 5000) {
        console.warn(`⚠️  Processing took ${duration}ms (target: <5000ms)`);
      }
      
      return {
        ...extractedData,
        raw_text: text,
        processing_time_ms: duration
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Resume processing failed after ${duration}ms:`, error.message);
      throw error;
    }
  }

  /**
   * Validate PDF file
   * @param {string} filePath - Path to PDF file
   * @returns {Promise<Object>} Validation result
   */
  async validatePDF(filePath) {
    try {
      const dataBuffer = await fs.readFile(filePath);
      
      // Check if it's a valid PDF
      if (!dataBuffer.toString('utf8', 0, 4).includes('%PDF')) {
        return { valid: false, error: 'Invalid PDF file format' };
      }
      
      // Parse PDF to check page count
      const pdfData = await pdfParse(dataBuffer);
      
      if (pdfData.numpages > 3) {
        return { 
          valid: false, 
          error: `Resume must be maximum 3 pages. Your resume has ${pdfData.numpages} pages.` 
        };
      }
      
      if (pdfData.numpages === 0) {
        return { valid: false, error: 'PDF file is empty' };
      }
      
      // Validate content looks like a resume
      const text = pdfData.text.toLowerCase();
      const resumeKeywords = [
        'experience', 'education', 'skills', 'work', 'project',
        'university', 'college', 'degree', 'job', 'position',
        'developer', 'engineer', 'manager', 'analyst', 'designer',
        'email', 'phone', 'linkedin', 'github', 'portfolio'
      ];
      
      const keywordMatches = resumeKeywords.filter(keyword => text.includes(keyword)).length;
      
      if (keywordMatches < 3) {
        return { 
          valid: false, 
          error: 'This PDF does not appear to be a resume. Please upload a valid resume with your experience, education, and skills.' 
        };
      }
      
      return { valid: true };
    } catch (error) {
      return { valid: false, error: `PDF validation failed: ${error.message}` };
    }
  }

  /**
   * Extract text from PDF
   * @param {string} filePath - Path to PDF file
   * @returns {Promise<string>} Extracted text
   */
  async extractTextFromPDF(filePath) {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const pdfData = await pdfParse(dataBuffer);
      
      // Clean and normalize text
      let text = pdfData.text;
      text = text.replace(/\s+/g, ' ').trim();
      
      return text;
    } catch (error) {
      throw new Error(`Text extraction failed: ${error.message}`);
    }
  }

  /**
   * Fallback: Extract resume data using regex patterns
   * @param {string} text - Resume text
   * @returns {Promise<Object>} Extracted data
   */
  async extractWithRegex(text) {
    const data = {
      name: null,
      email: null,
      phone: null,
      address: null,
      linkedin: null,
      github: null,
      skills: [],
      languages: [],
      education: [],
      experience: [],
      projects: [],
      about: null
    };

    // Extract email
    const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    if (emailMatch) data.email = emailMatch[0];

    // Extract phone
    const phoneMatch = text.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    if (phoneMatch) data.phone = phoneMatch[0];

    // Extract LinkedIn
    const linkedinMatch = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w-]+/i);
    if (linkedinMatch) data.linkedin = linkedinMatch[0];

    // Extract GitHub
    const githubMatch = text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[\w-]+/i);
    if (githubMatch) data.github = githubMatch[0];

    // Extract name (first line or near email)
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    for (const line of lines.slice(0, 5)) {
      if (line.length > 5 && line.length < 50 && /^[A-Z][a-z]+(\s+[A-Z][a-z]+)+$/.test(line)) {
        data.name = line;
        break;
      }
    }

    // If no name found, try to extract from email
    if (!data.name && data.email) {
      const emailName = data.email.split('@')[0].replace(/[._]/g, ' ');
      data.name = emailName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }

    // Extract skills section
    const skillsMatch = text.match(/(?:skills|technical skills)[:\s]+([\s\S]{0,500})(?=\n\n|experience|education|projects)/i);
    if (skillsMatch) {
      data.skills = skillsMatch[1]
        .split(/[,;|\n]/)
        .map(s => s.trim())
        .filter(s => s.length > 2 && s.length < 50)
        .slice(0, 20);
    }

    // Extract languages
    const langMatch = text.match(/(?:languages)[:\s]+([\s\S]{0,200})(?=\n\n|skills|experience|education)/i);
    if (langMatch) {
      data.languages = langMatch[1]
        .split(/[,;|\n]/)
        .map(l => l.trim())
        .filter(l => l.length > 2 && l.length < 30)
        .slice(0, 10);
    }

    // Extract about/summary
    const aboutMatch = text.match(/(?:summary|objective|about)[:\s]+([\s\S]{0,500})(?=\n\n|experience|education|skills)/i);
    if (aboutMatch) {
      data.about = aboutMatch[1].trim();
    }

    return data;
  }
}

// Singleton instance
let resumeService = null;

function getResumeService() {
  if (!resumeService) {
    resumeService = new ResumeService();
  }
  return resumeService;
}

module.exports = { ResumeService, getResumeService };
